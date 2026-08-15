import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import OBR, { Item, Math2, Vector2, isShape } from "@owlbear-rodeo/sdk";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { ItemDragOverlay } from "./ItemDragOverlay";
import { ItemList } from "./ItemList";
import { isTextable, lerp, toPlainText } from "./helpers";
import { stackItems } from "./stackItems";
import type { StackOperation } from "./stacking";
import { useOwlbearStore } from "./useOwlbearStore";

const VALID_LAYERS = new Set<Item["layer"]>([
  "POINTER",
  "RULER",
  "TEXT",
  "NOTE",
  "ATTACHMENT",
  "CHARACTER",
  "MOUNT",
  "PROP",
  "DRAWING",
  "MAP",
]);

export function Items({ search }: { search: string }) {
  const items = useOwlbearStore((state) => state.items);
  const role = useOwlbearStore((state) => state.role);
  const selection = useOwlbearStore((state) => state.selection);

  const searching = Boolean(search);

  const fuse = useMemo(() => {
    if (!searching) {
      return;
    }
    const searchItems = items.map((item) => {
      const searchItem = {
        id: item.id,
        name: item.name,
        layer: item.layer,
        type: item.type,
        shapeType: "",
        plainText: "",
        richText: "",
      };

      // Search item text
      if (isTextable(item)) {
        searchItem.plainText = item.text.plainText;
        searchItem.richText = toPlainText(item.text.richText);
      }

      if (isShape(item)) {
        searchItem.shapeType = item.shapeType;
      }

      return searchItem;
    });

    return new Fuse(searchItems, {
      keys: [
        "id",
        "name",
        "layer",
        "type",
        "shapeType",
        "plainText",
        "richText",
      ],
      threshold: 0.25,
    });
  }, [items, searching]);

  const filteredItems = useMemo(() => {
    if (search && fuse) {
      const results = fuse.search(search);
      const ids = new Set(results.map((result) => result.item.id));
      return items.filter((item) => ids.has(item.id));
    }
    return items;
  }, [items, fuse, search]);

  const [shownItemsByLayer, shownIds] = useMemo(() => {
    const layers: Record<Item["layer"], Item[]> = {
      POPOVER: [],
      POINTER: [],
      GRID: [],
      CONTROL: [],
      FOG: [],
      RULER: [],
      TEXT: [],
      NOTE: [],
      ATTACHMENT: [],
      CHARACTER: [],
      PROP: [],
      DRAWING: [],
      MOUNT: [],
      MAP: [],
    };

    const sortedItems = filteredItems.sort((a, b) => b.zIndex - a.zIndex);

    for (const item of sortedItems) {
      const hidden = !item.visible && role === "PLAYER";
      const valid =
        VALID_LAYERS.has(item.layer) || (item.layer === "FOG" && role === "GM");
      if (!hidden && valid) {
        layers[item.layer].push(item);
      }
    }

    const allIds: string[] = [];
    for (const layer of Object.keys(layers)) {
      allIds.push(...layers[layer as Item["layer"]].map((item) => item.id));
    }

    return [layers, allIds];
  }, [filteredItems, role]);

  async function handleItemSelect(
    item: Item,
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    let newSelection: string[] = [];
    const currentSelection = selection ?? [];
    const { id } = item;
    if (event.metaKey || event.ctrlKey) {
      // Make a multi selection
      if (currentSelection.includes(id)) {
        newSelection = currentSelection.filter((c) => c !== id);
      } else {
        newSelection = [...currentSelection, id];
      }
    } else if (event.shiftKey) {
      // Make a range selection
      if (currentSelection.length > 0) {
        const currentIndex = shownIds.indexOf(id);
        const lastIndex = shownIds.indexOf(
          currentSelection[currentSelection.length - 1]
        );
        const idsToAdd: string[] = [];
        const idsToRemove: string[] = [];
        const direction = currentIndex > lastIndex ? 1 : -1;
        for (
          let i = lastIndex + direction;
          direction < 0 ? i >= currentIndex : i <= currentIndex;
          i += direction
        ) {
          const localId = shownIds[i];
          if (currentSelection.includes(localId)) {
            idsToRemove.push(localId);
          } else {
            idsToAdd.push(localId);
          }
        }
        newSelection = [...currentSelection, ...idsToAdd].filter(
          (id) => !idsToRemove.includes(id)
        );
      } else {
        newSelection = [id];
      }
    } else {
      // Single selection
      newSelection = [id];
    }

    if (newSelection.length === 0) {
      await OBR.player.deselect();
    } else {
      await OBR.player.select(newSelection);
    }
  }

  async function handleItemFocus(item: Item) {
    const focusedIds = [...new Set([...(selection ?? []), item.id])];

    await recenterItems(focusedIds);
  }

  async function handleItemLocate(item: Item) {
    await recenterItems([item.id]);
  }

  async function recenterItems(focusedIds: string[]) {

    // Convert the center of the selected item to screen-space
    const bounds = await OBR.scene.items.getItemBounds(focusedIds);
    const boundsAbsoluteCenter = await OBR.viewport.transformPoint(
      bounds.center
    );

    // Get the center of the viewport in screen-space
    const viewportWidth = await OBR.viewport.getWidth();
    const viewportHeight = await OBR.viewport.getHeight();
    const viewportCenter: Vector2 = {
      x: viewportWidth / 2,
      y: viewportHeight / 2,
    };

    // Offset the item center by the viewport center
    const absoluteCenter = Math2.subtract(boundsAbsoluteCenter, viewportCenter);

    // Convert the center to world-space
    const relativeCenter = await OBR.viewport.inverseTransformPoint(
      absoluteCenter
    );

    // Invert and scale the world-space position to match a viewport position offset
    const viewportScale = await OBR.viewport.getScale();
    const viewportPosition = Math2.multiply(relativeCenter, -viewportScale);

    await OBR.viewport.animateTo({
      scale: viewportScale,
      position: viewportPosition,
    });
  }

  async function handleItemStack(item: Item, operation: StackOperation) {
    await stackItems(items, [item.id], operation);
  }

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 3 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const [dragId, setDragId] = useState<UniqueIdentifier | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;

    if (typeof active.id !== "string") {
      return;
    }

    if (!selection || !selection.includes(active.id)) {
      OBR.player.select([active.id]);
    }

    setDragId(active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (typeof event.over?.id === "string") {
      // If we're over the START pseudo element move to the top of the layer
      if (event.over && event.over.id.startsWith("START_")) {
        const layer = event.over.id.slice(6) as Item["layer"];
        // Move selection descending from the first zIndex of this layer
        const firstItem = shownItemsByLayer[layer][0];
        if (firstItem) {
          moveSelectionAfter(firstItem.zIndex, firstItem.layer);
        } else {
          moveSelectionLayer(layer);
        }
      } else {
        const overIndex = shownIds.indexOf(event.over.id);
        const overItem = items.find((item) => item.id === event.over?.id);
        const draggingItem = items.find((item) => item.id === dragId);
        // If we're over another item
        if (draggingItem && overItem && draggingItem !== overItem) {
          const nextIndex = overIndex + 1;
          const nextId = shownIds[nextIndex];
          const nextItem = items.find((item) => item.id === nextId);

          // If we're between two items on the same layer
          if (nextItem && nextItem.layer === overItem.layer) {
            // Insert selection between items on the same layer
            const minZIndex = overItem.zIndex;
            const maxZIndex = nextItem.zIndex;
            moveSelectionBetween(minZIndex, maxZIndex, overItem.layer);
          } else {
            // If we're at the end of the list
            moveSelectionBefore(overItem.zIndex, overItem.layer);
          }
        }
      }
    }

    setDragId(null);
  }

  // Move the current selection to a new layer
  async function moveSelectionLayer(layer: Item["layer"]) {
    if (!selection) {
      return;
    }

    await OBR.scene.items.updateItems(selection, (items) => {
      for (const item of items) {
        item.layer = layer;
      }
    });
  }

  // Move the current selection between the input zIndex's
  async function moveSelectionBetween(
    minZIndex: number,
    maxZIndex: number,
    layer?: Item["layer"]
  ) {
    if (!selection) {
      return;
    }

    // Evenly distribute the items between the min and max by
    // lerping between them with an alpha determined by the
    // selection length
    const lerpAlpha = 1 / (selection.length + 1);
    await OBR.scene.items.updateItems(
      selection.sort((a, b) => shownIds.indexOf(a) - shownIds.indexOf(b)),
      (items) => {
        let i = 1;
        for (const item of items) {
          item.zIndex = lerp(minZIndex, maxZIndex, lerpAlpha * i);
          i++;
          if (layer) {
            item.layer = layer;
          }
        }
      }
    );
  }

  // Move the current selection to before the input zIndex
  async function moveSelectionBefore(
    startZIndex: number,
    layer?: Item["layer"]
  ) {
    if (!selection) {
      return;
    }

    await OBR.scene.items.updateItems(
      selection.sort((a, b) => shownIds.indexOf(a) - shownIds.indexOf(b)),
      (items) => {
        let i = 1;
        for (const item of items) {
          item.zIndex = startZIndex - i;
          i++;
          if (layer) {
            item.layer = layer;
          }
        }
      }
    );
  }

  // Move the current selection to after the input zIndex
  async function moveSelectionAfter(endZIndex: number, layer?: Item["layer"]) {
    if (!selection) {
      return;
    }

    await OBR.scene.items.updateItems(
      selection.sort((a, b) => shownIds.indexOf(b) - shownIds.indexOf(a)),
      (items) => {
        let i = 1;
        for (const item of items) {
          item.zIndex = endZIndex + i;
          i++;
          if (layer) {
            item.layer = layer;
          }
        }
      }
    );
  }

  function handleDragCancel() {
    setDragId(null);
  }

  const shownLayers = useMemo<Item["layer"][]>(() => {
    if (!searching) {
      const layers = [...VALID_LAYERS];
      if (role == "GM") {
        return [layers[0], "FOG", ...layers.slice(1)];
      } else {
        return layers;
      }
    } else {
      // When searching only show layers with results
      return Object.entries(shownItemsByLayer)
        .filter(([, items]) => items.length > 0)
        .map(([layer]) => layer) as Item["layer"][];
    }
  }, [searching, shownItemsByLayer, role]);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter}
      sensors={sensors}
    >
      <SortableContext items={shownIds} strategy={verticalListSortingStrategy}>
        {shownLayers.map((layer) => (
          <ItemList
            key={layer}
            items={shownItemsByLayer[layer]}
            layer={layer as Item["layer"]}
            onItemSelect={handleItemSelect}
            onItemFocus={handleItemFocus}
            onItemLocate={handleItemLocate}
            onItemStack={handleItemStack}
          />
        ))}
        <ItemDragOverlay dragId={dragId} />
      </SortableContext>
    </DndContext>
  );
}
