import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OUTLINER_LAYOUT_SETTINGS, MAX_OUTLINER_HEIGHT, MAX_OUTLINER_WIDTH, MIN_FULL_HEIGHT, MIN_OUTLINER_WIDTH, OUTLINER_LAYOUT_SETTINGS_KEY, parseOutlinerLayoutSettings, readOutlinerLayoutSettings, resizedDimensions } from "../src/outlinerLayout.ts";

test("parses independent full and minimized layout profiles", () => {
  const parsed = parseOutlinerLayoutSettings({ version: 1, mode: "minimized", full: { width: 500, height: 600 }, minimized: { width: 320, height: 75 } });
  assert.deepEqual(parsed, { version: 1, mode: "minimized", full: { width: 500, height: 600 }, minimized: { width: 320, height: 75 } });
});

test("clamps persisted layout dimensions", () => {
  const parsed = parseOutlinerLayoutSettings({ version: 1, mode: "full", full: { width: 1, height: 1 }, minimized: { width: 9000, height: 9000 } });
  assert.deepEqual(parsed?.full, { width: MIN_OUTLINER_WIDTH, height: MIN_FULL_HEIGHT });
  assert.deepEqual(parsed?.minimized, { width: MAX_OUTLINER_WIDTH, height: MAX_OUTLINER_HEIGHT });
});

test("rejects malformed layout settings and handles unavailable storage", () => {
  assert.equal(parseOutlinerLayoutSettings({ version: 2 }), undefined);
  assert.equal(parseOutlinerLayoutSettings({ version: 1, mode: "wide", full: {}, minimized: {} }), undefined);
  assert.equal(readOutlinerLayoutSettings({ getItem: (key) => { assert.equal(key, OUTLINER_LAYOUT_SETTINGS_KEY); return "not json"; } }), undefined);
  assert.equal(readOutlinerLayoutSettings({ getItem: () => { throw new Error("blocked"); } }), undefined);
});

test("resize axes change only their enabled dimensions", () => {
  const start = { width: 400, height: 300 };
  assert.deepEqual(resizedDimensions(start, "width", 50, 80), { width: 450, height: 300 });
  assert.deepEqual(resizedDimensions(start, "height", 50, 80), { width: 400, height: 380 });
  assert.deepEqual(resizedDimensions(start, "both", 50, 80), { width: 450, height: 380 });
  assert.deepEqual(resizedDimensions(DEFAULT_OUTLINER_LAYOUT_SETTINGS.full, "both", -1000, 1000), { width: MIN_OUTLINER_WIDTH, height: MAX_OUTLINER_HEIGHT });
});
