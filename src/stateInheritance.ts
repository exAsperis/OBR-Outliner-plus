import type { Item } from "@owlbear-rodeo/sdk";
import type { InheritedItemState, VirtualLayerState } from "./virtualLayers";

// Kept literal so this pure module can run in Node's stripped-TypeScript test mode.
const ITEM_INHERITANCE_METADATA_KEY = "com.ex-asperis.outliner/stateInheritance";
const VIRTUAL_LAYER_METADATA_KEY = "com.ex-asperis.outliner/virtualLayer";
const UNASSIGNED_ID = "__unassigned__";

export type StatefulProperty = "disableHit" | "locked" | "visible";
export type InheritanceVisualState = "disabled" | "enabled" | "blocked-item" | "blocked-virtual-layer";
export const EMPTY_INHERITED_STATE: InheritedItemState = { disableHit: false, locked: false, visible: true };

export function itemState(item: Pick<Item, "disableHit" | "locked" | "visible">): InheritedItemState {
  return { disableHit: item.disableHit === true, locked: item.locked, visible: item.visible };
}

export function parseItemInheritance(value: unknown): InheritedItemState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<InheritedItemState>;
  return typeof candidate.disableHit === "boolean" && typeof candidate.locked === "boolean" &&
    typeof candidate.visible === "boolean" ? {
      disableHit: candidate.disableHit,
      locked: candidate.locked,
      visible: candidate.visible,
    } : undefined;
}

export function getItemRule(item: Pick<Item, "metadata">) {
  return parseItemInheritance(item.metadata[ITEM_INHERITANCE_METADATA_KEY]);
}

export function getNativeRule(state: VirtualLayerState, layer: Item["layer"]) {
  return state.inheritance?.native?.[layer];
}

export function getGroupRule(state: VirtualLayerState, layer: Item["layer"], groupId: string) {
  return groupId === UNASSIGNED_ID ? state.inheritance?.unassigned?.[layer] : state.inheritance?.virtual?.[groupId];
}

function resolveItemGroup(item: Pick<Item, "layer" | "metadata">, state: VirtualLayerState) {
  const value = item.metadata[VIRTUAL_LAYER_METADATA_KEY];
  const id = value && typeof value === "object" && typeof (value as { virtualLayerId?: unknown }).virtualLayerId === "string"
    ? (value as { virtualLayerId: string }).virtualLayerId : undefined;
  const definition = id ? state.layers.find((entry) => entry.id === id) : undefined;
  return definition?.obrLayer === item.layer ? definition.id : UNASSIGNED_ID;
}

export function getItemParentRule(item: Pick<Item, "layer" | "metadata" | "id" | "zIndex">, state: VirtualLayerState) {
  return getGroupRule(state, item.layer, resolveItemGroup(item, state)) ?? getNativeRule(state, item.layer);
}

export function getEffectiveItemRule(item: Pick<Item, "layer" | "metadata" | "id" | "zIndex">, state: VirtualLayerState) {
  return getItemRule(item) ?? getItemParentRule(item, state);
}

export function calculateInheritanceUpdates(items: Item[], state: VirtualLayerState) {
  const updates = new Map<string, InheritedItemState>();
  for (const item of items) {
    const rule = getEffectiveItemRule(item, state);
    if (rule && ((item.disableHit === true) !== rule.disableHit || item.locked !== rule.locked || item.visible !== rule.visible)) updates.set(item.id, rule);
  }
  return updates;
}

export function statesEqual(a: InheritedItemState | undefined, b: InheritedItemState | undefined) {
  return Boolean(a && b && a.disableHit === b.disableHit && a.locked === b.locked && a.visible === b.visible);
}

export function inheritanceLabel(local: boolean, parent: boolean) {
  if (local) return parent ? "Remove override" : "Disable inheritance";
  return parent ? "Override inherited state" : "Enable inheritance";
}

export function itemInheritanceLabel(local: boolean, parent: boolean) {
  if (!parent) return local ? "Allow inheritance" : "Block inheritance";
  return inheritanceLabel(local, parent);
}

export function inheritanceVisualState(level: "native" | "virtual" | "item", local: boolean, parent: boolean): InheritanceVisualState {
  if (local) {
    if (level === "item") return "blocked-item";
    if (level === "virtual") return "blocked-virtual-layer";
    return "enabled";
  }
  return parent ? "enabled" : "disabled";
}

export function captureAggregateState(items: Array<Pick<Item, "disableHit" | "locked" | "visible">>): InheritedItemState {
  if (!items.length) return EMPTY_INHERITED_STATE;
  return {
    disableHit: items.every((item) => item.disableHit === true),
    locked: items.every((item) => item.locked),
    visible: items.every((item) => item.visible),
  };
}
