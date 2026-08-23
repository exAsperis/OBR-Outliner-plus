import OBR, { type Item } from "@owlbear-rodeo/sdk";
import {
  ITEM_INHERITANCE_METADATA_KEY,
  VIRTUAL_LAYER_METADATA_KEY,
  VIRTUAL_LAYERS_METADATA_KEY,
} from "./constants";
import type { StackOperation } from "./stacking";
import { calculateStackingUpdates } from "./stacking";
import {
  calculateNormalizationUpdates,
  calculateAssignmentUpdates,
  calculateVirtualStackingUpdates,
  createVirtualLayer,
  deleteVirtualLayer,
  getAssignmentId,
  parseVirtualLayerState,
  renameVirtualLayer,
  reorderVirtualLayer,
  reorderStackingGroup,
  stackGroup,
  stateFromMetadata,
  type VirtualLayerState,
} from "./virtualLayers";
import {
  calculateInheritanceUpdates,
  getGroupRule,
  getItemParentRule,
  getItemRule,
  getNativeRule,
  itemState,
  type StatefulProperty,
} from "./stateInheritance";
import type { InheritedItemState } from "./virtualLayers";

let queue: Promise<void> = Promise.resolve();
let writing = false;
export const isVirtualLayerWriteInFlight = () => writing;

function serialized(work: () => Promise<void>) {
  queue = queue.then(async () => {
    writing = true;
    try { await work(); } finally { writing = false; }
  }, async () => {
    writing = true;
    try { await work(); } finally { writing = false; }
  });
  return queue;
}

async function getState() {
  return stateFromMetadata(await OBR.scene.getMetadata());
}

async function setState(state: VirtualLayerState) {
  await OBR.scene.setMetadata({ [VIRTUAL_LAYERS_METADATA_KEY]: state });
}

async function normalizeLayers(layers: Iterable<Item["layer"]>, state?: VirtualLayerState) {
  const currentState = state ?? await getState();
  const items = await OBR.scene.items.getItems();
  const updates = new Map<string, number>();
  for (const layer of new Set(layers)) {
    if (!currentState.layers.some((entry) => entry.obrLayer === layer)) continue;
    for (const [id, zIndex] of calculateNormalizationUpdates(items, currentState, layer)) updates.set(id, zIndex);
  }
  if (updates.size) await OBR.scene.items.updateItems([...updates.keys()], (draft) => {
    for (const item of draft) item.zIndex = updates.get(item.id) ?? item.zIndex;
  });
}

export function addVirtualLayer(obrLayer: Item["layer"], name: string) {
  return serialized(async () => {
    const state = await getState();
    const next = createVirtualLayer(state, obrLayer, name, `vl_${crypto.randomUUID()}`);
    await setState(next);
    await normalizeLayers([obrLayer], next);
  });
}

export function updateVirtualLayerName(id: string, name: string) {
  return serialized(async () => setState(renameVirtualLayer(await getState(), id, name)));
}

export function moveVirtualLayer(id: string, targetIndex: number) {
  return serialized(async () => {
    const state = await getState();
    const target = state.layers.find((entry) => entry.id === id);
    if (!target) return;
    const next = reorderVirtualLayer(state, id, targetIndex);
    await setState(next);
    await normalizeLayers([target.obrLayer], next);
  });
}

export function moveStackingGroup(obrLayer: Item["layer"], id: string, targetIndex: number) {
  return serialized(async () => {
    const state = await getState();
    const next = reorderStackingGroup(state, obrLayer, id, targetIndex);
    await setState(next);
    await normalizeLayers([obrLayer], next);
  });
}

export async function enforceStateInheritance(state?: VirtualLayerState) {
  const currentState = state ?? await getState();
  const items = await OBR.scene.items.getItems();
  const updates = calculateInheritanceUpdates(items, currentState);
  if (updates.size) await OBR.scene.items.updateItems([...updates.keys()], (draft) => {
    for (const item of draft) {
      const rule = updates.get(item.id);
      if (!rule) continue;
      item.disableHit = rule.disableHit;
      item.locked = rule.locked;
      item.visible = rule.visible;
    }
  });
}

