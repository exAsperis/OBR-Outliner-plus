import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "@owlbear-rodeo/sdk";
import { ITEM_INHERITANCE_METADATA_KEY } from "../src/constants.ts";
import { activateTransparency, isItemTransparent, restoreTransparency } from "../src/transparentState.ts";
import {
  calculateInheritanceUpdates,
  captureAggregateState,
  directNativeItemIds,
  getEffectiveItemRule,
  getGroupEffectiveInstructions,
  getGroupInheritance,
  getItemParentRule,
  getNativeRule,
  inheritanceVisualState,
  itemState,
  itemInheritanceLabel,
  linkedDirectPropertyItemIds,
  withLinkedGroupProperty,
  parseItemInheritance,
} from "../src/stateInheritance.ts";
import {
  createVirtualLayer,
  deleteVirtualLayer,
  parseVirtualLayerState,
  renameVirtualLayer,
  mutuallyExclusiveVirtualLayers,
  reorderVirtualLayer,
  type InheritedItemState,
  type VirtualLayerState,
} from "../src/virtualLayers.ts";

const full: InheritedItemState = { disableHit: true, locked: true, visible: false, transparent: false };
const state: VirtualLayerState = {
  version: 2,
  layers: [{ id: "roofs", name: "Roofs", obrLayer: "PROP", order: 0 }],
  inheritance: {
    native: { PROP: { locked: true, visible: false } },
    virtual: { roofs: { mode: "independent", enforce: { transparent: true } } },
    unassigned: { PROP: { mode: "pass-through" } },
  },
};

function item(id: string, assignment?: string, independent: unknown = false): Item {
  return {
    id, layer: "PROP", zIndex: 0, disableHit: false, locked: false, visible: true, scale: { x: 1, y: 1 },
    metadata: {
      ...(assignment ? { "com.ex-asperis.outliner/virtualLayer": { virtualLayerId: assignment } } : {}),
      ...(independent ? { [ITEM_INHERITANCE_METADATA_KEY]: independent === true ? { independent: true } : independent } : {}),
    },
  } as Item;
}

test("migrates legacy full rules into version-2 enforcement records", () => {
  const parsed = parseVirtualLayerState({
    version: 1,
    layers: state.layers,
    inheritance: { native: { PROP: full }, virtual: { roofs: full }, unassigned: { PROP: full } },
  });
  assert.equal(parsed.version, 2);
  assert.deepEqual(parsed.inheritance, {
    native: { PROP: full },
    virtual: { roofs: { mode: "independent", enforce: full } },
    unassigned: { PROP: { mode: "independent", enforce: full } },
  });
});

test("parses partial instructions, modes, and legacy item overrides", () => {
  assert.deepEqual(parseVirtualLayerState(state), state);
  assert.deepEqual(parseItemInheritance({ independent: true }), { independent: true, legacy: false });
  assert.deepEqual(parseItemInheritance(full), { independent: true, legacy: true });
  assert.equal(parseItemInheritance({ locked: true }), undefined);
});

test("resolves pass-through, independent, and item-independent precedence", () => {
  assert.deepEqual(getNativeRule(state, "PROP"), { locked: true, visible: false });
  assert.deepEqual(getGroupInheritance(state, "PROP", "roofs"), { mode: "independent", enforce: { transparent: true } });
  assert.deepEqual(getGroupEffectiveInstructions(state, "PROP", "roofs"), { transparent: true });
  assert.deepEqual(getItemParentRule(item("roof", "roofs"), state), { transparent: true });
  assert.deepEqual(getItemParentRule(item("unassigned"), state), { locked: true, visible: false });
  assert.deepEqual(getEffectiveItemRule(item("independent", undefined, true), state), {});
});

test("calculates only changes for instructed properties", () => {
  const passThrough = item("pass-through");
  const independent = item("independent", undefined, true);
  const updates = calculateInheritanceUpdates([passThrough, independent], state);
  assert.deepEqual(updates.get("pass-through"), { instructions: { locked: true, visible: false } });
  assert.equal(updates.has("independent"), false);
  passThrough.locked = true;
  passThrough.visible = false;
  assert.equal(calculateInheritanceUpdates([passThrough], state).size, 0);
});

test("leaves ordinary values alone when their instructions disappear", () => {
  const target = item("target");
  target.locked = true;
  target.visible = false;
  const withoutInstructions: VirtualLayerState = { version: 2, layers: state.layers };
  assert.equal(calculateInheritanceUpdates([target], withoutInstructions).size, 0);
});

test("plans inherited transparency activation and restoration", () => {
  const target = item("target", "roofs");
  assert.deepEqual(calculateInheritanceUpdates([target], state).get("target"), { instructions: { transparent: true } });
  target.metadata["com.ex-asperis.outliner/transparentState"] = {
    scale: { x: 1, y: 1 }, source: "inherited", visible: true, disableHit: false,
  };
  target.scale = { x: 0, y: 0 };
  target.visible = false;
  assert.equal(calculateInheritanceUpdates([target], state).size, 0);
  const withoutRule: VirtualLayerState = { version: 2, layers: state.layers };
  assert.deepEqual(calculateInheritanceUpdates([target], withoutRule).get("target"), { instructions: {} });
});

