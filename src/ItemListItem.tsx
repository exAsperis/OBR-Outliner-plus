import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { ItemIcon } from "./ItemIcon";
import { ItemText } from "./ItemText";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibleIcon from "@mui/icons-material/VisibilityRounded";
import LockedIcon from "@mui/icons-material/LockRounded";
import UnlockIcon from "@mui/icons-material/LockOpenRounded";
import ClickableIcon from "@mui/icons-material/TouchAppRounded";
import ClickThroughIcon from "@mui/icons-material/DoNotTouchRounded";
import FogCutOnIcon from "./icons/other/FogCutOn";
import FogCutOffIcon from "./icons/other/FogCutOff";
import { useInView } from "react-intersection-observer";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useOwlbearStore } from "./useOwlbearStore";
import { memo, useState } from "react";
import useTheme from "@mui/material/styles/useTheme";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import { IconButton } from "@mui/material";
import { useItemHsaPermission } from "./useHasPermission";
import LocateIcon from "@mui/icons-material/CenterFocusStrongRounded";
import type { StackOperation } from "./stacking";
import { getItemActionVisibility } from "./itemActionVisibility";
import { SendMenuButton } from "./SendMenuButton";

const ACTION_SLOT_SIZE = 30;

function EmptyActionSlot() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: `${ACTION_SLOT_SIZE}px`,
        height: `${ACTION_SLOT_SIZE}px`,
        flex: `0 0 ${ACTION_SLOT_SIZE}px`,
        pointerEvents: "none",
      }}
    />
  );
}

export const ItemListItem = memo(function ({
  item,
  onClick,
  onDoubleClick,
  onLocate,
  onStack,
  dragging,
}: {
  item: Item;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onLocate?: () => void;
  onStack?: (itemIds: string[], operation: StackOperation) => void;
  dragging?: boolean;
}) {
  const selected = useOwlbearStore(
    (state) => state.selection?.includes(item.id) ?? false
  );
  const selection = useOwlbearStore((state) => state.selection);
  const role = useOwlbearStore((state) => state.role);

  const [ref, inView] = useInView();

  const theme = useTheme();

  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);

  const hasUpdatePermission = useItemHsaPermission(item, "UPDATE");
  const actionVisibility = getItemActionVisibility({
    selected,
    hovering,
    focusWithin,
    layerMenuOpen: sendMenuOpen,
    disableHit: item.disableHit,
    locked: item.locked,
    visible: item.visible,
    hasUpdatePermission,
    isGm: role === "GM",
  });
  const showActions = inView && actionVisibility.showActionRow;

  function stopActionEvent(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleActionClick(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void
  ) {
    stopActionEvent(event);
    action();
  }

  function handleLockClick() {
    OBR.scene.items.updateItems([item], (items) => {
      items[0].locked = !item.locked;
    });
  }

  function handleDisableHitClick() {
    OBR.scene.items.updateItems([item], (items) => {
      items[0].disableHit = !item.disableHit;
    });
  }

  function handleVisibleClick() {
    OBR.scene.items.updateItems([item], (items) => {
      items[0].visible = !item.visible;
    });
  }

  return (
    <ListItem
      disablePadding
      secondaryAction={
        showActions ? (
          <Stack
            direction="row"
            sx={{ opacity: actionVisibility.dimmed ? 0.5 : 1 }}
          >
            {actionVisibility.showGeneralActions ? <Tooltip title="Locate" disableInteractive>
              <IconButton
                aria-label="Locate"
                size="small"
                onPointerDown={stopActionEvent}
                onClick={(event) =>
                  handleActionClick(event, () => onLocate?.())
                }
              >
                <LocateIcon fontSize="small" />
              </IconButton>
            </Tooltip> : <EmptyActionSlot />}
            {actionVisibility.showGeneralActions && hasUpdatePermission ? (
              <>
                <SendMenuButton
                  itemIds={selected && selection?.length ? selection : [item.id]}
                  onStack={(operation) => onStack?.(selected && selection?.length ? selection : [item.id], operation)}
                  onOpenChange={setSendMenuOpen}
                />
              </>
            ) : <EmptyActionSlot />}
            {actionVisibility.showDisableHit ? (
              <Tooltip
                title={item.disableHit ? "Enable clicks" : "Disable clicks"}
                disableInteractive
              >
                <IconButton
                  aria-label={item.disableHit ? "Enable clicks" : "Disable clicks"}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, handleDisableHitClick)}
                >
                  {item.disableHit ? (
                    <ClickThroughIcon fontSize="small" />
                  ) : (
                    <ClickableIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />}
            {actionVisibility.showLock ? (
              <Tooltip
                title={item.locked ? "Unlock" : "Lock"}
                disableInteractive
              >
                <IconButton
                  aria-label={item.locked ? "Unlock" : "Lock"}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, handleLockClick)}
                >
                  {item.locked ? (
                    <LockedIcon fontSize="small" />
                  ) : (
                    <UnlockIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />}
            {actionVisibility.showVisibility ? (
              <Tooltip
                title={
                  item.visible
                    ? item.layer === "FOG"
                      ? "Cut"
                      : "Hide"
                    : item.layer === "FOG"
                    ? "Uncut"
                    : "Show"
                }
                disableInteractive
              >
                <IconButton
                  size="small"
                  aria-label={item.visible ? "Hide" : "Show"}
                  onPointerDown={stopActionEvent}
                  onClick={(event) =>
                    handleActionClick(event, handleVisibleClick)
                  }
                >
                  {item.visible ? (
                    item.layer === "FOG" ? (
                      <FogCutOffIcon fontSize="small" />
                    ) : (
                      <VisibleIcon fontSize="small" />
                    )
                  ) : item.layer === "FOG" ? (
                    <FogCutOnIcon fontSize="small" />
                  ) : (
                    <HiddenIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />}
          </Stack>
        ) : undefined
      }
      onPointerOver={(e) => {
        if (e.pointerType === "mouse") {
          setHovering(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") {
          setHovering(false);
        }
      }}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
      sx={{
        ".MuiListItemButton-root": {
          pr: showActions ? "172px" : undefined,
        },
      }}
    >
      <ListItemButton
        sx={{
          margin: "4px 8px",
          borderRadius: "12px",
          backgroundColor: dragging
            ? `${theme.palette.primary.main} !important`
            : undefined,
          boxShadow: dragging ? theme.shadows[5] : undefined,
          color: dragging
            ? `${theme.palette.primary.contrastText} !important`
            : selected
              ? "primary.main"
              : undefined,
          borderLeft: "3px solid",
          borderLeftColor: selected ? "primary.main" : "transparent",
          cursor: dragging ? "grabbing" : undefined,
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        selected={selected}
        dense
        ref={ref}
      >
        {inView ? (
          <>
            <ListItemIcon
              sx={{
                opacity: "0.75",
                minWidth: "28px",
                "& svg": { fontSize: "1.25rem" },
                color: "inherit",
              }}
            >
              <ItemIcon item={item} />
            </ListItemIcon>
            <ItemText item={item} />
          </>
        ) : (
          <Box height="28px" />
        )}
      </ListItemButton>
    </ListItem>
  );
});
