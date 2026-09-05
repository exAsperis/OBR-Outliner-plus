import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import PreviousIcon from "@mui/icons-material/ChevronLeftRounded";
import NextIcon from "@mui/icons-material/ChevronRightRounded";
import { useMemo, useRef, useState } from "react";
import { isItemTransparent } from "./transparentState";
import { useOwlbearStore } from "./useOwlbearStore";
import { moveStatefulVirtualLayerState, setScopeProperty } from "./virtualLayerService";
import { resolveGroupId, statefulVirtualLayerGroups, type StatefulVirtualLayerGroup } from "./virtualLayers";

type StatefulLayer = StatefulVirtualLayerGroup["states"][number];

function StateButton({ group, state, active, disabled, onActivate }: { group: string; state: StatefulLayer; active: boolean; disabled: boolean; onActivate: () => void }) {
  const id = `${group.toLocaleLowerCase()}\u0000${state.name.toLocaleLowerCase()}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { group, state: state.name } });
  return <Button ref={setNodeRef} {...attributes} {...listeners} size="small" color="info" variant={active ? "contained" : "outlined"} disabled={disabled} aria-pressed={active} onClick={onActivate} sx={{ flexShrink: 0, minWidth: 0, py: 0.25, px: 1, textTransform: "none", transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : undefined, cursor: isDragging ? "grabbing" : "grab" }}>
    {state.name}
  </Button>;
}

function StateGroupRow({ group, switching, activate }: { group: StatefulVirtualLayerGroup; switching: boolean; activate: (state: StatefulLayer) => void }) {
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const items = useOwlbearStore((state) => state.items);
  const dragging = useRef(false);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor));
  const ids = group.states.map((state) => `${group.name.toLocaleLowerCase()}\u0000${state.name.toLocaleLowerCase()}`);
  const activeStates = group.states.map((state) => {
    const layerIds = new Set(state.layers.map((layer) => layer.id));
    const stateItems = items.filter((item) => layerIds.has(resolveGroupId(item, virtualLayers)));
    return stateItems.length > 0 && stateItems.every((item) => !isItemTransparent(item));
  });
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

  return <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
    <Typography variant="caption" fontWeight={700} noWrap sx={{ minWidth: 72, maxWidth: 120 }} title={group.name}>{group.name}</Typography>
    <Tooltip title={`Previous ${group.name} state`}><span><IconButton size="small" disabled={switching || group.states.length < 2} aria-label={`Previous ${group.name} state`} onClick={() => step(-1)}><PreviousIcon fontSize="small" /></IconButton></span></Tooltip>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { dragging.current = true; }} onDragCancel={() => { dragging.current = false; }} onDragEnd={dragEnd}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, overflowX: "auto", pb: 0.25 }}>
          {group.states.map((state, index) => {
            return <StateButton key={state.name.toLocaleLowerCase()} group={group.name} state={state} active={activeStates[index]} disabled={switching} onActivate={() => { if (!dragging.current) activate(state); }} />;
          })}
        </Stack>
      </SortableContext>
    </DndContext>
    <Tooltip title={`Next ${group.name} state`}><span><IconButton size="small" disabled={switching || group.states.length < 2} aria-label={`Next ${group.name} state`} onClick={() => step(1)}><NextIcon fontSize="small" /></IconButton></span></Tooltip>
  </Stack>;
}

export function StateSwitcher() {
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

  return <Stack component="section" aria-label="Scene states" spacing={0.75} sx={{ px: 1, py: 0.75, flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", maxHeight: "35vh", overflowY: "auto" }}>
    {groups.map((group) => <StateGroupRow key={group.name.toLocaleLowerCase()} group={group} switching={switching} activate={(state) => void activate(state)} />)}
  </Stack>;
}
