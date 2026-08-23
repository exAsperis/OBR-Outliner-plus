import type { Item } from "@owlbear-rodeo/sdk";
import type { StackOperation } from "./stacking";
const VIRTUAL_LAYERS_METADATA_KEY = "com.ex-asperis.outliner/virtualLayers";
const VIRTUAL_LAYER_METADATA_KEY = "com.ex-asperis.outliner/virtualLayer";

export interface VirtualLayerDefinition {
  id: string;
  name: string;
  obrLayer: Item["layer"];
  order: number;
}

export interface VirtualLayerState {
  version: 1;
  layers: VirtualLayerDefinition[];
  unassignedOrders?: Partial<Record<Item["layer"], number>>;
}

export type VirtualLayerItem = Pick<Item, "id" | "layer" | "zIndex" | "metadata">;
export const UNASSIGNED_ID = "__unassigned__";
export const EMPTY_VIRTUAL_LAYER_STATE: VirtualLayerState = { version: 1, layers: [] };

const isLayer = (value: unknown): value is Item["layer"] =>
  typeof value === "string" && [
    "MAP", "GRID", "DRAWING", "PROP", "MOUNT", "CHARACTER", "ATTACHMENT",
    "NOTE", "TEXT", "RULER", "FOG", "POINTER", "CONTROL", "POPOVER",
  ].includes(value);

export function parseVirtualLayerState(value: unknown): VirtualLayerState {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1 ||
      !Array.isArray((value as { layers?: unknown }).layers)) return EMPTY_VIRTUAL_LAYER_STATE;
  const layers = (value as { layers: unknown[] }).layers.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<VirtualLayerDefinition>;
    if (typeof candidate.id !== "string" || !candidate.id || typeof candidate.name !== "string" ||
        !candidate.name.trim() || !isLayer(candidate.obrLayer) ||
        typeof candidate.order !== "number" || !Number.isFinite(candidate.order)) return [];
    return [{ id: candidate.id, name: candidate.name.trim(), obrLayer: candidate.obrLayer, order: candidate.order }];
  });
  const rawOrders = (value as { unassignedOrders?: unknown }).unassignedOrders;
  const unassignedOrders: Partial<Record<Item["layer"], number>> = {};
  if (rawOrders && typeof rawOrders === "object") {
    for (const [layer, order] of Object.entries(rawOrders)) {
      if (isLayer(layer) && typeof order === "number" && Number.isFinite(order)) unassignedOrders[layer] = order;
    }
  }
  return { version: 1, layers, ...(Object.keys(unassignedOrders).length ? { unassignedOrders } : {}) };
}

export function stateFromMetadata(metadata: Record<string, unknown>) {
  return parseVirtualLayerState(metadata[VIRTUAL_LAYERS_METADATA_KEY]);
}

const normalizedName = (name: string) => name.trim().toLocaleLowerCase();

function validateName(state: VirtualLayerState, name: string, exceptId?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Virtual layer name cannot be empty.");
  if (state.layers.some((layer) => layer.id !== exceptId && normalizedName(layer.name) === normalizedName(trimmed))) {
    throw new Error("Virtual layer names must be unique within the scene.");
  }
  return trimmed;
}

