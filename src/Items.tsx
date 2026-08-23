import { DndContext, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import OBR, { buildShape, type BoundingBox, type Item, Math2, type Vector2, isShape } from "@owlbear-rodeo/sdk";
import Fuse from "fuse.js";
import { useMemo, useRef, useState } from "react";
import { ItemDragOverlay } from "./ItemDragOverlay";
import { ItemList } from "./ItemList";
import { isTextable, toPlainText } from "./helpers";
import { stackItems } from "./stackItems";
import type { StackOperation } from "./stacking";
import { useOwlbearStore } from "./useOwlbearStore";
import { UNASSIGNED_ID, orderedGroupIds, resolveGroupId, type VirtualLayerDefinition } from "./virtualLayers";
import { addVirtualLayer, assignItems, moveStackingGroup, removeVirtualLayer, stackVirtualLayer, updateVirtualLayerName } from "./virtualLayerService";
import { getVerticalDropPosition, getVerticalDropPositionAtPoint, type DropPosition } from "./dragPosition";
import { getOutlinerLayers } from "./layers";

export function Items({ search }: { search: string }) {
  const items = useOwlbearStore((state) => state.items);
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const role = useOwlbearStore((state) => state.role);
  const selection = useOwlbearStore((state) => state.selection);
  const searching = Boolean(search);
  const availableLayers = useMemo(() => new Set(getOutlinerLayers(role)), [role]);
  const fuse = useMemo(() => new Fuse(items.map((item) => ({ id: item.id, name: item.name, layer: item.layer, type: item.type, text: isTextable(item) ? `${item.text.plainText} ${toPlainText(item.text.richText)}` : "", shape: isShape(item) ? item.shapeType : "" })), { keys: ["id", "name", "layer", "type", "text", "shape"], threshold: 0.25 }), [items]);
  const filtered = useMemo(() => search ? items.filter((item) => new Set(fuse.search(search).map((result) => result.item.id)).has(item.id)) : items, [fuse, items, search]);
  const shown = useMemo(() => filtered.filter((item) => availableLayers.has(item.layer) && !(!item.visible && role === "PLAYER")).sort((a, b) => b.zIndex - a.zIndex || a.id.localeCompare(b.id)), [availableLayers, filtered, role]);
  const shownIds = shown.map((item) => item.id);
  const [dragId, setDragId] = useState<string | null>(null);
  const [groupDropPosition, setGroupDropPosition] = useState<DropPosition | undefined>();
  const dragPointerClientY = useRef<number | undefined>();
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 3 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor));

  const collisionDetection: CollisionDetection = (args) => {
    dragPointerClientY.current = args.pointerCoordinates?.y;
    const activeData = args.active.data.current as { kind?: string; nativeLayer?: string } | undefined;
    if (activeData?.kind !== "group") return closestCenter(args);
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => {
        const data = container.data.current as { kind?: string; nativeLayer?: string } | undefined;
        return container.id !== args.active.id && data?.kind === "group" && data.nativeLayer === activeData.nativeLayer;
      }),
    });
  };

  async function select(item: Item, event: React.MouseEvent<HTMLDivElement>) {
    const current = selection ?? [];
    let next: string[];
    if (event.metaKey || event.ctrlKey) next = current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id];
    else if (event.shiftKey && current.length) {
      const a = shownIds.indexOf(current[current.length - 1]); const b = shownIds.indexOf(item.id);
      next = [...new Set([...current, ...shownIds.slice(Math.min(a, b), Math.max(a, b) + 1)])];
    } else next = [item.id];
    if (next.length) await OBR.player.select(next); else await OBR.player.deselect();
  }

  async function recenterToBounds(bounds: BoundingBox) {
    const center = await OBR.viewport.transformPoint(bounds.center);
    const viewportCenter: Vector2 = { x: (await OBR.viewport.getWidth()) / 2, y: (await OBR.viewport.getHeight()) / 2 };
    const scale = await OBR.viewport.getScale();
    const position = Math2.multiply(await OBR.viewport.inverseTransformPoint(Math2.subtract(center, viewportCenter)), -scale);
    await OBR.viewport.animateTo({ scale, position });
  }

  async function recenter(ids: string[]) {
    await recenterToBounds(await OBR.scene.items.getItemBounds(ids));
  }

  async function locate(item: Item) {
    const bounds = await OBR.scene.items.getItemBounds([item.id]);
    const highlight = buildShape()
      .name("Locate highlight")
      .position(bounds.min)
      .width(bounds.width)
      .height(bounds.height)
      .shapeType("RECTANGLE")
      .fillColor("#ff0080")
      .fillOpacity(1)
      .strokeOpacity(0)
      .layer("POPOVER")
      .disableAutoZIndex(true)
      .disableHit(true)
      .build();

    await Promise.all([
      recenterToBounds(bounds),
      OBR.scene.local.addItems([highlight]),
    ]);

    const startedAt = performance.now();
    try {
      let opacity = 1;
      while (opacity > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        opacity = Math.max(0, 1 - (performance.now() - startedAt) / 3000);
        await OBR.scene.local.updateItems(
          (candidate): candidate is typeof highlight => candidate.id === highlight.id && isShape(candidate),
          (items) => {
            items[0].style.fillOpacity = opacity;
          },
        );
      }
    } finally {
      await OBR.scene.local.deleteItems([highlight.id]);
    }
  }

  function promptCreate(layer: Item["layer"]) { const name = window.prompt("Virtual layer name"); if (name !== null) void addVirtualLayer(layer, name).catch((error: Error) => window.alert(error.message)); }
  function promptRename(definition: VirtualLayerDefinition) { const name = window.prompt("Rename virtual layer", definition.name); if (name !== null) void updateVirtualLayerName(definition.id, name).catch((error: Error) => window.alert(error.message)); }
  function confirmDelete(definition: VirtualLayerDefinition) { if (window.confirm(`Delete virtual layer "${definition.name}"?\nIts objects will become Unassigned. No objects will be deleted.`)) void removeVirtualLayer(definition.id).catch(() => window.alert("Unable to delete the virtual layer.")); }

  function dropPositionForEvent(event: DragMoveEvent | DragEndEvent): DropPosition {
    const pointerY = dragPointerClientY.current;
    if (pointerY !== undefined && event.over) return getVerticalDropPositionAtPoint(pointerY, event.over.rect);
    const translated = event.active.rect.current.translated ?? event.active.rect.current.initial;
    return translated && event.over ? getVerticalDropPosition(translated, event.over.rect) : "before";
  }

  function dragStart(event: DragStartEvent) {
    if (typeof event.active.id !== "string") return;
    dragPointerClientY.current = undefined;
    setDragId(event.active.id);
    setGroupDropPosition(undefined);
    if (!event.active.id.includes(":" ) && (!selection?.includes(event.active.id))) void OBR.player.select([event.active.id]);
  }

  function dragMove(event: DragMoveEvent) {
    if (typeof event.active.id === "string" && (event.active.id.startsWith("VL:") || event.active.id.startsWith("UG:")) && event.over) {
      setGroupDropPosition(dropPositionForEvent(event));
    }
  }

  function clearDrag() {
    dragPointerClientY.current = undefined;
    setDragId(null);
    setGroupDropPosition(undefined);
  }

  function dragEnd(event: DragEndEvent) {
    const finalDropPosition = dropPositionForEvent(event);
    clearDrag(); if (searching || typeof event.active.id !== "string" || typeof event.over?.id !== "string") return;
    const active = event.active.id, over = event.over.id;
    const dropPosition = finalDropPosition;
    if (active.startsWith("VL:") || active.startsWith("UG:")) {
      if (role !== "GM") return;
      const unassigned = active.startsWith("UG:");
      const id = unassigned ? UNASSIGNED_ID : active.slice(3);
      const definition = unassigned ? undefined : virtualLayers.layers.find((entry) => entry.id === id);
      const nativeLayer = unassigned ? active.slice(3) as Item["layer"] : definition?.obrLayer;
      if (!nativeLayer) return;
      const overId = over.startsWith("VL:") ? over.slice(3) : over.startsWith("UG:") && over.slice(3) === nativeLayer ? UNASSIGNED_ID : undefined;
      if (!overId || overId === id) return;
      const withoutActive = orderedGroupIds(virtualLayers, nativeLayer).filter((groupId) => groupId !== id);
      const overIndex = withoutActive.indexOf(overId);
      if (overIndex >= 0) void moveStackingGroup(nativeLayer, id, overIndex + (dropPosition === "after" ? 1 : 0)); return;
    }
    if (role !== "GM") return;
    const ids = selection?.includes(active) ? selection : [active]; const activeItem = items.find((item) => item.id === active); if (!activeItem) return;
    if (ids.some((id) => items.find((item) => item.id === id)?.layer !== activeItem.layer)) return;
    let destination: string | undefined; let nativeLayer = activeItem.layer; let targetId: string | undefined;
    if (over.startsWith("START:")) { const [, layer, group] = over.split(":"); nativeLayer = layer as Item["layer"]; destination = group === UNASSIGNED_ID ? undefined : group; }
    else if (over.startsWith("VL:")) destination = over.slice(3);
    else if (over.startsWith("UG:")) destination = undefined;
    else { const item = items.find((entry) => entry.id === over); if (!item) return; nativeLayer = item.layer; destination = resolveGroupId(item, virtualLayers); if (destination === UNASSIGNED_ID) destination = undefined; targetId = item.id; }
    const definition = destination ? virtualLayers.layers.find((entry) => entry.id === destination) : undefined;
    if (definition && definition.obrLayer !== activeItem.layer) return;
    if (nativeLayer !== activeItem.layer) return;
    void assignItems(ids, destination, nativeLayer, targetId, dropPosition);
  }

  const shownLayers = useMemo(() => {
    const base = getOutlinerLayers(role);
    return searching ? base.filter((layer) => shown.some((item) => item.layer === layer)) : base;
  }, [role, searching, shown]);
  const sortableIds = [...shownIds, ...virtualLayers.layers.map((entry) => `VL:${entry.id}`), ...shownLayers.map((layer) => `UG:${layer}`)];
  return <DndContext onDragStart={dragStart} onDragMove={dragMove} onDragEnd={dragEnd} onDragCancel={clearDrag} collisionDetection={collisionDetection} sensors={sensors}>
    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      {shownLayers.map((layer) => <ItemList key={layer} layer={layer} role={role} searching={searching} items={shown.filter((item) => item.layer === layer)} nativeItems={items.filter((item) => item.layer === layer)} definitions={virtualLayers.layers.filter((entry) => entry.obrLayer === layer)} groupOrder={orderedGroupIds(virtualLayers, layer)} groupDropPosition={groupDropPosition} resolveGroup={(item) => resolveGroupId(item, virtualLayers)} onCreate={() => promptCreate(layer)} onRename={promptRename} onDelete={confirmDelete} onItemSelect={select} onItemFocus={(item) => void recenter([...new Set([...(selection ?? []), item.id])])} onItemLocate={(item) => void locate(item)} onItemStack={(ids, operation: StackOperation) => void stackItems(items, ids, operation)} onGroupStack={(nativeLayer, id, operation) => void stackVirtualLayer(nativeLayer, id, operation)} />)}
      <ItemDragOverlay dragId={dragId} />
    </SortableContext>
  </DndContext>;
}
