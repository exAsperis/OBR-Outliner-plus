export interface PopoverSize {
  width: number;
  height: number;
}

const POPOVER_MARGIN = 8;
const MIN_WIDTH = 184;
const MIN_HEIGHT = 40;

export function fitPopoverToViewport(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): PopoverSize {
  const maximumWidth = Math.max(MIN_HEIGHT, Math.floor(viewportWidth - POPOVER_MARGIN * 2));
  const maximumHeight = Math.max(MIN_HEIGHT, Math.floor(viewportHeight - POPOVER_MARGIN * 2));
  return {
    width: Math.min(Math.max(MIN_WIDTH, Math.ceil(contentWidth)), maximumWidth),
    height: Math.min(Math.max(MIN_HEIGHT, Math.ceil(contentHeight)), maximumHeight),
  };
}