export type RuleScope = { kind: "native"; layer: Item["layer"] } | { kind: "group"; layer: Item["layer"]; groupId: string };

function localRule(state: VirtualLayerState, scope: RuleScope) {
  return scope.kind === "native" ? getNativeRule(state, scope.layer) : getGroupRule(state, scope.layer, scope.groupId);
}

function parentRule(state: VirtualLayerState, scope: RuleScope) {
  return scope.kind === "group" ? getNativeRule(state, scope.layer) : undefined;
}

function withRule(state: VirtualLayerState, scope: RuleScope, rule?: InheritedItemState): VirtualLayerState {
  const inheritance = { ...state.inheritance };
  if (scope.kind === "native") {
    const native = { ...inheritance.native };
    if (rule) native[scope.layer] = rule; else delete native[scope.layer];
    if (Object.keys(native).length) inheritance.native = native; else delete inheritance.native;
  } else if (scope.groupId === "__unassigned__") {
    const unassigned = { ...inheritance.unassigned };
    if (rule) unassigned[scope.layer] = rule; else delete unassigned[scope.layer];
    if (Object.keys(unassigned).length) inheritance.unassigned = unassigned; else delete inheritance.unassigned;
  } else {
    const virtual = { ...inheritance.virtual };
    if (rule) virtual[scope.groupId] = rule; else delete virtual[scope.groupId];
    if (Object.keys(virtual).length) inheritance.virtual = virtual; else delete inheritance.virtual;
  }
  return { ...state, inheritance: inheritance.native || inheritance.virtual || inheritance.unassigned ? inheritance : undefined };
}

export function toggleScopeInheritance(scope: RuleScope, fallback: InheritedItemState) {
  return serialized(async () => {
    const state = await getState();
    const next = withRule(state, scope, localRule(state, scope) ? undefined : parentRule(state, scope) ?? fallback);
    await setState(next);
    await enforceStateInheritance(next);
  });
}

export function setScopeInheritedProperty(scope: RuleScope, property: StatefulProperty, value: boolean) {
  return serialized(async () => {
    const state = await getState();
    const current = localRule(state, scope);
    if (!current) return;
    const next = withRule(state, scope, { ...current, [property]: value });
    await setState(next);
    await enforceStateInheritance(next);
  });
}

export function toggleItemInheritance(item: Item) {
  return serialized(async () => {
    const state = await getState();
    const local = getItemRule(item);
    const parent = getItemParentRule(item, state);
    const next = parent ?? itemState(item);
    await OBR.scene.items.updateItems([item.id], (draft) => {
      const target = draft[0];
      if (local) delete target.metadata[ITEM_INHERITANCE_METADATA_KEY];
      else target.metadata[ITEM_INHERITANCE_METADATA_KEY] = next;
      if (local && !parent) return;
      target.disableHit = next.disableHit;
      target.locked = next.locked;
      target.visible = next.visible;
    });
  });
}

export function setItemInheritedProperty(item: Item, property: StatefulProperty, value: boolean) {
  return serialized(async () => {
    const local = getItemRule(item);
    if (!local) return;
    const next = { ...local, [property]: value };
    await OBR.scene.items.updateItems([item.id], (draft) => {
      draft[0].metadata[ITEM_INHERITANCE_METADATA_KEY] = next;
      draft[0][property] = value;
    });
  });
}

export function stackVirtualLayer(obrLayer: Item["layer"], id: string, operation: StackOperation) {
  return serialized(async () => {
    const state = await getState();
    const next = stackGroup(state, obrLayer, id, operation);
    if (next === state) return;
    await setState(next);
    await normalizeLayers([obrLayer], next);
  });
}

