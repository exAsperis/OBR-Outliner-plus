import assert from "node:assert/strict";
import test from "node:test";
import { calculateStackingUpdates } from "../src/stacking.ts";
import type { StackItem, StackOperation } from "../src/stacking.ts";

function item(id: string, layer: StackItem["layer"], zIndex: number): StackItem {
  return { id, layer, zIndex };
}

function apply(
  items: StackItem[],
  targets: string[],
  operation: StackOperation
) {
  const updates = calculateStackingUpdates(items, targets, operation);
  return items
    .map((entry) => ({
      ...entry,
      zIndex: updates.get(entry.id) ?? entry.zIndex,
    }))
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

function ids(items: StackItem[]) {
  return items.map((entry) => entry.id);
}

test("moves a single item to the front and back", () => {
  const items = [item("a", "PROP", 0), item("b", "PROP", 1), item("c", "PROP", 2)];
  assert.deepEqual(ids(apply(items, ["a"], "front")), ["b", "c", "a"]);
  assert.deepEqual(ids(apply(items, ["c"], "back")), ["c", "a", "b"]);
});

test("moves forward and backward by one neighboring position", () => {
  const items = [item("a", "PROP", 0), item("b", "PROP", 1), item("c", "PROP", 2)];
  assert.deepEqual(ids(apply(items, ["b"], "forward")), ["a", "c", "b"]);
  assert.deepEqual(ids(apply(items, ["b"], "backward")), ["b", "a", "c"]);
});

test("preserves selected order for contiguous and noncontiguous selections", () => {
  const items = [
    item("a", "PROP", 0),
    item("b", "PROP", 1),
    item("c", "PROP", 2),
    item("d", "PROP", 3),
  ];
  assert.deepEqual(ids(apply(items, ["a", "c"], "forward")), ["b", "a", "d", "c"]);
  assert.deepEqual(ids(apply(items, ["b", "c"], "front")), ["a", "d", "b", "c"]);
});

test("operates independently within each layer", () => {
  const items = [
    item("p1", "PROP", 0),
    item("p2", "PROP", 1),
    item("c1", "CHARACTER", 0),
    item("c2", "CHARACTER", 1),
  ];
  const result = apply(items, ["p1", "c1"], "front");
  assert.deepEqual(ids(result.filter((entry) => entry.layer === "PROP")), ["p2", "p1"]);
  assert.deepEqual(ids(result.filter((entry) => entry.layer === "CHARACTER")), ["c2", "c1"]);
});

test("supports fractional and equal z-indices", () => {
  const fractional = [item("a", "PROP", 0.25), item("b", "PROP", 0.5), item("c", "PROP", 0.75)];
  assert.deepEqual(ids(apply(fractional, ["a"], "forward")), ["b", "a", "c"]);

  const equal = [item("a", "PROP", 1), item("b", "PROP", 1), item("c", "PROP", 1)];
  assert.deepEqual(ids(apply(equal, ["a"], "front")), ["b", "c", "a"]);
});

test("returns no updates at layer boundaries", () => {
  const items = [item("a", "PROP", 0), item("b", "PROP", 1)];
  assert.equal(calculateStackingUpdates(items, ["a"], "back").size, 0);
  assert.equal(calculateStackingUpdates(items, ["a"], "backward").size, 0);
  assert.equal(calculateStackingUpdates(items, ["b"], "front").size, 0);
  assert.equal(calculateStackingUpdates(items, ["b"], "forward").size, 0);
});
