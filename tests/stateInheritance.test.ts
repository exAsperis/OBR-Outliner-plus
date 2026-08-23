import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "@owlbear-rodeo/sdk";
import { ITEM_INHERITANCE_METADATA_KEY } from "../src/constants.ts";
import {
  calculateInheritanceUpdates,
  captureAggregateState,
  getEffectiveItemRule,
  getItemParentRule,
  inheritanceLabel,
  parseItemInheritance,
} from "../src/stateInheritance.ts";
import { deleteVirtualLayer, parseVirtualLayerState, renameVirtualLayer, reorderVirtualLayer, type InheritedItemState, type VirtualLayerState } from "../src/virtualLayers.ts";

const native: InheritedItemState = { disableHit: false, locked: true, visible: true };
const group: InheritedItemState = { disableHit: true, locked: false, visible: true };
const local: InheritedItemState = { disableHit: true, locked: true, visible: false };
const state: VirtualLayerState = {
  version: 1,
  layers: [{ id: "roofs", name: "Roofs", obrLayer: "PROP", order: 0 }],
  inheritance: { native: { PROP: native }, virtual: { roofs: group }, unassigned: { PROP: native } },
};

function item(id: string, assignment?: string, rule?: InheritedItemState): Item {
  return {
    id, layer: "PROP", zIndex: 0, disableHit: false, locked: false, visible: true,
    metadata: {
      ...(assignment ? { "com.ex-asperis.outliner/virtualLayer": { virtualLayerId: assignment } } : {}),
      ...(rule ? { [ITEM_INHERITANCE_METADATA_KEY]: rule } : {}),
    },
  } as Item;
}

test("parses valid rules while ignoring malformed inheritance", () => {
  const parsed = parseVirtualLayerState({
    version: 1,
    layers: state.layers,
    inheritance: { native: { PROP: native, MAP: { locked: true } }, virtual: { roofs: group, stale: local }, unassigned: { PROP: "bad" } },
  });
  assert.deepEqual(parsed.inheritance, { native: { PROP: native }, virtual: { roofs: group } });
  assert.equal(parseItemInheritance({ locked: true }), undefined);
  assert.deepEqual(parseItemInheritance(local), local);
});

test("resolves item, virtual, unassigned, then native precedence", () => {
  assert.deepEqual(getEffectiveItemRule(item("local", "roofs", local), state), local);
  assert.deepEqual(getItemParentRule(item("group", "roofs"), state), group);
  assert.deepEqual(getEffectiveItemRule(item("unassigned"), state), native);
  const nativeOnly = { ...state, inheritance: { native: { PROP: native } } };
  assert.deepEqual(getEffectiveItemRule(item("native", "roofs"), nativeOnly), native);
});

test("calculates only state changes required by effective rules", () => {
  const inherited = item("inherited", "roofs");
  const overridden = item("overridden", "roofs", local);
  const updates = calculateInheritanceUpdates([inherited, overridden], state);
  assert.deepEqual(updates.get("inherited"), group);
  assert.deepEqual(updates.get("overridden"), local);
  Object.assign(inherited, group);
  Object.assign(overridden, local);
  assert.equal(calculateInheritanceUpdates([inherited, overridden], state).size, 0);
});

test("captures aggregate icons and safe empty defaults", () => {
  assert.deepEqual(captureAggregateState([]), { disableHit: false, locked: false, visible: true });
  assert.deepEqual(captureAggregateState([
    { disableHit: true, locked: true, visible: false },
    { disableHit: false, locked: true, visible: true },
  ]), { disableHit: false, locked: true, visible: false });
});

test("uses contextual inheritance labels", () => {
  assert.equal(inheritanceLabel(false, false), "Enable inheritance");
  assert.equal(inheritanceLabel(false, true), "Override inherited state");
  assert.equal(inheritanceLabel(true, true), "Remove override");
  assert.equal(inheritanceLabel(true, false), "Disable inheritance");
});

test("preserves rules through edits and removes a deleted virtual-layer rule", () => {
  const renamed = renameVirtualLayer(state, "roofs", "New Roofs");
  assert.deepEqual(renamed.inheritance, state.inheritance);
  const reordered = reorderVirtualLayer(renamed, "roofs", 0);
  assert.deepEqual(reordered.inheritance, state.inheritance);
  const deleted = deleteVirtualLayer(reordered, "roofs");
  assert.deepEqual(deleted.inheritance, { native: { PROP: native }, unassigned: { PROP: native } });
});
