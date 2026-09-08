import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OUTLINER_LAYOUT_SETTINGS, MAX_OUTLINER_HEIGHT, MIN_FULL_HEIGHT, MIN_OUTLINER_WIDTH, OUTLINER_LAYOUT_SETTINGS_KEY, parseOutlinerLayoutSettings, readOutlinerLayoutSettings, resizedDimensions } from "../src/outlinerLayout.ts";

test("migrates version-1 layouts to horizontal minimized mode", () => {
  const parsed = parseOutlinerLayoutSettings({ version: 1, mode: "minimized", full: { width: 500, height: 600 }, minimized: { width: 320, height: 75 } });
  assert.deepEqual(parsed, { version: 3, mode: "minimized", minimizedOrientation: "horizontal", full: { width: 500, height: 600 } });
});

test("migrates version-2 orientation while moving minimized profiles to scene metadata", () => {
  const value = { version: 2, mode: "minimized", minimizedOrientation: "vertical", full: { width: 500, height: 600 }, minimized: {
    horizontal: { width: 420, height: 80 },
    vertical: { width: 510, height: 375 },
  } };
  assert.deepEqual(parseOutlinerLayoutSettings(value), { version: 3, mode: "minimized", minimizedOrientation: "vertical", full: { width: 500, height: 600 } });
});

test("clamps persisted layout dimensions", () => {
  const parsed = parseOutlinerLayoutSettings({ version: 3, mode: "full", minimizedOrientation: "vertical", full: { width: 1, height: 1 } });
  assert.deepEqual(parsed?.full, { width: MIN_OUTLINER_WIDTH, height: MIN_FULL_HEIGHT });
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
