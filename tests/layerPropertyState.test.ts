import assert from "node:assert/strict";
import test from "node:test";
import { getLayerPropertyState } from "../src/layerPropertyState.ts";

test("disables aggregate properties for an empty layer", () => {
  assert.deepEqual(getLayerPropertyState([]), {
    hasItems: false,
    allLocked: false,
    allVisible: false,
    mixedLocked: false,
    mixedVisible: false,
  });
});

test("reports uniform layer properties", () => {
  assert.deepEqual(getLayerPropertyState([
    { locked: true, visible: true },
    { locked: true, visible: true },
  ]), {
    hasItems: true,
    allLocked: true,
    allVisible: true,
    mixedLocked: false,
    mixedVisible: false,
  });
});

test("reports mixed layer properties", () => {
  assert.deepEqual(getLayerPropertyState([
    { locked: true, visible: false },
    { locked: false, visible: true },
  ]), {
    hasItems: true,
    allLocked: false,
    allVisible: false,
    mixedLocked: true,
    mixedVisible: true,
  });
});
