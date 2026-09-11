import assert from "node:assert/strict";
import test from "node:test";
import { formatZIndexRange } from "../src/zIndexRange.ts";

test("formats virtual-layer z-index bounds from lowest to highest", () => {
  assert.equal(formatZIndexRange([12, -2, 4.5]), "z-index -2 – 12");
  assert.equal(formatZIndexRange([7]), "z-index 7 – 7");
});

test("formats an empty virtual layer without inventing bounds", () => {
  assert.equal(formatZIndexRange([]), "z-index —");
});
