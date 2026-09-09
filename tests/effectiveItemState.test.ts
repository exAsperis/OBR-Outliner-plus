import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "@owlbear-rodeo/sdk";
import { applyEffectiveItemState } from "../src/effectiveItemState.ts";
import { getStoredLocalItemState, updateShadowedLocalItemProperty } from "../src/localItemState.ts";
import { getItemVisible, isItemTransparent } from "../src/transparentState.ts";

function item(): Item {
  return {
    id: "item", layer: "PROP", zIndex: 0, scale: { x: 2, y: 3 },
    visible: false, locked: false, disableHit: false, metadata: {},
  } as Item;
}

function finishRestore(target: Item, result: ReturnType<typeof applyEffectiveItemState>) {
  if (result.restored && result.reactivate) target.visible = true;
}

test("shadows only overridden values and restores them when each override ends", () => {
  const target = item();
  applyEffectiveItemState(target, { visible: true, locked: true, disableHit: true, transparent: true });
  assert.equal(target.visible, false);
  assert.equal(target.locked, true);
  assert.equal(target.disableHit, true);
  assert.equal(isItemTransparent(target), true);
  assert.deepEqual(getStoredLocalItemState(target)?.values, {
    transparent: false, disableHit: false, locked: false, visible: false,
  });

  applyEffectiveItemState(target, { locked: true, transparent: true });
  assert.equal(getItemVisible(target), false);
  assert.deepEqual(getStoredLocalItemState(target)?.values, { transparent: false, locked: false });

  const restored = applyEffectiveItemState(target, {});
  finishRestore(target, restored);
  assert.equal(isItemTransparent(target), false);
  assert.deepEqual(target.scale, { x: 2, y: 3 });
  assert.equal(target.visible, false);
  assert.equal(target.locked, false);
  assert.equal(target.disableHit, false);
  assert.equal(getStoredLocalItemState(target), undefined);
});

test("competing suppression keeps the original local state until every override ends", () => {
  const target = item();
  target.visible = true;
  applyEffectiveItemState(target, { transparent: true });
  applyEffectiveItemState(target, { transparent: true });
  assert.equal(isItemTransparent(target), true);
  assert.deepEqual(getStoredLocalItemState(target)?.values, { transparent: false });
  const restored = applyEffectiveItemState(target, {});
  finishRestore(target, restored);
  assert.equal(isItemTransparent(target), false);
  assert.equal(target.visible, true);
});

test("local edits made through Outliner update the shadow while an override is active", () => {
  const target = item();
  applyEffectiveItemState(target, { visible: true });
  assert.equal(updateShadowedLocalItemProperty(target, "visible", true), true);
  target.visible = false;
  applyEffectiveItemState(target, { visible: true });
  assert.equal(target.visible, true);
  applyEffectiveItemState(target, {});
  assert.equal(target.visible, true);
  assert.equal(getStoredLocalItemState(target), undefined);
});

test("ordinary external values remain untouched when no override or shadow exists", () => {
  const target = item();
  target.metadata["com.ex-asperis.outliner/localState"] = { version: 1, values: { locked: false } };
  target.locked = true;
  target.disableHit = true;
  target.visible = true;
  applyEffectiveItemState(target, {});
  assert.equal(target.locked, true);
  assert.equal(target.disableHit, true);
  assert.equal(target.visible, true);
  assert.equal(getStoredLocalItemState(target), undefined);
});
