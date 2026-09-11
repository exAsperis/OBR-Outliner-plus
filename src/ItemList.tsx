import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibleIcon from "@mui/icons-material/VisibilityRounded";
import LockedIcon from "@mui/icons-material/LockRounded";
import UnlockIcon from "@mui/icons-material/LockOpenRounded";
import ClickableIcon from "@mui/icons-material/TouchAppRounded";
import ClickThroughIcon from "@mui/icons-material/DoNotTouchRounded";
import FogCutOnIcon from "./icons/other/FogCutOn";
import FogCutOffIcon from "./icons/other/FogCutOff";
import VirtualLayerIcon from "./icons/other/VirtualLayer";
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
import { UNASSIGNED_ID, resolveGroupId, type StatefulProperty, type VirtualLayerDefinition } from "./virtualLayers";
import type { DropPosition } from "./dragPosition";
import { SendMenuButton } from "./SendMenuButton";
import { getLayerPropertyState } from "./layerPropertyState";
import { OverflowTooltipText } from "./OverflowTooltipText";
import { useLayerDisplaySettings } from "./layerSettings";
import { captureAggregateState, getGroupInheritance, getItemRule, getNativeRule, hasInstructions, inheritanceVisualState, itemState } from "./stateInheritance";
import { InheritanceStateIcon } from "./InheritanceStateIcon";
import { InheritanceMenu } from "./InheritanceMenu";
import { setScopeProperty, type RuleScope } from "./virtualLayerService";

const NATIVE_LAYER_HEADER_HEIGHT = 40;
const TOTAL_ROW_HEIGHT = 40;

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
    <ListItemButton dense onClick={() => setOpen(!open)} divider aria-expanded={open} sx={{ position: "sticky", top: TOTAL_ROW_HEIGHT, zIndex: 4, minHeight: `${NATIVE_LAYER_HEADER_HEIGHT}px`, bgcolor: "background.paper", color: selected ? "primary.main" : undefined, borderLeft: "3px solid", borderLeftColor: selected ? "primary.main" : "transparent" }}>
      <ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: "28px", "& svg": { fontSize: "1.25rem" } }}><LayerIcon layer={layer} /></ListItemIcon>
      <ListItemText primary={<OverflowTooltipText text={layerHeading} />} sx={{ minWidth: 0 }} />
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
    <ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: 28, "& svg": { fontSize: 16 } }}><VirtualLayerIcon aria-label="Virtual layer" /></ListItemIcon>
    <ListItemText primary={<OverflowTooltipText text={groupHeading} />} sx={{ minWidth: 0 }} primaryTypographyProps={{ fontStyle: "italic" }} />
    {role === "GM" && <Stack direction="row" alignItems="center" flexShrink={0}>
      {!unassigned && <><Tooltip title="Edit"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onRename(definition); }}><EditIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(definition); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip></>}
      <SendMenuButton itemIds={items.map((item) => item.id)} allowStackWhenEmpty onStack={(operation) => onGroupStack(definition.obrLayer, definition.id, operation)} confirmLayerMove={definition.name} />
      <LayerPropertyControls items={items} scope={{ kind: "group", layer: definition.obrLayer, groupId: definition.id }} fog={definition.obrLayer === "FOG"} />
    </Stack>}
  </ListItemButton>;
  return <>
    <SortableItem itemId={unassigned ? `UG:${definition.obrLayer}` : `VL:${definition.id}`} disabled={searching} data={{ kind: "group", nativeLayer: definition.obrLayer, groupId: definition.id }} stickyTop={TOTAL_ROW_HEIGHT + NATIVE_LAYER_HEADER_HEIGHT} indicatorPosition={groupDropPosition}>{row}</SortableItem>
    <Collapse in={open}><List component="div" dense><SortableItem itemId={`START:${definition.obrLayer}:${definition.id}`} disabled={searching} data={{ kind: "start", nativeLayer: definition.obrLayer, groupId: definition.id }} />{renderItems(items)}</List></Collapse>
  </>;
}

