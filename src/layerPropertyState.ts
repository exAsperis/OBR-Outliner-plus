export interface LayerPropertyItem {
  disableHit?: boolean;
  locked: boolean;
  visible: boolean;
}

export interface LayerPropertyState {
  hasItems: boolean;
  allDisableHit: boolean;
  allLocked: boolean;
  allVisible: boolean;
  mixedDisableHit: boolean;
  mixedLocked: boolean;
  mixedVisible: boolean;
}

export function getLayerPropertyState(items: LayerPropertyItem[]): LayerPropertyState {
  const hasItems = items.length > 0;
  const allDisableHit = hasItems && items.every((item) => item.disableHit === true);
  const allLocked = hasItems && items.every((item) => item.locked);
  const allVisible = hasItems && items.every((item) => item.visible);
  return {
    hasItems,
    allDisableHit,
    allLocked,
    allVisible,
    mixedDisableHit: items.some((item) => item.disableHit === true) && !allDisableHit,
    mixedLocked: items.some((item) => item.locked) && !allLocked,
    mixedVisible: items.some((item) => item.visible) && !allVisible,
  };
}
