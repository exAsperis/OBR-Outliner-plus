import type { Item } from "@owlbear-rodeo/sdk";
import { StackOperation } from "./stacking";
import { stackVirtualItems } from "./virtualLayerService";

export async function stackItems(
  sceneItems: Item[],
  targetIds: string[],
  operation: StackOperation
) {
  void sceneItems;
  await stackVirtualItems(targetIds, operation);
}

