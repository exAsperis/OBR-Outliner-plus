import assert from "node:assert/strict";
import test from "node:test";
import { getVerticalDropPosition } from "../src/dragPosition.ts";

test("uses an above indicator and insertion when dragged over the upper half", () => {
  assert.equal(
    getVerticalDropPosition({ top: 90, height: 10 }, { top: 100, height: 40 }),
    "before"
  );
});

test("uses a below indicator and insertion when dragged over the lower half", () => {
  assert.equal(
    getVerticalDropPosition({ top: 130, height: 10 }, { top: 100, height: 40 }),
    "after"
  );
});

test("treats the exact midpoint as below", () => {
  assert.equal(
    getVerticalDropPosition({ top: 115, height: 10 }, { top: 100, height: 40 }),
    "after"
  );
});
