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
  type EnforcedItemState,
  type StatefulProperty,
  type VirtualInheritance,
  type VirtualLayerState,
} from "./virtualLayers";
import {
  calculateInheritanceUpdates,
  directGroupItemIds,
  directNativeItemIds,
  getGroupEffectiveInstructions,
  getGroupInheritance,
  getItemRule,
  getNativeRule,
  linkedDirectPropertyItemIds,
} from "./stateInheritance";
import { activateTransparency, getTransparentState, needsTransparencyEnforcement, restoreTransparency } from "./transparentState";

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
    const id = `vl_${crypto.randomUUID()}`;
    const next = createVirtualLayer(state, obrLayer, name, id);
    await setState(next);
    await enforceStateInheritance(next);
    await normalizeLayers([obrLayer], next);
  });
}

export function updateVirtualLayerName(id: string, name: string) {
  return serialized(async () => {
    const state = await getState();
    const next = renameVirtualLayer(state, id, name);
    await setState(next);
    await enforceStateInheritance(next);
  });
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
  const directUpdates = items.filter((item) => getTransparentState(item)?.source === "direct" && needsTransparencyEnforcement(item));
  const updateIds = new Set([...updates.keys(), ...directUpdates.map((item) => item.id)]);
  if (updateIds.size) await OBR.scene.items.updateItems([...updateIds], (draft) => {
    for (const item of draft) {
      if (!updates.has(item.id)) {
        activateTransparency(item, "direct");
        continue;
      }
      const update = updates.get(item.id);
      if (!update) continue;
      const instructions = update.instructions ?? {};
      if (getItemRule(item)?.legacy) item.metadata[ITEM_INHERITANCE_METADATA_KEY] = { independent: true };
      if (update.preserveTransparency && getTransparentState(item)) {
        activateTransparency(item, "direct");
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(instructions, "transparent")) {
        if (instructions.transparent) activateTransparency(item, "inherited");
        else restoreTransparency(item);
      } else if (getTransparentState(item)?.source === "inherited") restoreTransparency(item);
      if (typeof instructions.disableHit === "boolean") item.disableHit = instructions.disableHit;
      if (typeof instructions.visible === "boolean") item.visible = instructions.visible;
      if (typeof instructions.locked === "boolean") item.locked = instructions.locked;
    }
  });
}

export type RuleScope = { kind: "native"; layer: Item["layer"] } | { kind: "group"; layer: Item["layer"]; groupId: string };

function withNativeInstructions(state: VirtualLayerState, layer: Item["layer"], enforce: EnforcedItemState): VirtualLayerState {
  const inheritance = { ...state.inheritance };
  const native = { ...inheritance.native };
  if (Object.keys(enforce).length) native[layer] = enforce; else delete native[layer];
  if (Object.keys(native).length) inheritance.native = native; else delete inheritance.native;
  return { ...state, inheritance: inheritance.native || inheritance.virtual || inheritance.unassigned ? inheritance : undefined };
}

function withGroupInheritance(state: VirtualLayerState, scope: Extract<RuleScope, { kind: "group" }>, config: VirtualInheritance): VirtualLayerState {
  const inheritance = { ...state.inheritance };
  if (scope.groupId === "__unassigned__") {
    const unassigned = { ...inheritance.unassigned };
    unassigned[scope.layer] = config;
    inheritance.unassigned = unassigned;
  } else {
    const virtual = { ...inheritance.virtual };
    virtual[scope.groupId] = config;
    inheritance.virtual = virtual;
  }
  return { ...state, inheritance };
}

export function setGroupInheritanceMode(scope: Extract<RuleScope, { kind: "group" }>, mode: VirtualInheritance["mode"]) {
  return serialized(async () => {
    const state = await getState();
    const next = withGroupInheritance(state, scope, mode === "pass-through" ? { mode } : { mode, enforce: {} });
    await setState(next);
    await enforceStateInheritance(next);
  });
}

export function setScopeEnforcement(scope: RuleScope, property: StatefulProperty, enabled: boolean, capturedValue: boolean) {
  return serialized(async () => {
    const state = await getState();
    let next: VirtualLayerState;
    if (scope.kind === "native") {
      const enforce = { ...getNativeRule(state, scope.layer) };
      if (enabled) enforce[property] = capturedValue; else delete enforce[property];
      next = withNativeInstructions(state, scope.layer, enforce);
    } else {
      const config = getGroupInheritance(state, scope.layer, scope.groupId);
      if (config.mode !== "independent") return;
      const enforce = { ...config.enforce };
      if (enabled) enforce[property] = capturedValue; else delete enforce[property];
      next = withGroupInheritance(state, scope, { mode: "independent", enforce });
    }
    await setState(next);
    await enforceStateInheritance(next);
  });
}

export function setScopeProperty(scope: RuleScope, property: StatefulProperty, value: boolean) {
  return serialized(async () => {
    const state = await getState();
    const items = await OBR.scene.items.getItems();
    let next = state;
    const directIds = new Set<string>();
    if (scope.kind === "native") {
      const enforce = getNativeRule(state, scope.layer);
      if (Object.prototype.hasOwnProperty.call(enforce, property)) next = withNativeInstructions(state, scope.layer, { ...enforce, [property]: value });
      else directNativeItemIds(items, state, scope.layer).forEach((id) => directIds.add(id));
    } else {
      const config = getGroupInheritance(state, scope.layer, scope.groupId);
      if (config.mode === "independent" && Object.prototype.hasOwnProperty.call(config.enforce, property)) {
        next = withGroupInheritance(next, scope, { ...config, enforce: { ...config.enforce, [property]: value } });
      } else if (Object.prototype.hasOwnProperty.call(getGroupEffectiveInstructions(state, scope.layer, scope.groupId), property)) {
        return;
      } else if (scope.groupId !== "__unassigned__") {
        linkedDirectPropertyItemIds(items, state, scope.groupId, property).forEach((id) => directIds.add(id));
      } else {
        directGroupItemIds(items, state, scope.layer, scope.groupId).forEach((id) => directIds.add(id));
      }
    }
    if (next !== state) await setState(next);
    if (directIds.size) await OBR.scene.items.updateItems([...directIds], (draft) => {
      for (const item of draft) {
        if (property === "transparent") {
          if (value) activateTransparency(item, "direct"); else restoreTransparency(item);
        } else item[property] = value;
      }
    });
    await enforceStateInheritance(next);
  });
}

export function toggleItemInheritance(item: Item) {
  return serialized(async () => {
    const state = await getState();
    const independent = Boolean(getItemRule(item));
    await OBR.scene.items.updateItems([item.id], (draft) => {
      const target = draft[0];
      if (independent) delete target.metadata[ITEM_INHERITANCE_METADATA_KEY];
      else {
        target.metadata[ITEM_INHERITANCE_METADATA_KEY] = { independent: true };
        if (getTransparentState(target)?.source === "inherited") activateTransparency(target, "direct");
      }
    });
    await enforceStateInheritance(state);
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

export function setItemTransparency(item: Item, value: boolean) {
  return serialized(async () => {
    await OBR.scene.items.updateItems([item.id], (items) => {
      if (value) activateTransparency(items[0], "direct");
      else restoreTransparency(items[0]);
    });
  });
}

export { normalizeLayers };
