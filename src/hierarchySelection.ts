import type { Item } from "@owlbear-rodeo/sdk";

type HierarchyItem = Pick<Item, "id" | "layer">;

export function getVisibleSelectionRange<T extends HierarchyItem>(
  visibleItems: T[],
  anchorId: string,
  targetId: string,
  resolveGroup: (item: T) => string,
): string[] {
  const anchor = visibleItems.find((item) => item.id === anchorId);
  const target = visibleItems.find((item) => item.id === targetId);
  if (!anchor || !target) return [targetId];

  const targetGroup = resolveGroup(target);
  if (anchor.layer !== target.layer || resolveGroup(anchor) !== targetGroup) return [targetId];

  const groupItems = visibleItems.filter(
    (item) => item.layer === target.layer && resolveGroup(item) === targetGroup,
  );
  const anchorIndex = groupItems.findIndex((item) => item.id === anchorId);
  const targetIndex = groupItems.findIndex((item) => item.id === targetId);
  return groupItems
    .slice(Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1)
    .map((item) => item.id);
}