function LayerPropertyControls({ items, scope, fog = false }: { items: Item[]; scope: RuleScope; fog?: boolean }) {
  const state = useOwlbearStore((store) => store.virtualLayers); const features = useLayerDisplaySettings().features; const [inheritanceAnchor, setInheritanceAnchor] = useState<HTMLElement | null>(null);
  const parentRule = scope.kind === "group" ? getNativeRule(state, scope.layer) : {};
  const config = scope.kind === "group" ? getGroupInheritance(state, scope.layer, scope.groupId) : undefined;
  const localRule = scope.kind === "native" ? getNativeRule(state, scope.layer) : config?.mode === "independent" ? config.enforce : {};
  const effectiveRule = scope.kind === "group" && config?.mode === "pass-through" ? parentRule : localRule;
  const eligible = items.filter((item) => !getItemRule(item) && (scope.kind === "group" || getGroupInheritance(state, item.layer, resolveGroupId(item, state)).mode === "pass-through"));
  const aggregate = getLayerPropertyState(eligible.map(itemState)); const displayed = { ...captureAggregateState(eligible), ...effectiveRule };
  const independent = config?.mode === "independent"; const inheritanceState = inheritanceVisualState(scope.kind === "native" ? "native" : "virtual", hasInstructions(effectiveRule), independent);
  const isReceived = (property: StatefulProperty) => scope.kind === "group" && config?.mode === "pass-through" && Object.prototype.hasOwnProperty.call(parentRule, property);
  const isEnforced = (property: StatefulProperty) => Object.prototype.hasOwnProperty.call(effectiveRule, property);
  const disabled = (property: StatefulProperty) => isReceived(property) || (!isEnforced(property) && !eligible.length);
  const color = (property: StatefulProperty, mixed: boolean) => isEnforced(property) ? "warning" : mixed ? "info" : "default";
  const disabledSx = (property: StatefulProperty) => isReceived(property) ? { "&.Mui-disabled": { color: "warning.main" } } : undefined;
  const visibilityAction = fog ? displayed.visible ? "Cut all" : "Uncut all" : displayed.visible ? "Hide all" : "Show all";
  return <>
    {features.manageInheritance && <><Tooltip title="Configure inheritance"><IconButton size="small" aria-label="Configure inheritance" color={inheritanceState === "enabled" ? "warning" : inheritanceState === "disabled" ? "default" : "error"} onClick={(event) => { event.stopPropagation(); setInheritanceAnchor(event.currentTarget); }}><InheritanceStateIcon state={inheritanceState} fontSize="small" /></IconButton></Tooltip><InheritanceMenu anchorEl={inheritanceAnchor} scope={scope} config={config} enforce={localRule} displayed={displayed} features={features} onClose={() => setInheritanceAnchor(null)} /></>}
    {features.interaction && <Tooltip title={displayed.disableHit ? "Enable clicks for all" : "Disable clicks for all"}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" aria-label={displayed.disableHit ? "Enable clicks for all" : "Disable clicks for all"} color={color("disableHit", aggregate.mixedDisableHit)} disabled={disabled("disableHit")} sx={disabledSx("disableHit")} onClick={(event) => { event.stopPropagation(); void setScopeProperty(scope, "disableHit", !displayed.disableHit); }}>{displayed.disableHit ? <ClickThroughIcon fontSize="small" /> : <ClickableIcon fontSize="small" />}</IconButton></Box></Tooltip>}
    {features.locked && <Tooltip title={displayed.locked ? "Unlock all" : "Lock all"}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" color={color("locked", aggregate.mixedLocked)} disabled={disabled("locked")} sx={disabledSx("locked")} onClick={(event) => { event.stopPropagation(); void setScopeProperty(scope, "locked", !displayed.locked); }}>{displayed.locked ? <LockedIcon fontSize="small" /> : <UnlockIcon fontSize="small" />}</IconButton></Box></Tooltip>}
    {features.visible && <Tooltip title={visibilityAction}><Box component="span" sx={{ display: "inline-flex" }}><IconButton size="small" color={color("visible", aggregate.mixedVisible)} disabled={disabled("visible")} sx={disabledSx("visible")} onClick={(event) => { event.stopPropagation(); void setScopeProperty(scope, "visible", !displayed.visible); }}>{fog ? displayed.visible ? <FogCutOffIcon fontSize="small" /> : <FogCutOnIcon fontSize="small" /> : displayed.visible ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}</IconButton></Box></Tooltip>}
  </>;
}
