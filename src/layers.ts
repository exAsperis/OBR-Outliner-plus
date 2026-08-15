import type { Item } from "@owlbear-rodeo/sdk";

export const OUTLINER_LAYERS_TOP_TO_BOTTOM: Item["layer"][] = [
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
  "MAP",
];

export function getOutlinerLayers(role: "GM" | "PLAYER") {
  return OUTLINER_LAYERS_TOP_TO_BOTTOM.filter(
    (layer) => role === "GM" || layer !== "FOG",
  );
}

export function formatLayerName(layer: Item["layer"]) {
  return layer
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
