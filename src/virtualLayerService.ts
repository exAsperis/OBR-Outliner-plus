import OBR, { type Item } from "@owlbear-rodeo/sdk";
import {
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

export function setGroupProperty(itemIds: string[], property: "visible" | "locked", value: boolean) {
  return OBR.scene.items.updateItems(itemIds, (items) => {
    for (const item of items) item[property] = value;
  });
}

export { normalizeLayers };
