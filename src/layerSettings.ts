import type { Item } from "@owlbear-rodeo/sdk";
import { useSyncExternalStore } from "react";
import { EXTENSION_ID } from "./constants.ts";
import { DEFAULT_OUTLINER_LAYERS, OUTLINER_LAYERS_TOP_TO_BOTTOM } from "./layers.ts";

export interface FeatureSettings { manageInheritance: boolean; interaction: boolean; locked: boolean; visible: boolean }
export type FeatureSetting = keyof FeatureSettings;
export interface LayerDisplaySettings { version: 1; enabledLayers: Item["layer"][]; features: FeatureSettings }

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = { manageInheritance: true, interaction: false, locked: true, visible: true };
export const LAYER_DISPLAY_SETTINGS_KEY = `${EXTENSION_ID}/layerDisplaySettings`;
export const DEFAULT_LAYER_DISPLAY_SETTINGS: LayerDisplaySettings = { version: 1, enabledLayers: [...DEFAULT_OUTLINER_LAYERS], features: DEFAULT_FEATURE_SETTINGS };
const knownLayers = new Set<string>(OUTLINER_LAYERS_TOP_TO_BOTTOM);

export function parseLayerDisplaySettings(value: unknown): LayerDisplaySettings {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1 || !Array.isArray((value as { enabledLayers?: unknown }).enabledLayers)) return DEFAULT_LAYER_DISPLAY_SETTINGS;
  const enabled = new Set((value as { enabledLayers: unknown[] }).enabledLayers.filter((layer): layer is Item["layer"] => typeof layer === "string" && knownLayers.has(layer)));
  const candidate = (value as { features?: unknown }).features;
  const features = candidate && typeof candidate === "object"
    ? Object.fromEntries(Object.entries(DEFAULT_FEATURE_SETTINGS).map(([key, fallback]) => [key, typeof (candidate as Record<string, unknown>)[key] === "boolean" ? (candidate as Record<string, boolean>)[key] : fallback])) as unknown as FeatureSettings
    : DEFAULT_FEATURE_SETTINGS;
  return { version: 1, enabledLayers: OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((layer) => enabled.has(layer)), features };
}

export function readLayerDisplaySettings(storage: Pick<Storage, "getItem"> = window.localStorage) {
  try { const raw = storage.getItem(LAYER_DISPLAY_SETTINGS_KEY); return raw === null ? DEFAULT_LAYER_DISPLAY_SETTINGS : parseLayerDisplaySettings(JSON.parse(raw)); }
  catch { return DEFAULT_LAYER_DISPLAY_SETTINGS; }
}

let current = typeof window === "undefined" ? DEFAULT_LAYER_DISPLAY_SETTINGS : readLayerDisplaySettings();
const listeners = new Set<() => void>();
function emit(next: LayerDisplaySettings) { current = next; for (const listener of listeners) listener(); }
function persist(next: LayerDisplaySettings) { try { window.localStorage.setItem(LAYER_DISPLAY_SETTINGS_KEY, JSON.stringify(next)); } catch { /* Keep the live setting. */ } emit(next); }
export function withLayersEnabled(settings: LayerDisplaySettings, layers: Iterable<Item["layer"]>, enabled: boolean) {
  const selected = new Set(settings.enabledLayers); for (const layer of layers) enabled ? selected.add(layer) : selected.delete(layer);
  return { ...settings, enabledLayers: OUTLINER_LAYERS_TOP_TO_BOTTOM.filter((layer) => selected.has(layer)) };
}
export function setLayersEnabled(layers: Iterable<Item["layer"]>, enabled: boolean) { const next = withLayersEnabled(current, layers, enabled); if (next.enabledLayers.join() !== current.enabledLayers.join()) persist(next); }
export function setLayerEnabled(layer: Item["layer"], enabled: boolean) { setLayersEnabled([layer], enabled); }
export function setFeatureEnabled(feature: FeatureSetting, enabled: boolean) { persist({ ...current, features: { ...current.features, [feature]: enabled } }); }
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
if (typeof window !== "undefined") window.addEventListener("storage", (event) => { if (event.key !== LAYER_DISPLAY_SETTINGS_KEY) return; try { emit(event.newValue === null ? DEFAULT_LAYER_DISPLAY_SETTINGS : parseLayerDisplaySettings(JSON.parse(event.newValue))); } catch { emit(DEFAULT_LAYER_DISPLAY_SETTINGS); } });
export function useLayerDisplaySettings() { return useSyncExternalStore(subscribe, () => current, () => DEFAULT_LAYER_DISPLAY_SETTINGS); }
