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
import { getItemActionReservedSlots, getItemActionVisibility } from "./itemActionVisibility";
import { SendMenuButton } from "./SendMenuButton";
import { getEffectiveItemRule, getItemParentRule, getItemRule, itemInheritanceLabel, inheritanceVisualState, type StatefulProperty } from "./stateInheritance";
import { setItemInheritedProperty, toggleItemInheritance } from "./virtualLayerService";
import { InheritanceStateIcon } from "./InheritanceStateIcon";

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
  const localRule = getItemRule(item);
  const parentRule = getItemParentRule(item, virtualLayers);
  const effectiveRule = getEffectiveItemRule(item, virtualLayers);
  const inheritedOnly = Boolean(parentRule && !localRule);

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
    inheritanceActive: Boolean(effectiveRule),
    disableHit: item.disableHit,
    locked: item.locked,
    visible: item.visible,
    hasUpdatePermission,
    isGm: role === "GM",
  });
  const showActions = inView && actionVisibility.showActionRow;
  const reservedActionSlots = getItemActionReservedSlots(actionVisibility, hasUpdatePermission);

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

  function handlePropertyClick(property: StatefulProperty) {
    const current = effectiveRule?.[property] ?? (property === "disableHit" ? item.disableHit === true : item[property]);
    if (localRule) void setItemInheritedProperty(item, property, !current);
    else if (!inheritedOnly) void OBR.scene.items.updateItems([item], (items) => { items[0][property] = !current; });
  }

  const inheritanceState = inheritanceVisualState("item", Boolean(localRule), Boolean(parentRule));
  const inheritanceColor = inheritanceState === "enabled" ? "warning" : inheritanceState === "disabled" ? "default" : "error";
  const inheritanceActionLabel = itemInheritanceLabel(Boolean(localRule), Boolean(parentRule));
  const stateColor = (property: StatefulProperty) => localRule && parentRule && localRule[property] !== parentRule[property] ? "error" : effectiveRule ? "warning" : "default";
  const disabledInheritedSx = inheritedOnly ? { "&.Mui-disabled": { color: "warning.main" } } : undefined;
  const displayed = effectiveRule ?? { disableHit: item.disableHit === true, locked: item.locked, visible: item.visible };

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
            {actionVisibility.showInheritance ? (
              <Tooltip title={inheritanceActionLabel} disableInteractive>
                <IconButton
                  aria-label={inheritanceActionLabel}
                  color={inheritanceColor}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, () => { void toggleItemInheritance(item); })}
                >
                  <InheritanceStateIcon state={inheritanceState} fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />}
            {actionVisibility.showDisableHit ? (
              <Tooltip
                title={displayed.disableHit ? "Enable clicks" : "Disable clicks"}
                disableInteractive
              >
                <IconButton
                  aria-label={displayed.disableHit ? "Enable clicks" : "Disable clicks"}
                  color={stateColor("disableHit")}
                  disabled={inheritedOnly}
                  sx={disabledInheritedSx}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, () => handlePropertyClick("disableHit"))}
                >
                  {displayed.disableHit ? (
                    <ClickThroughIcon fontSize="small" />
                  ) : (
                    <ClickableIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : <EmptyActionSlot />}
            {actionVisibility.showLock ? (
              <Tooltip
                title={displayed.locked ? "Unlock" : "Lock"}
                disableInteractive
              >
                <IconButton
                  aria-label={displayed.locked ? "Unlock" : "Lock"}
                  color={stateColor("locked")}
                  disabled={inheritedOnly}
                  sx={disabledInheritedSx}
                  size="small"
                  onPointerDown={stopActionEvent}
                  onClick={(event) => handleActionClick(event, () => handlePropertyClick("locked"))}
                >
                  {displayed.locked ? (
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
                  color={stateColor("visible")}
                  disabled={inheritedOnly}
                  sx={disabledInheritedSx}
                  onPointerDown={stopActionEvent}
                  onClick={(event) =>
                    handleActionClick(event, () => handlePropertyClick("visible"))
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
          pr: showActions ? `${reservedActionSlots * ACTION_SLOT_SIZE + 22}px` : undefined,
        },
      }}
    >
      <ListItemButton
        sx={{
          margin: "4px 8px",
          borderRadius: "12px",
          backgroundColor: dragging
            ? `${theme.palette.primary.main} !important`
            : "background.default",
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
