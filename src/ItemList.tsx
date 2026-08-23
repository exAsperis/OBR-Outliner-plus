import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibleIcon from "@mui/icons-material/VisibilityRounded";
import LockedIcon from "@mui/icons-material/LockRounded";
import UnlockIcon from "@mui/icons-material/LockOpenRounded";
import ClickableIcon from "@mui/icons-material/TouchAppRounded";
import ClickThroughIcon from "@mui/icons-material/DoNotTouchRounded";
import InheritanceIcon from "@mui/icons-material/AccountTreeRounded";
import FogCutOnIcon from "./icons/other/FogCutOn";
import FogCutOffIcon from "./icons/other/FogCutOff";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { Item } from "@owlbear-rodeo/sdk";
import { useState } from "react";
import { ItemListItem } from "./ItemListItem";
import { LayerIcon } from "./LayerIcon";
import { SortableItem } from "./SortableItem";
import { capitalize } from "./helpers";
import type { StackOperation } from "./stacking";
import { useOwlbearStore } from "./useOwlbearStore";
import { resolveGroupId, UNASSIGNED_ID, type VirtualLayerDefinition } from "./virtualLayers";
import type { DropPosition } from "./dragPosition";
import { SendMenuButton } from "./SendMenuButton";
import { getLayerPropertyState } from "./layerPropertyState";
import { captureAggregateState, getGroupRule, getItemRule, getNativeRule, inheritanceLabel, type StatefulProperty } from "./stateInheritance";
import { setGroupProperty, setScopeInheritedProperty, toggleScopeInheritance, type RuleScope } from "./virtualLayerService";

const NATIVE_LAYER_HEADER_HEIGHT = 40;

interface Props {
  layer: Item["layer"];
  items: Item[];
  nativeItems: Item[];
  definitions: VirtualLayerDefinition[];
  groupOrder: string[];
  groupDropPosition?: DropPosition;
  role: "GM" | "PLAYER";
  searching: boolean;
  onCreate: () => void;
  onRename: (definition: VirtualLayerDefinition) => void;
  onDelete: (definition: VirtualLayerDefinition) => void;
  resolveGroup: (item: Item) => string;
  onItemSelect: (item: Item, event: React.MouseEvent<HTMLDivElement>) => void;
  onItemFocus: (item: Item) => void;
  onItemLocate: (item: Item) => void;
  onItemStack: (ids: string[], operation: StackOperation) => void;
  onGroupStack: (layer: Item["layer"], id: string, operation: StackOperation) => void;
}

