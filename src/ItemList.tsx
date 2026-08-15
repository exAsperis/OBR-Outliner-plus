import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibleIcon from "@mui/icons-material/VisibilityRounded";
import LockedIcon from "@mui/icons-material/LockRounded";
import UnlockIcon from "@mui/icons-material/LockOpenRounded";
import Collapse from "@mui/material/Collapse";
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
import { UNASSIGNED_ID, type VirtualLayerDefinition } from "./virtualLayers";

interface Props {
  layer: Item["layer"];
  items: Item[];
  definitions: VirtualLayerDefinition[];
  groupOrder: string[];
  role: "GM" | "PLAYER";
  searching: boolean;
  onCreate: () => void;
  onRename: (definition: VirtualLayerDefinition) => void;
  onDelete: (definition: VirtualLayerDefinition) => void;
  onGroupProperty: (ids: string[], property: "visible" | "locked", value: boolean) => void;
  resolveGroup: (item: Item) => string;
  onItemSelect: (item: Item, event: React.MouseEvent<HTMLDivElement>) => void;
  onItemFocus: (item: Item) => void;
  onItemLocate: (item: Item) => void;
  onItemStack: (item: Item, operation: StackOperation) => void;
}

export function ItemList(props: Props) {
  const [open, setOpen] = useState(false);
  const { layer, definitions, items, groupOrder } = props;
  const layerName = `${capitalize(layer)}${layer !== "FOG" && layer !== "TEXT" ? "s" : ""}`;
  const renderItems = (groupItems: Item[]) => groupItems.map((item) => (
    <SortableItem key={item.id} itemId={item.id} disabled={props.searching} data={{ kind: "item", nativeLayer: item.layer, groupId: props.resolveGroup(item) }}>
      <ItemListItem item={item} onClick={(event) => props.onItemSelect(item, event)}
        onDoubleClick={() => props.onItemFocus(item)} onLocate={() => props.onItemLocate(item)}
        onStack={(operation) => props.onItemStack(item, operation)} />
    </SortableItem>
  ));
  return <>
    <ListItemButton dense onClick={() => setOpen(!open)} divider>
      <ListItemIcon sx={{ color: "text.secondary", minWidth: "28px", "& svg": { fontSize: "1.25rem" } }}><LayerIcon layer={layer} /></ListItemIcon>
      <ListItemText primary={layerName} />
      {props.role === "GM" && !props.searching && <Tooltip title="Create virtual layer" placement="left" disableInteractive><IconButton size="small" aria-label={`Create virtual layer in ${layerName}`} onClick={(event) => { event.stopPropagation(); props.onCreate(); }}><AddIcon fontSize="small" /></IconButton></Tooltip>}
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton>
    <Collapse in={open} unmountOnExit><List component="div" dense>
      {definitions.length === 0 ? <><SortableItem itemId={`START:${layer}:${UNASSIGNED_ID}`} disabled={props.searching} data={{ kind: "start", nativeLayer: layer, groupId: UNASSIGNED_ID }} />{renderItems(items)}</> : <>
        {groupOrder.map((groupId) => {
          const definition = groupId === UNASSIGNED_ID
            ? { id: UNASSIGNED_ID, name: "Unassigned", obrLayer: layer, order: groupOrder.indexOf(groupId) }
            : definitions.find((entry) => entry.id === groupId);
          return definition ? <Group key={groupId} {...props} definition={definition} items={items.filter((item) => props.resolveGroup(item) === groupId)} renderItems={renderItems} /> : null;
        })}
      </>}
    </List></Collapse>
  </>;
}

function Group({ definition, items, role, searching, onRename, onDelete, onGroupProperty, renderItems }: Props & { definition: VirtualLayerDefinition; renderItems: (items: Item[]) => React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const unassigned = definition.id === UNASSIGNED_ID;
  const allVisible = items.length > 0 && items.every((item) => item.visible);
  const allLocked = items.length > 0 && items.every((item) => item.locked);
  const mixedVisible = items.some((item) => item.visible) && !allVisible;
  const mixedLocked = items.some((item) => item.locked) && !allLocked;
  const row = <ListItemButton dense onClick={() => setOpen(!open)} sx={{ pl: 3, bgcolor: "action.hover" }}>
    {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}<ListItemText primary={definition.name} secondary={`${items.length} item${items.length === 1 ? "" : "s"}`} />
    {role === "GM" && <Stack direction="row">
      <Tooltip title={allVisible ? "Hide all" : "Show all"}><IconButton size="small" color={mixedVisible ? "warning" : "default"} disabled={!items.length} onClick={(event) => { event.stopPropagation(); onGroupProperty(items.map((item) => item.id), "visible", !allVisible); }}>{allVisible ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}</IconButton></Tooltip>
      <Tooltip title={allLocked ? "Unlock all" : "Lock all"}><IconButton size="small" color={mixedLocked ? "warning" : "default"} disabled={!items.length} onClick={(event) => { event.stopPropagation(); onGroupProperty(items.map((item) => item.id), "locked", !allLocked); }}>{allLocked ? <LockedIcon fontSize="small" /> : <UnlockIcon fontSize="small" />}</IconButton></Tooltip>
      {!unassigned && <><Tooltip title="Rename"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onRename(definition); }}><EditIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(definition); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip></>}
    </Stack>}
  </ListItemButton>;
  return <>
    <SortableItem itemId={unassigned ? `UG:${definition.obrLayer}` : `VL:${definition.id}`} disabled={searching} data={{ kind: "group", nativeLayer: definition.obrLayer, groupId: definition.id }}>{row}</SortableItem>
    <Collapse in={open}><List component="div" dense sx={{ pl: 2 }}><SortableItem itemId={`START:${definition.obrLayer}:${definition.id}`} disabled={searching} data={{ kind: "start", nativeLayer: definition.obrLayer, groupId: definition.id }} />{renderItems(items)}</List></Collapse>
  </>;
}