test("allows visibility and click-through instructions to compose with transparency", () => {
  const target = item("compound", "roofs");
  target.metadata["com.ex-asperis.outliner/transparentState"] = { scale: { x: 1, y: 1 }, source: "inherited" };
  target.scale = { x: 0, y: 0 };
  target.visible = false;
  target.disableHit = true;
  const compound: VirtualLayerState = {
    ...state,
    inheritance: { ...state.inheritance, virtual: {
      roofs: { mode: "independent", enforce: { transparent: true, visible: true, disableHit: false } },
    } },
  };
  assert.deepEqual(calculateInheritanceUpdates([target], compound).get("compound"), {
    instructions: { transparent: true, visible: true, disableHit: false },
  });
});

test("migrates a legacy independent transparent item without restoring it", () => {
  const target = item("legacy", undefined, full);
  target.metadata["com.ex-asperis.outliner/transparentState"] = {
    scale: { x: 1, y: 1 }, visible: true, disableHit: false, source: "inherited",
  };
  assert.deepEqual(calculateInheritanceUpdates([target], state).get("legacy"), { instructions: {}, preserveTransparency: true });
});

test("captures aggregate values and maps the new icon states", () => {
  assert.deepEqual(captureAggregateState([]), { disableHit: false, locked: false, visible: true, transparent: false });
  assert.deepEqual(captureAggregateState([
    { disableHit: true, locked: true, visible: false, metadata: {} },
    { disableHit: false, locked: true, visible: true, metadata: {} },
  ]), { disableHit: false, locked: true, visible: false, transparent: false });
  const transparentVisible = item("transparent-visible");
  activateTransparency(transparentVisible, "direct");
  assert.equal(transparentVisible.visible, false);
  assert.deepEqual(itemState(transparentVisible), {
    disableHit: false, locked: false, visible: true, transparent: true,
  });
  assert.equal(captureAggregateState([transparentVisible]).visible, true);
  assert.equal(inheritanceVisualState("native", false), "disabled");
  assert.equal(inheritanceVisualState("native", true), "enabled");
  assert.equal(inheritanceVisualState("virtual", false, true), "blocked-virtual-layer");
  assert.equal(inheritanceVisualState("item", false, true), "blocked-item");
  assert.equal(itemInheritanceLabel(false), "Independent");
  assert.equal(itemInheritanceLabel(true), "Allow inheritance");
});

test("preserves inheritance through edits and removes deleted virtual configuration", () => {
  assert.deepEqual(renameVirtualLayer(state, "roofs", "New Roofs").inheritance, state.inheritance);
  assert.deepEqual(reorderVirtualLayer(state, "roofs", 0).inheritance, state.inheritance);
  assert.deepEqual(deleteVirtualLayer(state, "roofs").inheritance, {
    native: state.inheritance?.native,
    unassigned: state.inheritance?.unassigned,
  });
});

test("plans linked property updates by effective property instructions rather than layer mode", () => {
  let linked = createVirtualLayer(state, "MAP", " roofs ", "map-roofs");
  linked = createVirtualLayer(linked, "CHARACTER", "ROOFS", "character-roofs");
  linked = createVirtualLayer(linked, "DRAWING", "Roofs", "drawing-roofs");
  linked = createVirtualLayer(linked, "NOTE", "ROOFS", "empty-roofs");
  linked = createVirtualLayer(linked, "TEXT", "roofs", "text-roofs");
  linked = {
    ...linked,
    inheritance: {
      ...linked.inheritance,
      native: { ...linked.inheritance?.native, TEXT: { locked: true } },
      virtual: {
        ...linked.inheritance?.virtual,
        "map-roofs": { mode: "independent", enforce: { visible: false } },
        "character-roofs": { mode: "pass-through" },
        "drawing-roofs": { mode: "independent", enforce: { disableHit: true } },
        "empty-roofs": { mode: "independent", enforce: {} },
        "text-roofs": { mode: "pass-through" },
      },
    },
  };
  const placed = (id: string, layer: Item["layer"], assignment: string, independent = false) => {
    const target = item(id, assignment, independent);
    target.layer = layer;
    return target;
  };
  const items = [
    placed("source", "PROP", "roofs"),
    placed("source-independent", "PROP", "roofs", true),
    placed("map", "MAP", "map-roofs"),
    placed("map-independent", "MAP", "map-roofs", true),
    placed("character", "CHARACTER", "character-roofs"),
    placed("drawing", "DRAWING", "drawing-roofs"),
    placed("text", "TEXT", "text-roofs"),
  ];
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "roofs", "locked"), ["source", "source-independent", "map", "map-independent", "character", "drawing"]);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "roofs", "visible"), ["source", "source-independent", "character", "drawing", "text"]);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "roofs", "disableHit"), ["source", "source-independent", "map", "map-independent", "character", "text"]);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "roofs", "transparent"), ["map", "map-independent", "character", "drawing", "text"]);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "character-roofs", "visible"), ["source", "source-independent", "character", "drawing", "text"]);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "text-roofs", "locked"), []);
  assert.equal(linked.inheritance?.virtual?.["character-roofs"]?.mode, "pass-through");
  assert.deepEqual(linked.inheritance?.virtual?.["map-roofs"], { mode: "independent", enforce: { visible: false } });
});

