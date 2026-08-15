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
}: {
  itemId: string;
  children?: React.ReactNode;
  disabled?: boolean;
  data: SortableData;
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
  const position = activeRect && rect.current
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
        position: "relative",
        "::before": position === "before" ? indicator : undefined,
        "::after": position === "after" ? indicator : undefined,
        bgcolor: showGroupHighlight ? "action.selected" : undefined,
        outline: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </Box>
  );
}
