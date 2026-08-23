import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import Box from "@mui/material/Box";
import { getVerticalDropPosition } from "./dragPosition";

export interface SortableData {
  kind: "item" | "group" | "start";
  nativeLayer: string;
  groupId?: string;
}

export function SortableItem({
  itemId,
  children,
  disabled = false,
  data,
  stickyTop,
  indicatorPosition,
}: {
  itemId: string;
  children?: React.ReactNode;
  disabled?: boolean;
  data: SortableData;
  stickyTop?: number;
  indicatorPosition?: "before" | "after";
}) {
  const { active, attributes, listeners, setNodeRef, isDragging, isOver, rect } = useSortable(
    { id: itemId, disabled, data }
  );
  const activeData = active?.data.current as SortableData | undefined;
  const compatible = activeData?.nativeLayer === data.nativeLayer && (
    (activeData.kind === "group" && data.kind === "group") ||
    (activeData.kind === "item" && (data.kind === "item" || data.kind === "group" || data.kind === "start"))
  );
  const activeRect = active?.rect.current.translated ?? active?.rect.current.initial;
  const position = activeData?.kind === "group" && data.kind === "group" && indicatorPosition
    ? indicatorPosition
    : activeRect && rect.current
    ? getVerticalDropPosition(activeRect, rect.current)
    : "before";
  const showLine = isOver && !isDragging && compatible && data.kind !== "group" ||
    isOver && !isDragging && compatible && activeData?.kind === "group";
  const showGroupHighlight = isOver && !isDragging && compatible && activeData?.kind === "item" && data.kind === "group";
  const indicator = showLine ? {
    content: "''",
    position: "absolute" as const,
    [position === "before" ? "top" : "bottom"]: 0,
    left: "16px",
    right: "16px",
    height: "2px",
    backgroundColor: "primary.main",
    zIndex: 2,
  } : undefined;

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: stickyTop === undefined ? "relative" : "sticky",
        top: stickyTop,
        zIndex: stickyTop === undefined ? undefined : 2,
        "::before": position === "before" ? indicator : undefined,
        "::after": position === "after" ? indicator : undefined,
        bgcolor: showGroupHighlight
          ? "action.selected"
          : stickyTop === undefined
            ? undefined
            : "background.paper",
        opacity: isDragging && data.kind === "group" ? 0.45 : undefined,
        outline: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </Box>
  );
}
