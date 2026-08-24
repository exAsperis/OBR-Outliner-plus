import { useSyncExternalStore } from "react";
import type { Item } from "@owlbear-rodeo/sdk";
import { EXTENSION_ID } from "./constants.ts";
import { DEFAULT_OUTLINER_LAYERS, OUTLINER_LAYERS_TOP_TO_BOTTOM } from "./layers.ts";

export interface LayerDisplaySettings {
  version: 1;
  enabledLayers: Item["layer"][];
}

export const LAYER_DISPLAY_SETTINGS_KEY = `${EXTENSION_ID}/layerDisplaySettings`;
export const DEFAULT_LAYER_DISPLAY_SETTINGS: LayerDisplaySettings = {
  version: 1,
  enabledLayers: [...DEFAULT_OUTLINER_LAYERS],
};

const knownLayers = new Set<string>(OUTLINER_LAYERS_TOP_TO_BOTTOM);

export function parseLayerDisplaySettings(value: unknown): LayerDisplaySettings {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1 ||
      !Array.isArray((value as { enabledLayers?: unknown }).enabledLayers)) return DEFAULT_LAYER_DISPLAY_SETTINGS;
  const enabled = new Set((value as { enabledLayers: unknown[] }).enabledLayers.filter(
    (layer): layer is Item["layer"] => typeof layer === "string" && knownLayers.has(layer),
  ));
  return {
    version: 1,
    enabledLayers: OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((layer) => enabled.has(layer)),
  };
}

export function readLayerDisplaySettings(storage: Pick<Storage, "getItem"> = window.localStorage) {
  try {
    const raw = storage.getItem(LAYER_DISPLAY_SETTINGS_KEY);
    return raw === null ? DEFAULT_LAYER_DISPLAY_SETTINGS : parseLayerDisplaySettings(JSON.parse(raw));
  } catch {
    return DEFAULT_LAYER_DISPLAY_SETTINGS;
  }
}

let current = typeof window === "undefined" ? DEFAULT_LAYER_DISPLAY_SETTINGS : readLayerDisplaySettings();
const listeners = new Set<() => void>();

function emit(settings: LayerDisplaySettings) {
  current = settings;
  for (const listener of listeners) listener();
}

export function setLayerEnabled(layer: Item["layer"], enabled: boolean) {
  const selected = new Set(current.enabledLayers);
  if (enabled) selected.add(layer); else selected.delete(layer);
  const next: LayerDisplaySettings = {
    version: 1,
    enabledLayers: OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((candidate) => selected.has(candidate)),
  };
  try { window.localStorage.setItem(LAYER_DISPLAY_SETTINGS_KEY, JSON.stringify(next)); } catch { /* Keep the live preference when storage is unavailable. */ }
  emit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
  if (event.key !== LAYER_DISPLAY_SETTINGS_KEY) return;
  emit(event.newValue === null ? DEFAULT_LAYER_DISPLAY_SETTINGS : (() => {
    try { return parseLayerDisplaySettings(JSON.parse(event.newValue)); } catch { return DEFAULT_LAYER_DISPLAY_SETTINGS; }
  })());
});

export function useLayerDisplaySettings() {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_LAYER_DISPLAY_SETTINGS);
}
