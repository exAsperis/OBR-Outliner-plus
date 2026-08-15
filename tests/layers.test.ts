import assert from "node:assert/strict";
import test from "node:test";
import { formatLayerName, getOutlinerLayers, OUTLINER_LAYERS_TOP_TO_BOTTOM } from "../src/layers.ts";

test("lists the Outliner layers from top to bottom", () => {
  assert.deepEqual(OUTLINER_LAYERS_TOP_TO_BOTTOM, [
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
    "MAP",
  ]);
  assert.equal(new Set(OUTLINER_LAYERS_TOP_TO_BOTTOM).size, 11);
});

test("shows Fog only to GMs", () => {
  assert.deepEqual(getOutlinerLayers("GM"), OUTLINER_LAYERS_TOP_TO_BOTTOM);
  assert.deepEqual(
    getOutlinerLayers("PLAYER"),
    OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((layer) => layer !== "FOG"),
  );
});

test("formats layer names for the menu", () => {
  assert.equal(formatLayerName("CHARACTER"), "Character");
});
