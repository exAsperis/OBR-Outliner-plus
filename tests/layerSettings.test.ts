import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FEATURE_SETTINGS, DEFAULT_LAYER_DISPLAY_SETTINGS, LAYER_DISPLAY_SETTINGS_KEY, parseLayerDisplaySettings, readLayerDisplaySettings, withLayersEnabled } from "../src/layerSettings.ts";

test("parses layers canonically and fills feature defaults", () => {
  const parsed = parseLayerDisplaySettings({ version: 1, enabledLayers: ["MAP", "unknown", "FOG"], features: { interaction: true } });
  assert.deepEqual(parsed.enabledLayers, ["FOG", "MAP"]);
  assert.deepEqual(parsed.features, { ...DEFAULT_FEATURE_SETTINGS, interaction: true });
});
test("falls back when stored settings are invalid", () => {
  assert.equal(parseLayerDisplaySettings(null), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(readLayerDisplaySettings({ getItem: () => "bad json" }), DEFAULT_LAYER_DISPLAY_SETTINGS);
  assert.equal(readLayerDisplaySettings({ getItem: (key) => { assert.equal(key, LAYER_DISPLAY_SETTINGS_KEY); return null; } }), DEFAULT_LAYER_DISPLAY_SETTINGS);
});
test("bulk changes preserve canonical order and unrelated layers", () => {
  const start = { ...DEFAULT_LAYER_DISPLAY_SETTINGS, enabledLayers: ["FOG", "PROP", "MAP"] as typeof DEFAULT_LAYER_DISPLAY_SETTINGS.enabledLayers };
  assert.deepEqual(withLayersEnabled(start, ["CHARACTER", "DRAWING"], true).enabledLayers, ["FOG", "CHARACTER", "PROP", "DRAWING", "MAP"]);
  assert.deepEqual(withLayersEnabled(start, ["PROP"], false).enabledLayers, ["FOG", "MAP"]);
});