test("derives native direct targets from current inheritance eligibility", () => {
  const items = [item("unassigned"), item("independent", undefined, true), item("roof", "roofs")];
  assert.deepEqual(directNativeItemIds(items, state, "PROP"), ["unassigned"]);
});

test("locally enforced transparency reaches linked peers in both directions and survives enforcement", () => {
  let linked = createVirtualLayer(state, "MAP", "Roofs", "map-roofs");
  linked = createVirtualLayer(linked, "DRAWING", "Roofs", "drawing-roofs");
  linked = createVirtualLayer(linked, "TEXT", "Roofs", "text-roofs");
  linked.inheritance = {
    ...linked.inheritance,
    native: { ...linked.inheritance?.native, TEXT: { transparent: false } },
    virtual: {
      ...linked.inheritance?.virtual,
      "drawing-roofs": { mode: "independent", enforce: { transparent: false } },
    },
  };
  const items = [item("source", "roofs"), item("peer", "map-roofs"),
    item("own-rule", "drawing-roofs"), item("native-rule", "text-roofs")];
  items[1].layer = "MAP";
  items[2].layer = "DRAWING";
  items[3].layer = "TEXT";
  const originalScale = { ...items[1].scale };
  for (const transparent of [true, false]) {
    linked.inheritance.virtual!.roofs = { mode: "independent", enforce: { transparent } };
    const ids = linkedDirectPropertyItemIds(items, linked, "roofs", "transparent");
    assert.deepEqual(ids, ["peer"]);
    for (const target of items.filter((target) => ids.includes(target.id))) {
      if (transparent) activateTransparency(target, "direct");
      else restoreTransparency(target);
    }
    assert.equal(isItemTransparent(items[1]), transparent);
    assert.equal(calculateInheritanceUpdates(items, linked).has("peer"), false);
  }
  assert.deepEqual(items[1].scale, originalScale);
  assert.deepEqual(linkedDirectPropertyItemIds(items, linked, "text-roofs", "transparent"), []);
});

test("creating and renaming linked layers never copies inheritance configuration", () => {
  const created = createVirtualLayer(state, "MAP", "Roofs", "new-roofs");
  assert.equal(created.inheritance?.virtual?.["new-roofs"], undefined);
  const renamed = renameVirtualLayer(createVirtualLayer(state, "MAP", "Other", "other"), "other", "Roofs");
  assert.equal(renamed.inheritance?.virtual?.other, undefined);
  assert.deepEqual(renamed.inheritance?.virtual?.roofs, state.inheritance?.virtual?.roofs);
});

test("Tomb switches synchronize enforced Props and direct Maps with an unmatched third state", () => {
  for (const extraLayer of ["MAP", "PROP"] as const) {
    let tomb: VirtualLayerState = {
      version: 2,
      layers: [
        { id: "p2", name: "-2: Tomb", obrLayer: "PROP", order: 0 },
        { id: "p4", name: "-4: Tomb", obrLayer: "PROP", order: 1 },
        { id: "m2", name: "-2: Tomb", obrLayer: "MAP", order: 0 },
        { id: "m4", name: "-4: Tomb", obrLayer: "MAP", order: 1 },
        { id: "extra", name: "-3: Tomb", obrLayer: extraLayer, order: 2 },
      ],
      inheritance: { virtual: {
        p2: { mode: "independent", enforce: { transparent: true, locked: true } },
        p4: { mode: "independent", enforce: { transparent: true } },
        m2: { mode: "independent", enforce: {} },
        m4: { mode: "independent", enforce: {} },
      } },
    };
    const items = tomb.layers.map((layer) => ({ ...item(layer.id, layer.id), layer: layer.obrLayer }));
    for (const source of ["m2", "m4", "p2", "p4"]) {
      tomb = withLinkedGroupProperty(tomb, source, "transparent", false);
      const direct = new Map(linkedDirectPropertyItemIds(items, tomb, source, "transparent").map((id) => [id, false]));
      for (const sibling of mutuallyExclusiveVirtualLayers(tomb, source)) {
        tomb = withLinkedGroupProperty(tomb, sibling.id, "transparent", true);
        for (const id of linkedDirectPropertyItemIds(items, tomb, sibling.id, "transparent")) direct.set(id, true);
      }
      for (const target of items) {
        const rule = getItemParentRule(target, tomb);
        const transparent = rule.transparent ?? direct.get(target.id);
        assert.equal(transparent, target.id === "extra" || target.id.slice(1) !== source.slice(1));
      }
      assert.deepEqual(tomb.inheritance?.virtual?.p2, { mode: "independent", enforce: { transparent: source.endsWith("4"), locked: true } });
      assert.deepEqual(tomb.inheritance?.virtual?.m2, { mode: "independent", enforce: {} });
    }
  }
});
