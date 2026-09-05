import assert from "node:assert/strict";
import test from "node:test";
import type { Item } from "@owlbear-rodeo/sdk";
import { activateTransparency, getTransparentState, isItemTransparent, needsTransparencyEnforcement, parseTransparentState, restoreTransparency, TRANSPARENT_SCALE } from "../src/transparentState.ts";

function item(): Item {
  return { id: "item", scale: { x: 2.5, y: -3 }, visible: false, disableHit: false, locked: false, metadata: {} } as Item;
}

function labeledImage(): Item {
  return {
    ...item(),
    type: "IMAGE",
    textItemType: "LABEL",
    text: { style: { fillOpacity: 0.65, strokeOpacity: 0.35 } },
  } as Item;
}

test("captures and restores scale without changing visibility or clickability", () => {
  const target = item();
  activateTransparency(target, "direct");
  assert.deepEqual(target.scale, { x: TRANSPARENT_SCALE, y: TRANSPARENT_SCALE });
  assert.equal(target.visible, false);
  assert.equal(target.disableHit, false);
  assert.equal(isItemTransparent(target), true);
  assert.deepEqual(getTransparentState(target), { scale: { x: 2.5, y: -3 }, source: "direct" });
  target.visible = true;
  target.disableHit = true;
  assert.equal(restoreTransparency(target), true);
  assert.deepEqual(target.scale, { x: 2.5, y: -3 });
  assert.equal(target.visible, true);
  assert.equal(target.disableHit, true);
  assert.equal(isItemTransparent(target), false);
});

test("repeated activation preserves the first captured values while updating provenance", () => {
  const target = item();
  activateTransparency(target, "direct");
  activateTransparency(target, "inherited");
  assert.deepEqual(getTransparentState(target), { scale: { x: 2.5, y: -3 }, source: "inherited" });
});

test("ignores malformed metadata without inventing restoration values", () => {
  assert.equal(parseTransparentState({ scale: { x: 1 }, visible: true, disableHit: false, source: "direct" }), undefined);
  const target = item();
  target.metadata["com.ex-asperis.outliner/transparentState"] = { broken: true };
  assert.equal(restoreTransparency(target), false);
  assert.deepEqual(target.scale, { x: 2.5, y: -3 });
});

test("hides image labels and restores their exact opacity", () => {
  const target = labeledImage() as Item & { text: { style: { fillOpacity: number; strokeOpacity: number } } };
  activateTransparency(target, "direct");
  assert.deepEqual(target.text.style, { fillOpacity: 0, strokeOpacity: 0 });
  assert.deepEqual(getTransparentState(target)?.label, { fillOpacity: 0.65, strokeOpacity: 0.35 });
  assert.equal(needsTransparencyEnforcement(target), false);

  target.text.style.fillOpacity = 0.2;
  assert.equal(needsTransparencyEnforcement(target), true);
  activateTransparency(target, "direct");
  assert.deepEqual(getTransparentState(target)?.label, { fillOpacity: 0.65, strokeOpacity: 0.35 });
  assert.deepEqual(target.text.style, { fillOpacity: 0, strokeOpacity: 0 });

  restoreTransparency(target);
  assert.deepEqual(target.text.style, { fillOpacity: 0.65, strokeOpacity: 0.35 });
});

test("upgrades existing transparency metadata by capturing the live label style", () => {
  const target = labeledImage() as Item & { text: { style: { fillOpacity: number; strokeOpacity: number } } };
  target.metadata["com.ex-asperis.outliner/transparentState"] = {
    scale: { x: 1, y: 1 }, visible: true, disableHit: false, source: "direct",
  };
  target.scale = { x: 0, y: 0 };
  target.visible = false;
  target.disableHit = true;
  assert.equal(needsTransparencyEnforcement(target), true);
  activateTransparency(target, "direct");
  assert.equal(target.visible, true);
  assert.equal(target.disableHit, false);
  assert.deepEqual(getTransparentState(target), {
    scale: { x: 1, y: 1 }, source: "direct", label: { fillOpacity: 0.65, strokeOpacity: 0.35 },
  });
  assert.deepEqual(getTransparentState(target)?.label, { fillOpacity: 0.65, strokeOpacity: 0.35 });
  assert.deepEqual(target.text.style, { fillOpacity: 0, strokeOpacity: 0 });
});

test("leaves non-image items and image overlay text unchanged", () => {
  const nonImage = item();
  activateTransparency(nonImage, "direct");
  assert.equal(getTransparentState(nonImage)?.label, undefined);

  const overlay = labeledImage() as Item & { textItemType: string; text: { style: { fillOpacity: number; strokeOpacity: number } } };
  overlay.textItemType = "TEXT";
  activateTransparency(overlay, "direct");
  assert.deepEqual(overlay.text.style, { fillOpacity: 0.65, strokeOpacity: 0.35 });
  assert.equal(getTransparentState(overlay)?.label, undefined);
});

test("keeps legacy metadata valid when optional label state is malformed", () => {
  assert.deepEqual(parseTransparentState({
    scale: { x: 1, y: 1 }, visible: true, disableHit: false, source: "direct", label: { fillOpacity: "bad" },
  }), { scale: { x: 1, y: 1 }, visible: true, disableHit: false, source: "direct" });
});

test("accepts current scale-only metadata", () => {
  assert.deepEqual(parseTransparentState({ scale: { x: 1, y: 1 }, source: "direct" }), {
    scale: { x: 1, y: 1 }, source: "direct",
  });
});

test("transparency keeps attachment transforms invertible across repeated restores", () => {
  const target = item();
  const originalScale = { ...target.scale };
  for (let cycle = 0; cycle < 3; cycle++) {
    activateTransparency(target, "inherited");
    assert.ok(target.scale.x > 0 && target.scale.x < 0.01);
    assert.ok(target.scale.y > 0 && target.scale.y < 0.01);
    assert.ok(Number.isFinite(1 / (target.scale.x * target.scale.y)));
    assert.equal(needsTransparencyEnforcement(target), false);
    restoreTransparency(target);
    assert.deepEqual(target.scale, originalScale);
  }
});

test("migrates zero-scale transparency without losing the original scale", () => {
  const target = item();
  activateTransparency(target, "direct");
  target.scale = { x: 0, y: 0 };
  assert.equal(needsTransparencyEnforcement(target), true);
  activateTransparency(target, "direct");
  assert.equal(needsTransparencyEnforcement(target), false);
  restoreTransparency(target);
  assert.deepEqual(target.scale, { x: 2.5, y: -3 });
});
