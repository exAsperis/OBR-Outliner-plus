import { useOwlbearStore } from "./useOwlbearStore";
import { createPortal } from "react-dom";
import { DragOverlay, UniqueIdentifier } from "@dnd-kit/core";
import { ItemListItem } from "./ItemListItem";
import Badge from "@mui/material/Badge";
import { memo } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DragIndicatorIcon from "@mui/icons-material/DragIndicatorRounded";
import { resolveGroupId, UNASSIGNED_ID } from "./virtualLayers";

export const ItemDragOverlay = memo(function ({
  dragId,
}: {
  dragId: UniqueIdentifier | null;
}) {
  const items = useOwlbearStore((state) => state.items);
  const selection = useOwlbearStore((state) => state.selection);
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);

  function renderGroupOverlay(id: string) {
    const unassigned = id.startsWith("UG:");
    if (!unassigned && !id.startsWith("VL:")) return null;
    const groupId = unassigned ? UNASSIGNED_ID : id.slice(3);
    const definition = unassigned
      ? undefined
      : virtualLayers.layers.find((entry) => entry.id === groupId);
    const nativeLayer = unassigned ? id.slice(3) : definition?.obrLayer;
    if (!nativeLayer) return null;
    const count = items.filter(
      (item) => item.layer === nativeLayer && resolveGroupId(item, virtualLayers) === groupId
    ).length;
    return (
      <DragOverlay dropAnimation={null}>
        <Paper
          elevation={6}
          sx={{
            display: "flex",
            alignItems: "center",
            width: "260px",
            maxWidth: "calc(100vw - 24px)",
            minHeight: "44px",
            px: 1.5,
            borderRadius: "12px",
            color: "primary.contrastText",
            bgcolor: "primary.main",
            opacity: 0.68,
            cursor: "grabbing",
            pointerEvents: "none",
          }}
        >
          <DragIndicatorIcon sx={{ mr: 1, opacity: 0.8 }} />
          <Box minWidth={0}>
            <Typography noWrap fontWeight={500}>{definition?.name ?? "Unassigned"}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {count} item{count === 1 ? "" : "s"}
            </Typography>
          </Box>
        </Paper>
      </DragOverlay>
    );
  }

  function renderDragOverlays() {
    if (!dragId || typeof dragId !== "string") {
      return null;
    }
    const groupOverlay = renderGroupOverlay(dragId);
    if (groupOverlay) return groupOverlay;
    if (!selection) return null;
    const itemIds = items.map((item) => item.id);
    let selectedIndices = selection.map((id) => itemIds.indexOf(id));
    const activeIndex = itemIds.indexOf(dragId);
    // Sort so the dragging item is the first element
    selectedIndices = selectedIndices.sort((a, b) =>
      a === activeIndex ? -1 : b === activeIndex ? 1 : 0
    );

    // Limit shown assets to 5
    selectedIndices = selectedIndices.slice(0, 5);

    // Push each asset down and to the right
    let coords = selectedIndices.map((_, index) => ({
      x: 5 * index,
      y: 5 * index,
    }));

    // Reverse so the first element is rendered on top
    selectedIndices = selectedIndices.reverse();
    coords = coords.reverse();

    const selectedItems = selectedIndices.map((index) => items[index]);

    const overlays = selectedItems.map((item, index) => (
      <DragOverlay dropAnimation={null} key={item.id}>
        <div
          style={{
            transform: `translate(${coords[index].x}px, ${coords[index].y}px)`,
          }}
        >
          <ItemListItem item={item} dragging />
          {index === selectedIndices.length - 1 && selection.length > 1 && (
            <Badge
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                transform: "translate(-4px, 4px)",
              }}
              color="secondary"
              badgeContent={selection.length}
            />
          )}
        </div>
      </DragOverlay>
    ));

    return (
      <div
        style={{
          zIndex: 10000,
          position: "absolute",
        }}
      >
        {overlays}
      </div>
    );
  }

  return createPortal(dragId && renderDragOverlays(), document.body);
});