export function removeVirtualLayer(id: string) {
  return serialized(async () => {
    const state = await getState();
    const target = state.layers.find((entry) => entry.id === id);
    if (!target) return;
    const next = deleteVirtualLayer(state, id);
    await setState(next);
    const items = await OBR.scene.items.getItems();
    const affected = items.filter((item) => getAssignmentId(item) === id).map((item) => item.id);
    if (affected.length) await OBR.scene.items.updateItems(affected, (draft) => {
      for (const item of draft) delete item.metadata[VIRTUAL_LAYER_METADATA_KEY];
    });
    await normalizeLayers([target.obrLayer], next);
  });
}

export function assignItems(itemIds: string[], virtualLayerId?: string, nativeLayer?: Item["layer"], targetId?: string, position: "before" | "after" = "before") {
  return serialized(async () => {
    const state = await getState();
    const allItems = await OBR.scene.items.getItems();
    const targets = allItems.filter((item) => itemIds.includes(item.id));
    const definition = virtualLayerId ? state.layers.find((entry) => entry.id === virtualLayerId) : undefined;
    if (virtualLayerId && !definition) throw new Error("Virtual layer does not exist.");
    const destination = definition?.obrLayer ?? nativeLayer ?? targets[0]?.layer;
    if (!destination) return;
    const affectedLayers = new Set<Item["layer"]>(targets.map((item) => item.layer));
    affectedLayers.add(destination);
    const assignmentUpdates = calculateAssignmentUpdates(allItems, state, itemIds, destination, definition?.id);
    await OBR.scene.items.updateItems(itemIds, (draft) => {
      for (const item of draft) {
        const update = assignmentUpdates.get(item.id);
        if (!update) continue;
        item.layer = update.layer;
        if (update.virtualLayerId) item.metadata[VIRTUAL_LAYER_METADATA_KEY] = { virtualLayerId: update.virtualLayerId };
        else delete item.metadata[VIRTUAL_LAYER_METADATA_KEY];
      }
    });
    let refreshed = await OBR.scene.items.getItems();
    if (targetId) {
      const groupItems = refreshed.filter((item) => item.layer === destination &&
        (getAssignmentId(item) ?? "") === (definition?.id ?? ""))
        .sort((a, b) => b.zIndex - a.zIndex || a.id.localeCompare(b.id));
      const moving = groupItems.filter((item) => itemIds.includes(item.id));
      const stationary = groupItems.filter((item) => !itemIds.includes(item.id));
      const targetIndex = stationary.findIndex((item) => item.id === targetId);
      const index = targetIndex < 0 ? stationary.length : targetIndex + (position === "after" ? 1 : 0);
      const arranged = [...stationary.slice(0, index), ...moving, ...stationary.slice(index)];
      const positions = new Map(arranged.map((item, index) => [item.id, arranged.length - index]));
      await OBR.scene.items.updateItems(arranged.map((item) => item.id), (draft) => {
        for (const item of draft) item.zIndex = positions.get(item.id) ?? item.zIndex;
      });
      refreshed = await OBR.scene.items.getItems();
    }
    await normalizeLayers(affectedLayers, state);
    await enforceStateInheritance(state);
  });
}

export function stackVirtualItems(itemIds: string[], operation: StackOperation) {
  return serialized(async () => {
    const state = await getState();
    const items = await OBR.scene.items.getItems();
    const updates = state.layers.length
      ? calculateVirtualStackingUpdates(items, state, itemIds, operation)
      : calculateStackingUpdates(items, itemIds, operation);
    if (updates.size) await OBR.scene.items.updateItems([...updates.keys()], (draft) => {
      for (const item of draft) item.zIndex = updates.get(item.id) ?? item.zIndex;
    });
  });
}

export async function readVirtualLayerState() {
  return parseVirtualLayerState((await OBR.scene.getMetadata())[VIRTUAL_LAYERS_METADATA_KEY]);
}

export function setGroupProperty(itemIds: string[], property: "visible" | "locked" | "disableHit", value: boolean) {
  return OBR.scene.items.updateItems(itemIds, (items) => {
    for (const item of items) item[property] = value;
  });
}

export { normalizeLayers };
