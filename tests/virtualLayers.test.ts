import assert from "node:assert/strict";
import test from "node:test";
import { VIRTUAL_LAYER_METADATA_KEY } from "../src/constants.ts";
import {
  UNASSIGNED_ID,
  calculateNormalizationUpdates,
  calculateAssignmentUpdates,
  calculateVirtualStackingUpdates,
  createVirtualLayer,
  deleteVirtualLayer,
  desiredOrder,
  hasBoundaryViolation,
  isLinkedVirtualLayer,
  linkedVirtualLayers,
  parseVirtualLayerState,
  orderedGroupIds,
  renameVirtualLayer,
  reorderVirtualLayer,
  reorderStackingGroup,
  stackGroup,
  resolveGroupId,
  type VirtualLayerItem,
  type VirtualLayerState,
} from "../src/virtualLayers.ts";

const state: VirtualLayerState = { version: 2, layers: [
  { id: "roofs", name: "Roofs", obrLayer: "PROP", order: 0 },
  { id: "walls", name: "Walls", obrLayer: "PROP", order: 1 },
  { id: "pcs", name: "PCs", obrLayer: "CHARACTER", order: 0 },
] };
function item(id: string, layer: VirtualLayerItem["layer"], zIndex: number, virtualLayerId?: string): VirtualLayerItem {
  return { id, layer, zIndex, metadata: virtualLayerId ? { [VIRTUAL_LAYER_METADATA_KEY]: { virtualLayerId } } : {} };
}
function apply(items: VirtualLayerItem[], targets: string[], operation: "front" | "forward" | "backward" | "back") {
  const updates = calculateVirtualStackingUpdates(items, state, targets, operation);
  return items.map((entry) => ({ ...entry, zIndex: updates.get(entry.id) ?? entry.zIndex }));
}
function groupIds(items: VirtualLayerItem[], group: string) {
  return items.filter((entry) => resolveGroupId(entry, state) === group).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)).map((entry) => entry.id);
}

test("creates, renames, deletes, and reorders layer definitions", () => {
  const created = createVirtualLayer(state, "DRAWING", " Notes ", "notes");
  assert.equal(created.layers.at(-1)?.name, "Notes");
  assert.equal(renameVirtualLayer(created, "notes", "GM Notes").layers.at(-1)?.name, "GM Notes");
  assert.deepEqual(reorderVirtualLayer(state, "walls", 0).layers.filter((entry) => entry.obrLayer === "PROP").sort((a, b) => a.order - b.order).map((entry) => entry.id), ["walls", "roofs"]);
  assert.deepEqual(deleteVirtualLayer(state, "roofs").layers.filter((entry) => entry.obrLayer === "PROP").map((entry) => [entry.id, entry.order]), [["walls", 0]]);
});

test("allows duplicate trimmed case-insensitive names and derives links scene-wide", () => {
  const duplicate = createVirtualLayer(state, "DRAWING", " roofs ", "duplicate");
  assert.equal(duplicate.layers.at(-1)?.name, "roofs");
  assert.deepEqual(linkedVirtualLayers(duplicate, "roofs").map((layer) => layer.id), ["roofs", "duplicate"]);
  assert.equal(isLinkedVirtualLayer(duplicate, "duplicate"), true);
  const renamed = renameVirtualLayer(duplicate, "pcs", "ROOFS");
  assert.deepEqual(linkedVirtualLayers(renamed, "roofs").map((layer) => layer.id), ["roofs", "pcs", "duplicate"]);
  assert.equal(isLinkedVirtualLayer(renameVirtualLayer(renamed, "pcs", "Heroes"), "pcs"), false);
  assert.throws(() => createVirtualLayer(state, "PROP", " ", "empty"), /empty/);
});

test("parses valid definitions and ignores malformed entries", () => {
  const parsed = parseVirtualLayerState({ version: 1, layers: [state.layers[0], { id: 3 }] });
  assert.deepEqual(parsed.layers, [state.layers[0]]);
  assert.deepEqual(parseVirtualLayerState({ version: 2, layers: [] }).layers, []);
});

test("resolves missing, stale, and native-layer-mismatched assignments as Unassigned", () => {
  assert.equal(resolveGroupId(item("a", "PROP", 0), state), UNASSIGNED_ID);
  assert.equal(resolveGroupId(item("b", "PROP", 0, "missing"), state), UNASSIGNED_ID);
  assert.equal(resolveGroupId(item("c", "CHARACTER", 0, "roofs"), state), UNASSIGNED_ID);
  assert.equal(resolveGroupId(item("d", "PROP", 0, "roofs"), state), "roofs");
});

test("plans assign, reassign, unassign, and cross-native Send to Layer updates", () => {
  const items = [item("a", "PROP", 0), item("b", "PROP", 1, "walls")];
  assert.deepEqual(calculateAssignmentUpdates(items, state, ["a"], "PROP", "roofs").get("a"), { layer: "PROP", virtualLayerId: "roofs" });
  assert.deepEqual(calculateAssignmentUpdates(items, state, ["b"], "PROP", "roofs").get("b"), { layer: "PROP", virtualLayerId: "roofs" });
  assert.deepEqual(calculateAssignmentUpdates(items, state, ["b"], "PROP").get("b"), { layer: "PROP", virtualLayerId: undefined });
  const moved = calculateAssignmentUpdates(items, state, ["a", "b"], "CHARACTER", "pcs");
  assert.deepEqual([...moved.values()], [{ layer: "CHARACTER", virtualLayerId: "pcs" }, { layer: "CHARACTER", virtualLayerId: "pcs" }]);
  assert.throws(() => calculateAssignmentUpdates(items, state, ["a"], "CHARACTER", "roofs"), /different native/);
});

