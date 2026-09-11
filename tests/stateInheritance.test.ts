import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "@owlbear-rodeo/sdk";
import { ITEM_INHERITANCE_METADATA_KEY, VIRTUAL_LAYER_METADATA_KEY } from "../src/constants.ts";
import { calculateInheritanceUpdates, getEffectiveItemRule, getGroupEffectiveInstructions, parseItemInheritance } from "../src/stateInheritance.ts";
import { deleteVirtualLayer, parseVirtualLayerState, type VirtualLayerState } from "../src/virtualLayers.ts";

const state: VirtualLayerState = { version: 2, layers: [{ id: "roofs", name: "Roofs", obrLayer: "PROP", order: 0 }], inheritance: { native: { PROP: { locked: true, visible: false } }, virtual: { roofs: { mode: "independent", enforce: { disableHit: true } } } } };
function item(id: string, assignment?: string, independent = false) { return { id, layer: "PROP", zIndex: 0, disableHit: false, locked: false, visible: true, metadata: { ...(assignment ? { [VIRTUAL_LAYER_METADATA_KEY]: { virtualLayerId: assignment } } : {}), ...(independent ? { [ITEM_INHERITANCE_METADATA_KEY]: { independent: true } } : {}) } } as Item; }

test("resolves native, group-independent, and item-independent precedence", () => {
  assert.deepEqual(getGroupEffectiveInstructions(state, "PROP", "__unassigned__"), { locked: true, visible: false });
  assert.deepEqual(getEffectiveItemRule(item("roof", "roofs"), state), { disableHit: true });
  assert.deepEqual(getEffectiveItemRule(item("free", undefined, true), state), {});
  assert.deepEqual(parseItemInheritance({ independent: true }), { independent: true });
});
test("plans updates only for enforced properties", () => {
  assert.deepEqual(calculateInheritanceUpdates([item("target")], state).get("target"), { locked: true, visible: false });
  assert.equal(calculateInheritanceUpdates([item("free", undefined, true)], state).size, 0);
});
test("migrates legacy rules and drops transparency", () => {
  const parsed = parseVirtualLayerState({ version: 2, layers: state.layers, inheritance: { native: { PROP: { locked: true, transparent: true } }, virtual: { roofs: { mode: "independent", enforce: { visible: false, transparent: true } } } } });
  assert.deepEqual(parsed.inheritance, { native: { PROP: { locked: true } }, virtual: { roofs: { mode: "independent", enforce: { visible: false } } } });
});
test("deleting a virtual layer deletes its inheritance record", () => {
  assert.equal(deleteVirtualLayer(state, "roofs").inheritance?.virtual?.roofs, undefined);
});
