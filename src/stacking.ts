import type { Item } from "@owlbear-rodeo/sdk";

export type StackOperation = "front" | "forward" | "backward" | "back";

export type StackItem = Pick<Item, "id" | "layer" | "zIndex">;

const compareItems = (a: StackItem, b: StackItem) =>
  a.zIndex - b.zIndex || a.id.localeCompare(b.id);

function reorderLayer(
  items: StackItem[],
  selectedIds: Set<string>,
  operation: StackOperation
) {
  const ordered = [...items].sort(compareItems);
  const selected = ordered.filter((item) => selectedIds.has(item.id));
  const unselected = ordered.filter((item) => !selectedIds.has(item.id));

  if (operation === "front") {
    return [...unselected, ...selected];
  }
  if (operation === "back") {
    return [...selected, ...unselected];
  }

  const result = [...ordered];
  if (operation === "forward") {
    for (let index = result.length - 2; index >= 0; index--) {
      if (
        selectedIds.has(result[index].id) &&
        !selectedIds.has(result[index + 1].id)
      ) {
        [result[index], result[index + 1]] = [
          result[index + 1],
          result[index],
        ];
      }
    }
  } else {
    for (let index = 1; index < result.length; index++) {
      if (
        selectedIds.has(result[index].id) &&
        !selectedIds.has(result[index - 1].id)
      ) {
        [result[index], result[index - 1]] = [
          result[index - 1],
          result[index],
        ];
      }
    }
  }
  return result;
}

function valuesBetween(
  count: number,
  lower: number | undefined,
  upper: number | undefined,
  direction: "up" | "down"
) {
  if (lower === undefined && upper === undefined) {
    return Array.from({ length: count }, (_, index) => index);
  }
  if (lower === undefined) {
    return Array.from({ length: count }, (_, index) =>
      (upper as number) - (count - index)
    );
  }
  if (upper === undefined) {
    return Array.from({ length: count }, (_, index) => lower + index + 1);
  }
  if (upper > lower) {
    const interval = (upper - lower) / (count + 1);
    return Array.from(
      { length: count },
      (_, index) => lower + interval * (index + 1)
    );
  }

  // Equal z-indices have no numeric space between them. Move just beyond the
  // boundary in the requested direction so the result is deterministic.
  const delta = Math.max(1, Math.abs(lower) * Number.EPSILON * 4);
  if (direction === "up") {
    return Array.from(
      { length: count },
      (_, index) => lower + delta * (index + 1)
    );
  }
  return Array.from(
    { length: count },
    (_, index) => upper - delta * (count - index)
  );
}

export function calculateStackingUpdates(
  items: StackItem[],
  targetIds: Iterable<string>,
  operation: StackOperation
) {
  const selectedIds = new Set(targetIds);
  const updates = new Map<string, number>();
  const layers = new Map<Item["layer"], StackItem[]>();

  for (const item of items) {
    const layerItems = layers.get(item.layer) ?? [];
    layerItems.push(item);
    layers.set(item.layer, layerItems);
  }

  for (const layerItems of layers.values()) {
    if (!layerItems.some((item) => selectedIds.has(item.id))) {
      continue;
    }

    const original = [...layerItems].sort(compareItems);
    const reordered = reorderLayer(original, selectedIds, operation);
    if (reordered.every((item, index) => item.id === original[index].id)) {
      continue;
    }

    let index = 0;
    while (index < reordered.length) {
      if (!selectedIds.has(reordered[index].id)) {
        index++;
        continue;
      }

      const start = index;
      while (
        index < reordered.length &&
        selectedIds.has(reordered[index].id)
      ) {
        index++;
      }
      const lower = start > 0 ? reordered[start - 1].zIndex : undefined;
      const upper =
        index < reordered.length ? reordered[index].zIndex : undefined;
      const values = valuesBetween(
        index - start,
        lower,
        upper,
        operation === "front" || operation === "forward" ? "up" : "down"
      );

      for (let offset = 0; offset < values.length; offset++) {
        const item = reordered[start + offset];
        if (item.zIndex !== values[offset]) {
          updates.set(item.id, values[offset]);
        }
      }
    }
  }

  return updates;
}

