import assert from "node:assert/strict";
import test from "node:test";
import { getNextMenuIndex } from "../src/menuNavigation.ts";

test("moves through menu items and wraps at each end", () => {
  assert.equal(getNextMenuIndex(0, 15, "ArrowDown"), 1);
  assert.equal(getNextMenuIndex(14, 15, "ArrowDown"), 0);
  assert.equal(getNextMenuIndex(14, 15, "ArrowUp"), 13);
  assert.equal(getNextMenuIndex(0, 15, "ArrowUp"), 14);
});

test("supports Home, End, and an initially unfocused menu", () => {
  assert.equal(getNextMenuIndex(7, 15, "Home"), 0);
  assert.equal(getNextMenuIndex(7, 15, "End"), 14);
  assert.equal(getNextMenuIndex(-1, 15, "ArrowDown"), 0);
  assert.equal(getNextMenuIndex(-1, 15, "ArrowUp"), 14);
  assert.equal(getNextMenuIndex(-1, 0, "Home"), -1);
});
