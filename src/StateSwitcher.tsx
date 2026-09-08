import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import HideAllStatesIcon from "@mui/icons-material/BlockRounded";
import PreviousIcon from "@mui/icons-material/ChevronLeftRounded";
import NextIcon from "@mui/icons-material/ChevronRightRounded";
import PreviousVerticalIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import NextVerticalIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import RestoreIcon from "@mui/icons-material/OpenInFullRounded";
import { useMemo, useRef, useState } from "react";
import { isItemTransparent } from "./transparentState";
import { useOwlbearStore } from "./useOwlbearStore";
import { moveStatefulVirtualLayerState, setScopeProperty } from "./virtualLayerService";
import { resolveGroupId, statefulVirtualLayerGroups, type StatefulVirtualLayerGroup } from "./virtualLayers";
import type { MinimizedOrientation } from "./outlinerLayout";

type StatefulLayer = StatefulVirtualLayerGroup["states"][number];

function StateButton({ group, state, active, disabled, onActivate }: { group: string; state: StatefulLayer; active: boolean; disabled: boolean; onActivate: () => void }) {
  const id = `${group.toLocaleLowerCase()}\u0000${state.name.toLocaleLowerCase()}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { group, state: state.name } });
  return <Button ref={setNodeRef} {...attributes} {...listeners} size="small" color="info" variant={active ? "contained" : "outlined"} disabled={disabled} aria-pressed={active} onClick={onActivate} sx={{ minWidth: 0, maxWidth: "100%", py: 0.25, px: 1, whiteSpace: "normal", textTransform: "none", transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : undefined, cursor: isDragging ? "grabbing" : "grab" }}>
    {state.name}
  </Button>;
}

function StateGroupRow({ group, switching, activate, hideAll, onRestore, orientation }: { group: StatefulVirtualLayerGroup; switching: boolean; activate: (state: StatefulLayer) => void; hideAll: () => void; onRestore?: () => void; orientation: MinimizedOrientation }) {
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const items = useOwlbearStore((state) => state.items);
  const dragging = useRef(false);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor));
  const ids = group.states.map((state) => `${group.name.toLocaleLowerCase()}\u0000${state.name.toLocaleLowerCase()}`);
  const stateItems = group.states.map((state) => {
    const layerIds = new Set(state.layers.map((layer) => layer.id));
    return items.filter((item) => layerIds.has(resolveGroupId(item, virtualLayers)));
  });
  const activeStates = stateItems.map((items) => items.length > 0 && items.every((item) => !isItemTransparent(item)));
  const allStateItems = stateItems.flat();
  const allStatesHidden = allStateItems.length > 0 && allStateItems.every(isItemTransparent);
  const activeIndex = activeStates.findIndex(Boolean);
  const step = (direction: -1 | 1) => {
    const fallback = direction < 0 ? group.states.length - 1 : 0;
    const index = activeIndex < 0 ? fallback : (activeIndex + direction + group.states.length) % group.states.length;
    activate(group.states[index]);
  };
  const dragEnd = (event: DragEndEvent) => {
    const active = event.active.data.current as { group?: string; state?: string } | undefined;
    const over = event.over?.data.current as { state?: string } | undefined;
    if (active?.group && active.state && over?.state && active.state !== over.state) void moveStatefulVirtualLayerState(active.group, active.state, over.state);
    window.setTimeout(() => { dragging.current = false; }, 0);
  };

  const vertical = orientation === "vertical";
  return <Stack direction={vertical ? "column" : "row"} alignItems="center" spacing={0.75} sx={{ minWidth: 0, flexShrink: 0 }}>
    <Typography variant="caption" fontWeight={700} noWrap sx={{ minWidth: vertical ? 0 : 72, maxWidth: 120, textAlign: vertical ? "center" : undefined }} title={group.name}>{group.name}</Typography>
    <Tooltip title={`Hide all ${group.name} states`}><span><IconButton size="small" color={allStatesHidden ? "info" : "default"} disabled={switching} aria-label={`Hide all ${group.name} states`} aria-pressed={allStatesHidden} onClick={hideAll}><HideAllStatesIcon fontSize="small" /></IconButton></span></Tooltip>
    <Tooltip title={`Previous ${group.name} state`}><span><IconButton size="small" disabled={switching || group.states.length < 2} aria-label={`Previous ${group.name} state`} onClick={() => step(-1)}>{vertical ? <PreviousVerticalIcon fontSize="small" /> : <PreviousIcon fontSize="small" />}</IconButton></span></Tooltip>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { dragging.current = true; }} onDragCancel={() => { dragging.current = false; }} onDragEnd={dragEnd}>
      <SortableContext items={ids} strategy={vertical ? verticalListSortingStrategy : rectSortingStrategy}>
        <Stack direction={vertical ? "column" : "row"} alignItems={vertical ? "center" : undefined} sx={{ minWidth: 0, flex: vertical ? undefined : 1, flexWrap: vertical ? "nowrap" : "wrap", gap: 0.5, pb: 0.25 }}>
          {group.states.map((state, index) => {
            return <StateButton key={state.name.toLocaleLowerCase()} group={group.name} state={state} active={activeStates[index]} disabled={switching} onActivate={() => { if (!dragging.current) activate(state); }} />;
          })}
        </Stack>
      </SortableContext>
    </DndContext>
    <Tooltip title={`Next ${group.name} state`}><span><IconButton size="small" disabled={switching || group.states.length < 2} aria-label={`Next ${group.name} state`} onClick={() => step(1)}>{vertical ? <NextVerticalIcon fontSize="small" /> : <NextIcon fontSize="small" />}</IconButton></span></Tooltip>
    {onRestore && <Tooltip title="Restore Outliner"><IconButton size="small" aria-label="Restore Outliner" onClick={onRestore}><RestoreIcon fontSize="small" /></IconButton></Tooltip>}
  </Stack>;
}

export function StateSwitcher({ minimized = false, minimizedOrientation = "horizontal", onRestore }: { minimized?: boolean; minimizedOrientation?: MinimizedOrientation; onRestore?: () => void }) {
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const [switching, setSwitching] = useState(false);
  const groups = useMemo(() => statefulVirtualLayerGroups(virtualLayers), [virtualLayers]);
  if (!groups.length) return null;

  const activate = async (state: StatefulLayer) => {
    setSwitching(true);
    try {
      for (const layer of state.layers) await setScopeProperty({ kind: "group", layer: layer.obrLayer, groupId: layer.id }, "transparent", false);
    } finally {
      setSwitching(false);
    }
  };

  const hideAll = async (group: StatefulVirtualLayerGroup) => {
    setSwitching(true);
    try {
      for (const state of group.states) {
        for (const layer of state.layers) await setScopeProperty({ kind: "group", layer: layer.obrLayer, groupId: layer.id }, "transparent", true);
      }
    } finally {
      setSwitching(false);
    }
  };

  const vertical = minimized && minimizedOrientation === "vertical";
  return <Stack component="section" aria-label="Scene states" direction={vertical ? "row" : "column"} spacing={0.75} sx={{ px: 1, py: 0.75, flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", boxSizing: "border-box", width: vertical ? "max-content" : undefined, height: vertical ? "100vh" : undefined, maxHeight: minimized ? (vertical ? "100vh" : "none") : "35vh", overflowY: minimized ? (vertical ? "auto" : "visible") : "auto", overflowX: vertical ? "visible" : undefined, alignItems: vertical ? "flex-start" : undefined }}>
    {groups.map((group, index) => <StateGroupRow key={group.name.toLocaleLowerCase()} group={group} switching={switching} activate={(state) => void activate(state)} hideAll={() => void hideAll(group)} onRestore={minimized && index === 0 ? onRestore : undefined} orientation={vertical ? "vertical" : "horizontal"} />)}
  </Stack>;
}