test("normalizes strict group order while preserving relative order", () => {
  const items = [item("r2", "PROP", -2, "roofs"), item("u", "PROP", 50), item("w", "PROP", 0.5, "walls"), item("r1", "PROP", -3, "roofs")];
  assert.deepEqual(desiredOrder(items, state, "PROP").map((entry) => entry.id), ["u", "w", "r1", "r2"]);
  const updates = calculateNormalizationUpdates(items, state, "PROP");
  assert.deepEqual([...updates], [["u", 0], ["w", 1], ["r1", 2], ["r2", 3]]);
  assert.equal(hasBoundaryViolation(items, state, "PROP"), true);
});

test("supports empty layers, equal z-indices, and reordered definitions deterministically", () => {
  const equal = [item("b", "PROP", 1, "roofs"), item("a", "PROP", 1, "roofs")];
  assert.deepEqual(desiredOrder(equal, state, "PROP").map((entry) => entry.id), ["a", "b"]);
  const reordered = reorderVirtualLayer(state, "walls", 0);
  const mixed = [item("r", "PROP", 2, "roofs"), item("w", "PROP", -5, "walls")];
  assert.deepEqual(desiredOrder(mixed, reordered, "PROP").map((entry) => entry.id), ["r", "w"]);
});

test("persists and enforces a freely reorderable Unassigned group", () => {
  const moved = reorderStackingGroup(state, "PROP", UNASSIGNED_ID, 0);
  assert.deepEqual(orderedGroupIds(moved, "PROP"), [UNASSIGNED_ID, "roofs", "walls"]);
  assert.equal(moved.unassignedOrders?.PROP, 0);
  const items = [item("road", "PROP", 10, "roofs"), item("other", "PROP", -5)];
  assert.deepEqual(desiredOrder(items, moved, "PROP").map((entry) => entry.id), ["road", "other"]);
  const normalized = calculateNormalizationUpdates(items, moved, "PROP");
  assert.equal(normalized.get("road"), 0);
  assert.equal(normalized.get("other"), 1);
  const roundTrip = parseVirtualLayerState(moved);
  assert.deepEqual(orderedGroupIds(roundTrip, "PROP"), [UNASSIGNED_ID, "roofs", "walls"]);
});

test("new virtual layers are inserted immediately above the current Unassigned position", () => {
  const moved = reorderStackingGroup(state, "PROP", UNASSIGNED_ID, 1);
  const created = createVirtualLayer(moved, "PROP", "Roads", "roads");
  assert.deepEqual(orderedGroupIds(created, "PROP"), ["roofs", "roads", UNASSIGNED_ID, "walls"]);
});

test("Send stacking actions move a virtual layer as a whole", () => {
  assert.deepEqual(orderedGroupIds(stackGroup(state, "PROP", "walls", "front"), "PROP"), ["walls", "roofs", UNASSIGNED_ID]);
  assert.deepEqual(orderedGroupIds(stackGroup(state, "PROP", "walls", "forward"), "PROP"), ["walls", "roofs", UNASSIGNED_ID]);
  assert.deepEqual(orderedGroupIds(stackGroup(state, "PROP", "roofs", "backward"), "PROP"), ["walls", "roofs", UNASSIGNED_ID]);
  assert.deepEqual(orderedGroupIds(stackGroup(state, "PROP", "roofs", "back"), "PROP"), ["walls", UNASSIGNED_ID, "roofs"]);
});

test("Send stacking actions support Unassigned and stop at group boundaries", () => {
  assert.deepEqual(orderedGroupIds(stackGroup(state, "PROP", UNASSIGNED_ID, "front"), "PROP"), [UNASSIGNED_ID, "roofs", "walls"]);
  assert.equal(stackGroup(state, "PROP", "roofs", "forward"), state);
  assert.equal(stackGroup(state, "PROP", UNASSIGNED_ID, "backward"), state);
});

for (const [operation, expected] of Object.entries({ front: ["b", "c", "a"], forward: ["b", "a", "c"], backward: ["a", "b", "c"], back: ["a", "b", "c"] }) as Array<["front" | "forward" | "backward" | "back", string[]]>) {
  test(`stacking ${operation} stays inside a virtual layer`, () => {
    const items = [item("a", "PROP", 2, "roofs"), item("b", "PROP", 3, "roofs"), item("c", "PROP", 4, "roofs"), item("wall", "PROP", 1, "walls")];
    assert.deepEqual(groupIds(apply(items, ["a"], operation), "roofs"), expected);
    assert.deepEqual(groupIds(apply(items, ["a"], operation), "walls"), ["wall"]);
  });
}

test("multi-selection operates independently across virtual, native, and unassigned groups", () => {
  const items = [item("r1", "PROP", 3, "roofs"), item("r2", "PROP", 4, "roofs"), item("u1", "PROP", 0), item("u2", "PROP", 1), item("p1", "CHARACTER", 2, "pcs"), item("p2", "CHARACTER", 3, "pcs")];
  const result = apply(items, ["r1", "u1", "p1"], "front");
  assert.deepEqual(groupIds(result, "roofs"), ["r2", "r1"]);
  assert.deepEqual(groupIds(result, UNASSIGNED_ID).filter((id) => id.startsWith("u")), ["u2", "u1"]);
  assert.deepEqual(groupIds(result, "pcs"), ["p2", "p1"]);
});
