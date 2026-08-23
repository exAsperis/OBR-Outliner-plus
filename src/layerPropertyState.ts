export interface LayerPropertyItem {
  locked: boolean;
  visible: boolean;
}

export interface LayerPropertyState {
  hasItems: boolean;
  allLocked: boolean;
  allVisible: boolean;
  mixedLocked: boolean;
  mixedVisible: boolean;
}

export function getLayerPropertyState(items: LayerPropertyItem[]): LayerPropertyState {
  const hasItems = items.length > 0;
  const allLocked = hasItems && items.every((item) => item.locked);
  const allVisible = hasItems && items.every((item) => item.visible);
  return {
    hasItems,
    allLocked,
    allVisible,
    mixedLocked: items.some((item) => item.locked) && !allLocked,
    mixedVisible: items.some((item) => item.visible) && !allVisible,
  };
}