export function ItemList(props: Props) {
  const [open, setOpen] = useState(false);
  const { layer, definitions, items, nativeItems, groupOrder } = props;
  const selected = useOwlbearStore((state) => items.some((item) => state.selection?.includes(item.id)));
  const layerName = `${capitalize(layer)}${layer !== "FOG" && layer !== "TEXT" ? "s" : ""}`;
  const layerHeading = `${layerName} [${items.length}]`;
  const renderItems = (groupItems: Item[]) => groupItems.map((item) => (
    <SortableItem key={item.id} itemId={item.id} disabled={props.searching} data={{ kind: "item", nativeLayer: item.layer, groupId: props.resolveGroup(item) }}>
      <ItemListItem item={item} onClick={(event) => props.onItemSelect(item, event)}
        onDoubleClick={() => props.onItemFocus(item)} onLocate={() => props.onItemLocate(item)}
        onStack={props.onItemStack} />
    </SortableItem>
  ));
  return <Box component="section" sx={{ position: "relative" }}>
    <ListItemButton dense onClick={() => setOpen(!open)} divider aria-expanded={open} sx={{ position: "sticky", top: 0, zIndex: 3, minHeight: `${NATIVE_LAYER_HEADER_HEIGHT}px`, bgcolor: "background.paper", color: selected ? "primary.main" : undefined, borderLeft: "3px solid", borderLeftColor: selected ? "primary.main" : "transparent" }}>
      <ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: "28px", "& svg": { fontSize: "1.25rem" } }}><LayerIcon layer={layer} /></ListItemIcon>
      <ListItemText primary={layerHeading} sx={{ minWidth: 0 }} primaryTypographyProps={{ noWrap: true }} />
      {props.role === "GM" && <Stack direction="row" alignItems="center" flexShrink={0}>
        {!props.searching && <Tooltip title="Create virtual layer" placement="left" disableInteractive><IconButton size="small" aria-label={`Create virtual layer in ${layerName}`} onClick={(event) => { event.stopPropagation(); props.onCreate(); }}><AddIcon fontSize="small" /></IconButton></Tooltip>}
        <LayerPropertyControls items={nativeItems} scope={{ kind: "native", layer }} fog={layer === "FOG"} />
      </Stack>}
    </ListItemButton>
    <Collapse in={open} unmountOnExit><List component="div" dense disablePadding>
      {definitions.length === 0 ? <><SortableItem itemId={`START:${layer}:${UNASSIGNED_ID}`} disabled={props.searching} data={{ kind: "start", nativeLayer: layer, groupId: UNASSIGNED_ID }} />{renderItems(items)}</> : <>
        {groupOrder.map((groupId) => {
          const definition = groupId === UNASSIGNED_ID
            ? { id: UNASSIGNED_ID, name: "Unassigned", obrLayer: layer, order: groupOrder.indexOf(groupId) }
            : definitions.find((entry) => entry.id === groupId);
          return definition ? <Group key={groupId} {...props} definition={definition} items={items.filter((item) => props.resolveGroup(item) === groupId)} renderItems={renderItems} /> : null;
        })}
      </>}
    </List></Collapse>
  </Box>;
}

