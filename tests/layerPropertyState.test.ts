import assert from "node:assert/strict";
import test from "node:test";
import { getLayerPropertyState } from "../src/layerPropertyState.ts";

test("disables aggregate properties for an empty layer", () => {
  assert.deepEqual(getLayerPropertyState([]), {
    hasItems: false,
    allDisableHit: false,
    allLocked: false,
    allVisible: false,
    mixedDisableHit: false,
    mixedLocked: false,
    mixedVisible: false,
  });
});

test("reports uniform layer properties", () => {
  assert.deepEqual(getLayerPropertyState([
    { disableHit: true, locked: true, visible: true },
    { disableHit: true, locked: true, visible: true },
  ]), {
    hasItems: true,
    allDisableHit: true,
    allLocked: true,
    allVisible: true,
    mixedDisableHit: false,
    mixedLocked: false,
    mixedVisible: false,
  });
});

test("reports mixed layer properties", () => {
  assert.deepEqual(getLayerPropertyState([
    { disableHit: true, locked: true, visible: false },
    { locked: false, visible: true },
  ]), {
    hasItems: true,
    allDisableHit: false,
    allLocked: false,
    allVisible: false,
    mixedDisableHit: true,
    mixedLocked: true,
    mixedVisible: true,
  });
});
