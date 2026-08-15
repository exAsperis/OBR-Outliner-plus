import type { Item } from "@owlbear-rodeo/sdk";

// POST_PROCESS is documented by Owlbear but is missing from the Layer union in
// SDK 2.4. Keep the compatibility addition isolated to this menu.
export type DocumentedLayer = Item["layer"] | "POST_PROCESS";

export const LAYERS_TOP_TO_BOTTOM: DocumentedLayer[] = [
  "POPOVER",
  "CONTROL",
  "POST_PROCESS",
  "POINTER",
  "FOG",
  "RULER",
  "TEXT",
  "NOTE",
  "ATTACHMENT",
  "CHARACTER",
  "MOUNT",
  "PROP",
  "DRAWING",
  "GRID",
  "MAP",
];

export function formatLayerName(layer: DocumentedLayer) {
  return layer
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
