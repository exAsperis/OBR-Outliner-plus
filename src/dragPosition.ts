export type DropPosition = "before" | "after";

export interface VerticalRect {
  top: number;
  height: number;
}

export function getVerticalDropPosition(active: VerticalRect, over: VerticalRect): DropPosition {
  return active.top + active.height / 2 < over.top + over.height / 2
    ? "before"
    : "after";
}
