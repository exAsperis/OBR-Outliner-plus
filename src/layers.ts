import type { Item } from "@owlbear-rodeo/sdk";

export const OUTLINER_LAYERS_TOP_TO_BOTTOM: Item["layer"][] = [
  "POPOVER",
  "CONTROL",
  "POST_PROCESS" as Item["layer"],
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

export const DEFAULT_OUTLINER_LAYERS: Item["layer"][] = OUTLINER_LAYERS_TOP_TO_BOTTOM.filter(
  (layer) => !["POPOVER", "CONTROL", "POST_PROCESS", "GRID"].includes(layer),
);

export function getOutlinerLayers(role: "GM" | "PLAYER", enabledLayers: Iterable<Item["layer"]> = DEFAULT_OUTLINER_LAYERS) {
  const enabled = new Set(enabledLayers);
  return OUTLINER_LAYERS_TOP_TO_BOTTOM.filter(
    (layer) => enabled.has(layer) && (role === "GM" || layer !== "FOG"),
  );
}

export function formatLayerName(layer: Item["layer"]) {
  return layer
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
