import assert from "node:assert/strict";
import test from "node:test";
import { MINIMIZED_LAYOUT_METADATA_KEY } from "../src/constants.ts";
import { DEFAULT_SCENE_MINIMIZED_LAYOUT, parseSceneMinimizedLayout, sceneMinimizedLayoutFromMetadata } from "../src/sceneMinimizedLayout.ts";

test("parses independent scene-specific minimized profiles", () => {
  const value = { version: 1, dimensions: {
    horizontal: { width: 420, height: 80 },
    vertical: { width: 125, height: 375 },
  } };
  assert.deepEqual(parseSceneMinimizedLayout(value), value);
  assert.deepEqual(sceneMinimizedLayoutFromMetadata({ [MINIMIZED_LAYOUT_METADATA_KEY]: value }), value);
});

test("allows a narrow intrinsic vertical width and clamps invalid scene dimensions", () => {
  const parsed = parseSceneMinimizedLayout({ version: 1, dimensions: {
    horizontal: { width: 9000, height: 9000 },
    vertical: { width: 110, height: 1 },
  } });
  assert.deepEqual(parsed.dimensions.horizontal, { width: 800, height: 800 });
  assert.deepEqual(parsed.dimensions.vertical, { width: 110, height: 129 });
  assert.equal(parseSceneMinimizedLayout(null), DEFAULT_SCENE_MINIMIZED_LAYOUT);
});