function Group({ definition, items, role, searching, groupDropPosition, onRename, onDelete, onGroupStack, renderItems }: Props & { definition: VirtualLayerDefinition; renderItems: (items: Item[]) => React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const selected = useOwlbearStore((state) => items.some((item) => state.selection?.includes(item.id)));
  const unassigned = definition.id === UNASSIGNED_ID;
  const groupHeading = `${definition.name} [${items.length}]`;
  const row = <ListItemButton dense onClick={() => setOpen(!open)} aria-expanded={open} sx={{ pl: 3, height: `${NATIVE_LAYER_HEADER_HEIGHT}px`, bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" }, color: selected ? "primary.main" : undefined, borderLeft: "3px solid", borderLeftColor: selected ? "primary.main" : "transparent" }}>
    <ListItemText primary={groupHeading} sx={{ minWidth: 0 }} primaryTypographyProps={{ noWrap: true, fontStyle: "italic" }} />
    {role === "GM" && <Stack direction="row" alignItems="center" flexShrink={0}>
      {!unassigned && <><Tooltip title="Edit"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onRename(definition); }}><EditIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(definition); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip></>}
      <SendMenuButton itemIds={items.map((item) => item.id)} allowStackWhenEmpty onStack={(operation) => onGroupStack(definition.obrLayer, definition.id, operation)} confirmLayerMove={definition.name} />
      <LayerPropertyControls items={items} scope={{ kind: "group", layer: definition.obrLayer, groupId: definition.id }} fog={definition.obrLayer === "FOG"} />
    </Stack>}
  </ListItemButton>;
  return <>
    <SortableItem itemId={unassigned ? `UG:${definition.obrLayer}` : `VL:${definition.id}`} disabled={searching} data={{ kind: "group", nativeLayer: definition.obrLayer, groupId: definition.id }} stickyTop={NATIVE_LAYER_HEADER_HEIGHT} indicatorPosition={groupDropPosition}>{row}</SortableItem>
    <Collapse in={open}><List component="div" dense><SortableItem itemId={`START:${definition.obrLayer}:${definition.id}`} disabled={searching} data={{ kind: "start", nativeLayer: definition.obrLayer, groupId: definition.id }} />{renderItems(items)}</List></Collapse>
  </>;
}

function LayerPropertyControls({ items, scope, fog = false }: { items: Item[]; scope: RuleScope; fog?: boolean }) {
  const state = useOwlbearStore((store) => store.virtualLayers);
  const localRule = scope.kind === "native" ? getNativeRule(state, scope.layer) : getGroupRule(state, scope.layer, scope.groupId);
  const parentRule = scope.kind === "group" ? getNativeRule(state, scope.layer) : undefined;
  const effectiveRule = localRule ?? parentRule;
  const inheritedOnly = Boolean(parentRule && !localRule);
  const eligible = items.filter((item) => {
    if (getItemRule(item)) return false;
    return scope.kind === "group" || !getGroupRule(state, item.layer, resolveGroupId(item, state));
  });
  const aggregate = getLayerPropertyState(eligible);
  const { mixedDisableHit, mixedLocked, mixedVisible } = aggregate;
  const displayed = effectiveRule ?? captureAggregateState(eligible);
  const hasTargets = Boolean(effectiveRule) || eligible.length > 0;
  const visibilityAction = fog
    ? displayed.visible ? "Cut all" : "Uncut all"
    : displayed.visible ? "Hide all" : "Show all";
  const inheritanceColor = localRule && parentRule ? "error" : effectiveRule ? "warning" : "default";
  const stateColor = (property: StatefulProperty, mixed: boolean) => localRule && parentRule && localRule[property] !== parentRule[property]
    ? "error" : effectiveRule ? "warning" : mixed ? "info" : "default";
  const disabled = inheritedOnly || !hasTargets;
  const disabledSx = inheritedOnly ? { "&.Mui-disabled": { color: "warning.main" } } : undefined;
  const setProperty = (property: StatefulProperty, value: boolean) => localRule
    ? setScopeInheritedProperty(scope, property, value)
    : setGroupProperty(eligible.map((item) => item.id), property, value);
  return <>
    <Tooltip title={inheritanceLabel(Boolean(localRule), Boolean(parentRule))}><IconButton size="small" aria-label={inheritanceLabel(Boolean(localRule), Boolean(parentRule))} color={inheritanceColor} onClick={(event) => { event.stopPropagation(); void toggleScopeInheritance(scope, parentRule ?? captureAggregateState(eligible)); }}><InheritanceIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title={displayed.disableHit ? "Enable clicks for all" : "Disable clicks for all"}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" aria-label={displayed.disableHit ? "Enable clicks for all" : "Disable clicks for all"} color={stateColor("disableHit", mixedDisableHit)} disabled={disabled} sx={disabledSx} onClick={(event) => { event.stopPropagation(); void setProperty("disableHit", !displayed.disableHit); }}>{displayed.disableHit ? <ClickThroughIcon fontSize="small" /> : <ClickableIcon fontSize="small" />}</IconButton></Box></Tooltip>
    <Tooltip title={displayed.locked ? "Unlock all" : "Lock all"}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" color={stateColor("locked", mixedLocked)} disabled={disabled} sx={disabledSx} onClick={(event) => { event.stopPropagation(); void setProperty("locked", !displayed.locked); }}>{displayed.locked ? <LockedIcon fontSize="small" /> : <UnlockIcon fontSize="small" />}</IconButton></Box></Tooltip>
    <Tooltip title={visibilityAction}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" color={stateColor("visible", mixedVisible)} disabled={disabled} sx={disabledSx} onClick={(event) => { event.stopPropagation(); void setProperty("visible", !displayed.visible); }}>{fog ? displayed.visible ? <FogCutOffIcon fontSize="small" /> : <FogCutOnIcon fontSize="small" /> : displayed.visible ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}</IconButton></Box></Tooltip>
  </>;
}
