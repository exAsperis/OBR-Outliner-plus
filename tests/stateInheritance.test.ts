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
  inheritanceVisualState,
  itemInheritanceLabel,
  parseItemInheritance,
} from "../src/stateInheritance.ts";
import { createVirtualLayer, deleteVirtualLayer, parseVirtualLayerState, renameVirtualLayer, reorderVirtualLayer, setVirtualLayerRules, type InheritedItemState, type VirtualLayerState } from "../src/virtualLayers.ts";

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
  assert.equal(itemInheritanceLabel(false, false), "Block inheritance");
  assert.equal(itemInheritanceLabel(true, false), "Allow inheritance");
  assert.equal(itemInheritanceLabel(false, true), "Override inherited state");
  assert.equal(itemInheritanceLabel(true, true), "Remove override");
});

test("maps hierarchy rules to the four inheritance icon states", () => {
  assert.equal(inheritanceVisualState("native", false, false), "disabled");
  assert.equal(inheritanceVisualState("native", true, false), "enabled");
  assert.equal(inheritanceVisualState("virtual", false, true), "enabled");
  assert.equal(inheritanceVisualState("virtual", true, false), "blocked-virtual-layer");
  assert.equal(inheritanceVisualState("virtual", true, true), "blocked-virtual-layer");
  assert.equal(inheritanceVisualState("item", false, true), "enabled");
  assert.equal(inheritanceVisualState("item", true, false), "blocked-item");
  assert.equal(inheritanceVisualState("item", true, true), "blocked-item");
});

test("preserves rules through edits and removes a deleted virtual-layer rule", () => {
  const renamed = renameVirtualLayer(state, "roofs", "New Roofs");
  assert.deepEqual(renamed.inheritance, state.inheritance);
  const reordered = reorderVirtualLayer(renamed, "roofs", 0);
  assert.deepEqual(reordered.inheritance, state.inheritance);
  const deleted = deleteVirtualLayer(reordered, "roofs");
  assert.deepEqual(deleted.inheritance, { native: { PROP: native }, unassigned: { PROP: native } });
});

test("installs and updates one shared rule across any number of linked layers", () => {
  const withSecond = createVirtualLayer(state, "MAP", " roofs ", "map-roofs");
  const withThird = createVirtualLayer(withSecond, "DRAWING", "ROOFS", "drawing-roofs");
  const linked = setVirtualLayerRules(withThird, ["roofs", "map-roofs", "drawing-roofs"], local);
  assert.deepEqual(linked.inheritance?.virtual, {
    roofs: local,
    "map-roofs": local,
    "drawing-roofs": local,
  });

  const changed = { ...local, visible: true };
  const propagated = setVirtualLayerRules(linked, ["roofs", "map-roofs", "drawing-roofs"], changed);
  assert.deepEqual(propagated.inheritance?.virtual, {
    roofs: changed,
    "map-roofs": changed,
    "drawing-roofs": changed,
  });
  const unlinked = renameVirtualLayer(propagated, "map-roofs", "Map Roofs");
  assert.deepEqual(unlinked.inheritance?.virtual?.["map-roofs"], changed);
});
