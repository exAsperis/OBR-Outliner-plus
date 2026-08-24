import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LAYER_DISPLAY_SETTINGS,
  DEFAULT_FEATURE_SETTINGS,
  LAYER_DISPLAY_SETTINGS_KEY,
  parseLayerDisplaySettings,
  readLayerDisplaySettings,
} from "../src/layerSettings.ts";

test("parses enabled layers in canonical order and removes unknown values", () => {
  assert.deepEqual(parseLayerDisplaySettings({
    version: 1,
    enabledLayers: ["MAP", "unknown", "POPOVER", "MAP", "POST_PROCESS"],
  }).enabledLayers, ["POPOVER", "POST_PROCESS", "MAP"]);
  assert.deepEqual(parseLayerDisplaySettings({ version: 1, enabledLayers: [] }).enabledLayers, []);
});

test("uses feature defaults for old settings and parses explicit feature choices", () => {
  assert.equal(parseLayerDisplaySettings({ version: 1, enabledLayers: ["MAP"] }).features, DEFAULT_FEATURE_SETTINGS);
  assert.deepEqual(parseLayerDisplaySettings({
    version: 1,
    enabledLayers: ["MAP"],
    features: { manageInheritance: false, transparency: true, interaction: true, locked: false, visible: false },
  }).features, { manageInheritance: false, transparency: true, interaction: true, locked: false, visible: false });
});

test("uses current defaults for malformed, missing, or unreadable settings", () => {
  assert.equal(parseLayerDisplaySettings(null), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(parseLayerDisplaySettings({ version: 2, enabledLayers: ["MAP"] }), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(readLayerDisplaySettings({ getItem: () => null }), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(readLayerDisplaySettings({ getItem: () => "not json" }), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(readLayerDisplaySettings({ getItem: () => { throw new Error("blocked"); } }), DEFAULT_LAYER_DISPLAY_SETTINGS);
});

test("loads persisted settings from the namespaced local-storage key", () => {
  const storage = { getItem(key: string) {
    assert.equal(key, LAYER_DISPLAY_SETTINGS_KEY);
    return JSON.stringify({ version: 1, enabledLayers: ["GRID", "MAP"] });
  } };
  assert.deepEqual(readLayerDisplaySettings(storage).enabledLayers, ["GRID", "MAP"]);
});
