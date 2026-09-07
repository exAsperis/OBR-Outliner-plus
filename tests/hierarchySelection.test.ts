import assert from "node:assert/strict";
import test from "node:test";
import { getVisibleSelectionRange } from "../src/hierarchySelection.ts";

const items = [
  { id: "a", layer: "PROP", group: "one" },
  { id: "x", layer: "PROP", group: "two" },
  { id: "b", layer: "PROP", group: "one" },
  { id: "c", layer: "PROP", group: "one" },
] as const;

const group = (item: (typeof items)[number]) => item.group;

test("selects only the visible items between two items in one virtual layer", () => {
  assert.deepEqual(getVisibleSelectionRange(items, "a", "c", group), ["a", "b", "c"]);
  assert.deepEqual(getVisibleSelectionRange(items, "c", "a", group), ["a", "b", "c"]);
});

test("does not extend a range across virtual or native layers", () => {
  assert.deepEqual(getVisibleSelectionRange(items, "a", "x", group), ["x"]);
  assert.deepEqual(getVisibleSelectionRange(items, "missing", "b", group), ["b"]);
});
