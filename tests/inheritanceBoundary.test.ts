import assert from "node:assert/strict";
import test from "node:test";
import { getInheritanceBoundary, inheritanceBoundaryDescription, withoutBoundaryInheritance } from "../src/inheritanceBoundary.ts";
import { createVirtualLayer, renameVirtualLayer, type VirtualLayerState } from "../src/virtualLayers.ts";

const state: VirtualLayerState = {
  version: 2,
  layers: [
    { id: "ordinary", name: "Ordinary", obrLayer: "PROP", order: 0 },
    { id: "linked-prop", name: "Shared", obrLayer: "PROP", order: 1 },
    { id: "linked-map", name: "shared", obrLayer: "MAP", order: 0 },
    { id: "dependent", name: "House: floor 1/Lights", obrLayer: "PROP", order: 2 },
    { id: "linked-dependent", name: "House: floor 1/Lights", obrLayer: "DRAWING", order: 0 },
  ],
  inheritance: { virtual: {
    ordinary: { mode: "independent", enforce: { locked: true } },
    "linked-prop": { mode: "pass-through" },
    "linked-map": { mode: "independent", enforce: { visible: false } },
    dependent: { mode: "pass-through" },
    "linked-dependent": { mode: "independent", enforce: { disableHit: true } },
  } },
};

test("identifies linked, dependent, and combined structural boundaries", () => {
  assert.equal(getInheritanceBoundary(state, "ordinary"), undefined);
  assert.deepEqual(getInheritanceBoundary(state, "linked-prop"), { reasons: ["linked"] });
  assert.deepEqual(getInheritanceBoundary(state, "dependent"), { reasons: ["linked", "dependent"] });
  assert.match(inheritanceBoundaryDescription(getInheritanceBoundary(state, "dependent")!), /linked and dependent/);
});

test("removes only invalid virtual inheritance configuration", () => {
  assert.deepEqual(withoutBoundaryInheritance(state).inheritance?.virtual, {
    ordinary: { mode: "independent", enforce: { locked: true } },
  });
});

test("creating or renaming a link removes newly invalid inheritance rules", () => {
  const created = createVirtualLayer(state, "TEXT", "Ordinary", "ordinary-link");
  assert.equal(created.inheritance?.virtual?.ordinary, undefined);
  const renamed = renameVirtualLayer(state, "linked-map", "Ordinary");
  assert.equal(renamed.inheritance?.virtual?.ordinary, undefined);
  assert.equal(renamed.inheritance?.virtual?.["linked-map"], undefined);
});
