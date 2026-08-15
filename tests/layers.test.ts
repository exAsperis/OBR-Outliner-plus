import assert from "node:assert/strict";
import test from "node:test";
import { formatLayerName, LAYERS_TOP_TO_BOTTOM } from "../src/layers.ts";

test("lists every Owlbear layer from top to bottom", () => {
  assert.deepEqual(LAYERS_TOP_TO_BOTTOM, [
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
  assert.equal(new Set(LAYERS_TOP_TO_BOTTOM).size, 15);
});

test("formats SDK layer names for the menu", () => {
  assert.equal(formatLayerName("POST_PROCESS"), "Post Process");
  assert.equal(formatLayerName("CHARACTER"), "Character");
});
