import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OUTLINER_LAYERS, formatLayerName, getOutlinerLayers, OUTLINER_LAYERS_TOP_TO_BOTTOM } from "../src/layers.ts";

test("lists the Outliner layers from top to bottom", () => {
  assert.deepEqual(OUTLINER_LAYERS_TOP_TO_BOTTOM, [
    "POPOVER",
    "CONTROL",
    "POST_PROCESS",
    "POINTER",
    "FOG",
    "RULER",
    "TEXT",
    "NOTE",
    "ATTACHMENT",
    "CHARACTER",
    "MOUNT",
    "PROP",
    "DRAWING",
    "GRID",
    "MAP",
  ]);
  assert.equal(new Set(OUTLINER_LAYERS_TOP_TO_BOTTOM).size, 15);
  assert.deepEqual(DEFAULT_OUTLINER_LAYERS, OUTLINER_LAYERS_TOP_TO_BOTTOM.filter(
    (layer) => !["POPOVER", "CONTROL", "POST_PROCESS", "GRID"].includes(layer),
  ));
});

test("shows Fog only to GMs", () => {
  assert.deepEqual(getOutlinerLayers("GM"), DEFAULT_OUTLINER_LAYERS);
  assert.deepEqual(
    getOutlinerLayers("PLAYER"),
    DEFAULT_OUTLINER_LAYERS.filter((layer) => layer !== "FOG"),
  );
  assert.deepEqual(getOutlinerLayers("PLAYER", OUTLINER_LAYERS_TOP_TO_BOTTOM), OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((layer) => layer !== "FOG"));
});

test("filters every layer surface with the enabled preference", () => {
  assert.deepEqual(getOutlinerLayers("GM", ["MAP", "GRID", "CONTROL"]), ["CONTROL", "GRID", "MAP"]);
  assert.deepEqual(getOutlinerLayers("GM", []), []);
});

test("formats layer names for the menu", () => {
  assert.equal(formatLayerName("CHARACTER"), "Character");
});
