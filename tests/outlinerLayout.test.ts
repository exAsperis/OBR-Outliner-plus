import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OUTLINER_DIMENSIONS, MAX_OUTLINER_HEIGHT, MIN_OUTLINER_HEIGHT, MIN_OUTLINER_WIDTH, OUTLINER_LAYOUT_SETTINGS_KEY, parseOutlinerLayoutSettings, readOutlinerLayoutSettings, resizedDimensions } from "../src/outlinerLayout.ts";

test("parses, migrates, and clamps saved full dimensions", () => {
  assert.deepEqual(parseOutlinerLayoutSettings({ version: 1, dimensions: { width: 1, height: 9999 } })?.dimensions, { width: MIN_OUTLINER_WIDTH, height: MAX_OUTLINER_HEIGHT });
  assert.deepEqual(parseOutlinerLayoutSettings({ version: 3, full: { width: 450, height: 300 } })?.dimensions, { width: 450, height: 300 });
});
test("rejects malformed and unavailable storage values", () => {
  assert.equal(parseOutlinerLayoutSettings({ version: 1, dimensions: {} }), undefined);
  assert.equal(readOutlinerLayoutSettings({ getItem: (key) => { assert.equal(key, OUTLINER_LAYOUT_SETTINGS_KEY); return "bad"; } }), undefined);
});
test("resizing changes only the requested axes and clamps bounds", () => {
  assert.deepEqual(resizedDimensions({ width: 400, height: 300 }, "width", 50, 80), { width: 450, height: 300 });
  assert.deepEqual(resizedDimensions({ width: 400, height: 300 }, "height", 50, 80), { width: 400, height: 380 });
  assert.deepEqual(resizedDimensions(DEFAULT_OUTLINER_DIMENSIONS, "both", -1000, -1000), { width: MIN_OUTLINER_WIDTH, height: MIN_OUTLINER_HEIGHT });
});
