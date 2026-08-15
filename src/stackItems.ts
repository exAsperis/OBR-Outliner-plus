import OBR, { Item } from "@owlbear-rodeo/sdk";
import { calculateStackingUpdates, StackOperation } from "./stacking";

export async function stackItems(
  sceneItems: Item[],
  targetIds: string[],
  operation: StackOperation
) {
  const updates = calculateStackingUpdates(sceneItems, targetIds, operation);
  if (updates.size === 0) {
    return;
  }

  await OBR.scene.items.updateItems([...updates.keys()], (items) => {
    for (const item of items) {
      const zIndex = updates.get(item.id);
      if (zIndex !== undefined) {
        item.zIndex = zIndex;
      }
    }
  });
}