function orderedForLayer(state: VirtualLayerState, obrLayer: Item["layer"]) {
  return state.layers.filter((entry) => entry.obrLayer === obrLayer)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function orderedGroupIds(state: VirtualLayerState, obrLayer: Item["layer"]) {
  const definitions = orderedForLayer(state, obrLayer);
  const unassignedOrder = state.unassignedOrders?.[obrLayer] ?? definitions.length;
  return [...definitions.map((entry) => ({ id: entry.id, order: entry.order, unassigned: false })),
    { id: UNASSIGNED_ID, order: unassignedOrder, unassigned: true }]
    .sort((a, b) => a.order - b.order || Number(a.unassigned) - Number(b.unassigned) || a.id.localeCompare(b.id))
    .map((entry) => entry.id);
}

function applyGroupOrder(state: VirtualLayerState, obrLayer: Item["layer"], groupIds: string[]): VirtualLayerState {
  const orders = new Map(groupIds.map((id, order) => [id, order]));
  return {
    version: 1,
    layers: state.layers.map((entry) => entry.obrLayer === obrLayer ? { ...entry, order: orders.get(entry.id) ?? entry.order } : entry),
    unassignedOrders: { ...state.unassignedOrders, [obrLayer]: orders.get(UNASSIGNED_ID) ?? groupIds.length - 1 },
  };
}

export function createVirtualLayer(state: VirtualLayerState, obrLayer: Item["layer"], name: string, id: string): VirtualLayerState {
  const layer: VirtualLayerDefinition = { id, name: validateName(state, name), obrLayer, order: orderedForLayer(state, obrLayer).length };
  const next = { ...state, layers: [...state.layers, layer] };
  const groups = orderedGroupIds(next, obrLayer).filter((groupId) => groupId !== id);
  const unassignedIndex = groups.indexOf(UNASSIGNED_ID);
  groups.splice(unassignedIndex < 0 ? groups.length : unassignedIndex, 0, id);
  return applyGroupOrder(next, obrLayer, groups);
}

export function renameVirtualLayer(state: VirtualLayerState, id: string, name: string): VirtualLayerState {
  if (!state.layers.some((entry) => entry.id === id)) throw new Error("Virtual layer does not exist.");
  const validName = validateName(state, name, id);
  return { version: 1, layers: state.layers.map((entry) => entry.id === id ? { ...entry, name: validName } : entry) };
}

export function deleteVirtualLayer(state: VirtualLayerState, id: string): VirtualLayerState {
  const target = state.layers.find((entry) => entry.id === id);
  if (!target) return state;
  const next = { ...state, layers: state.layers.filter((entry) => entry.id !== id) };
  return applyGroupOrder(next, target.obrLayer, orderedGroupIds(state, target.obrLayer).filter((groupId) => groupId !== id));
}

export function reorderVirtualLayer(state: VirtualLayerState, id: string, targetIndex: number): VirtualLayerState {
  const target = state.layers.find((entry) => entry.id === id);
  if (!target) throw new Error("Virtual layer does not exist.");
  return reorderStackingGroup(state, target.obrLayer, id, targetIndex);
}

export function reorderStackingGroup(state: VirtualLayerState, obrLayer: Item["layer"], id: string, targetIndex: number): VirtualLayerState {
  const groups = orderedGroupIds(state, obrLayer);
  if (!groups.includes(id)) throw new Error("Stacking group does not exist in this native layer.");
  const reordered = groups.filter((groupId) => groupId !== id);
  reordered.splice(Math.max(0, Math.min(targetIndex, reordered.length)), 0, id);
  return applyGroupOrder(state, obrLayer, reordered);
}

export function stackGroup(state: VirtualLayerState, obrLayer: Item["layer"], id: string, operation: StackOperation): VirtualLayerState {
  const groups = orderedGroupIds(state, obrLayer);
  const currentIndex = groups.indexOf(id);
  if (currentIndex < 0) throw new Error("Stacking group does not exist in this native layer.");
  const targetIndex = operation === "front"
    ? 0
    : operation === "back"
      ? groups.length - 1
      : operation === "forward"
        ? Math.max(0, currentIndex - 1)
        : Math.min(groups.length - 1, currentIndex + 1);
  return targetIndex === currentIndex ? state : reorderStackingGroup(state, obrLayer, id, targetIndex);
}

export function getAssignmentId(item: VirtualLayerItem): string | undefined {
  const value = item.metadata[VIRTUAL_LAYER_METADATA_KEY];
  if (!value || typeof value !== "object") return undefined;
  const id = (value as { virtualLayerId?: unknown }).virtualLayerId;
  return typeof id === "string" ? id : undefined;
}

export function resolveGroupId(item: VirtualLayerItem, state: VirtualLayerState): string {
  const id = getAssignmentId(item);
  const definition = id ? state.layers.find((entry) => entry.id === id) : undefined;
  return definition?.obrLayer === item.layer ? definition.id : UNASSIGNED_ID;
}

export interface AssignmentUpdate {
  layer: Item["layer"];
  virtualLayerId?: string;
}

export function calculateAssignmentUpdates(
  items: VirtualLayerItem[],
  state: VirtualLayerState,
  itemIds: Iterable<string>,
  destinationLayer: Item["layer"],
  virtualLayerId?: string
) {
  const selected = new Set(itemIds);
  const definition = virtualLayerId ? state.layers.find((entry) => entry.id === virtualLayerId) : undefined;
  if (virtualLayerId && !definition) throw new Error("Virtual layer does not exist.");
  if (definition && definition.obrLayer !== destinationLayer) throw new Error("Virtual layer belongs to a different native layer.");
  return new Map(items.filter((item) => selected.has(item.id)).map((item) => [item.id, {
    layer: destinationLayer,
    virtualLayerId: definition?.id,
  }]));
}

export function groupsForLayer(items: VirtualLayerItem[], state: VirtualLayerState, obrLayer: Item["layer"]) {
  const groupIds = orderedGroupIds(state, obrLayer);
  return groupIds.map((id) => ({
    id,
    items: items.filter((item) => item.layer === obrLayer && resolveGroupId(item, state) === id)
      .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)),
  }));
}

