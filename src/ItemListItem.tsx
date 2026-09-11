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
import { getItemParentRule, getItemRule, hasInstructions, inheritanceVisualState } from "./stateInheritance";
import { InheritanceStateIcon } from "./InheritanceStateIcon";
import { toggleItemInheritance } from "./virtualLayerService";
import { useLayerDisplaySettings } from "./layerSettings";
import type { StatefulProperty } from "./virtualLayers";

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
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const features = useLayerDisplaySettings().features;
  const independent = Boolean(getItemRule(item));
  const parentRule = getItemParentRule(item, virtualLayers);
  const displayed = independent ? item : { ...item, ...parentRule };
  const isInherited = (property: StatefulProperty) => !independent && Object.prototype.hasOwnProperty.call(parentRule, property);

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
    disableHit: displayed.disableHit,
    locked: displayed.locked,
    visible: displayed.visible,
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
      items[0].locked = !displayed.locked;
    });
  }

  function handleDisableHitClick() {
    OBR.scene.items.updateItems([item], (items) => {
      items[0].disableHit = !displayed.disableHit;
    });
  }

  function handleVisibleClick() {
    OBR.scene.items.updateItems([item], (items) => {
      items[0].visible = !displayed.visible;
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
            {features.manageInheritance && <Tooltip title={independent ? "Allow inheritance" : "Block inheritance"} disableInteractive><IconButton aria-label={independent ? "Allow inheritance" : "Block inheritance"} color={independent ? "error" : hasInstructions(parentRule) ? "warning" : "default"} size="small" onPointerDown={stopActionEvent} onClick={(event) => handleActionClick(event, () => { void toggleItemInheritance(item); })}><InheritanceStateIcon state={inheritanceVisualState("item", hasInstructions(parentRule), independent)} fontSize="small" /></IconButton></Tooltip>}
            {features.interaction && (actionVisibility.showDisableHit ? (
              <Tooltip
                title={displayed.disableHit ? "Enable clicks" : "Disable clicks"}
                disableInteractive
              >
                <IconButton
                  aria-label={displayed.disableHit ? "Enable clicks" : "Disable clicks"}
                  disabled={isInherited("disableHit")}
                  color={isInherited("disableHit") ? "warning" : "default"}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, handleDisableHitClick)}
                >
                  {displayed.disableHit ? (
                    <ClickThroughIcon fontSize="small" />
                  ) : (
                    <ClickableIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />)}
            {features.locked && (actionVisibility.showLock ? (
              <Tooltip
                title={displayed.locked ? "Unlock" : "Lock"}
                disableInteractive
              >
                <IconButton
                  aria-label={displayed.locked ? "Unlock" : "Lock"}
                  disabled={isInherited("locked")}
                  color={isInherited("locked") ? "warning" : "default"}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, handleLockClick)}
                >
                  {displayed.locked ? (
                    <LockedIcon fontSize="small" />
                  ) : (
                    <UnlockIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />)}
            {features.visible && (actionVisibility.showVisibility ? (
              <Tooltip
                title={
                  displayed.visible
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
                  aria-label={displayed.visible ? "Hide" : "Show"}
                  disabled={isInherited("visible")}
                  color={isInherited("visible") ? "warning" : "default"}
                  onPointerDown={stopActionEvent}
                  onClick={(event) =>
                    handleActionClick(event, handleVisibleClick)
                  }
                >
                  {displayed.visible ? (
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
            ) : <EmptyActionSlot />)}
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
          pr: showActions ? `${60 + (features.manageInheritance ? 30 : 0) + (features.interaction ? 30 : 0) + (features.locked ? 30 : 0) + (features.visible ? 30 : 0)}px` : undefined,
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
