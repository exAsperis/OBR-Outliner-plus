import assert from "node:assert/strict";
import test from "node:test";
import { fitPopoverToViewport } from "../src/sendToLayerSizing.ts";

test("expands to fit menu contents", () => {
  assert.deepEqual(fitPopoverToViewport(276.2, 318.1, 1200, 800), {
    width: 277,
    height: 319,
  });
});

test("keeps a compact minimum size", () => {
  assert.deepEqual(fitPopoverToViewport(100, 20, 1200, 800), {
    width: 184,
    height: 40,
  });
});

test("clamps oversized content to the viewport margins", () => {
  assert.deepEqual(fitPopoverToViewport(900, 700, 500, 400), {
    width: 484,
    height: 384,
  });
});