export function desiredOrder(items: VirtualLayerItem[], state: VirtualLayerState, obrLayer: Item["layer"]) {
  return groupsForLayer(items, state, obrLayer).reverse().flatMap((group) => group.items);
}

export function calculateNormalizationUpdates(items: VirtualLayerItem[], state: VirtualLayerState, obrLayer: Item["layer"]) {
  const updates = new Map<string, number>();
  desiredOrder(items, state, obrLayer).forEach((item, index) => {
    if (item.zIndex !== index) updates.set(item.id, index);
  });
  return updates;
}

export function hasBoundaryViolation(items: VirtualLayerItem[], state: VirtualLayerState, obrLayer: Item["layer"]) {
  const current = items.filter((item) => item.layer === obrLayer)
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)).map((item) => resolveGroupId(item, state));
  const desired = desiredOrder(items, state, obrLayer).map((item) => resolveGroupId(item, state));
  return current.some((id, index) => id !== desired[index]);
}

function reorder(items: VirtualLayerItem[], selected: Set<string>, operation: StackOperation) {
  const picked = items.filter((item) => selected.has(item.id));
  const rest = items.filter((item) => !selected.has(item.id));
  if (operation === "front") return [...rest, ...picked];
  if (operation === "back") return [...picked, ...rest];
  const result = [...items];
  if (operation === "forward") {
    for (let i = result.length - 2; i >= 0; i--) if (selected.has(result[i].id) && !selected.has(result[i + 1].id)) [result[i], result[i + 1]] = [result[i + 1], result[i]];
  } else {
    for (let i = 1; i < result.length; i++) if (selected.has(result[i].id) && !selected.has(result[i - 1].id)) [result[i], result[i - 1]] = [result[i - 1], result[i]];
  }
  return result;
}

export function calculateVirtualStackingUpdates(items: VirtualLayerItem[], state: VirtualLayerState, targetIds: Iterable<string>, operation: StackOperation) {
  const selected = new Set(targetIds);
  const updates = new Map<string, number>();
  const nativeLayers = new Set(items.filter((item) => selected.has(item.id)).map((item) => item.layer));
  for (const nativeLayer of nativeLayers) {
    const groups = groupsForLayer(items, state, nativeLayer).reverse();
    const order = groups.flatMap((group) => reorder(group.items, selected, operation));
    let index = 0;
    while (index < order.length) {
      if (!selected.has(order[index].id)) { index++; continue; }
      const start = index;
      while (index < order.length && selected.has(order[index].id)) index++;
      const lower = start > 0 ? order[start - 1].zIndex : undefined;
      const upper = index < order.length ? order[index].zIndex : undefined;
      const count = index - start;
      const values = lower === undefined && upper === undefined
        ? Array.from({ length: count }, (_, offset) => offset)
        : lower === undefined
          ? Array.from({ length: count }, (_, offset) => (upper as number) - count + offset)
          : upper === undefined
            ? Array.from({ length: count }, (_, offset) => lower + offset + 1)
            : Array.from({ length: count }, (_, offset) => lower + ((upper - lower) * (offset + 1)) / (count + 1));
      values.forEach((value, offset) => { const item = order[start + offset]; if (item.zIndex !== value) updates.set(item.id, value); });
    }
  }
  return updates;
}
