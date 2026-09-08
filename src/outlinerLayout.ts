import { EXTENSION_ID } from "./constants.ts";

export type OutlinerMode = "full" | "minimized";

export interface OutlinerDimensions {
  width: number;
  height: number;
}

export interface OutlinerLayoutSettings {
  version: 1;
  mode: OutlinerMode;
  full: OutlinerDimensions;
  minimized: OutlinerDimensions;
}

export const OUTLINER_LAYOUT_SETTINGS_KEY = `${EXTENSION_ID}/layoutSettings`;
export const MIN_OUTLINER_WIDTH = 300;
export const MAX_OUTLINER_WIDTH = 800;
export const MIN_FULL_HEIGHT = 129;
export const MAX_OUTLINER_HEIGHT = 800;

export const DEFAULT_OUTLINER_LAYOUT_SETTINGS: OutlinerLayoutSettings = {
  version: 1,
  mode: "full",
  full: { width: 375, height: 129 },
  minimized: { width: 375, height: 129 },
};

export function clampDimension(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export type ResizeAxis = "width" | "height" | "both";

export function resizedDimensions(start: OutlinerDimensions, axis: ResizeAxis, deltaX: number, deltaY: number) {
  return {
    width: axis === "height" ? start.width : clampDimension(start.width + deltaX, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH),
    height: axis === "width" ? start.height : clampDimension(start.height + deltaY, MIN_FULL_HEIGHT, MAX_OUTLINER_HEIGHT),
  };
}

function dimensions(value: unknown, minimumHeight: number): OutlinerDimensions | undefined {
  if (!value || typeof value !== "object") return;
  const width = (value as { width?: unknown }).width;
  const height = (value as { height?: unknown }).height;
  if (typeof width !== "number" || !Number.isFinite(width) || typeof height !== "number" || !Number.isFinite(height)) return;
  return {
    width: clampDimension(width, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH),
    height: clampDimension(height, minimumHeight, MAX_OUTLINER_HEIGHT),
  };
}

export function parseOutlinerLayoutSettings(value: unknown): OutlinerLayoutSettings | undefined {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) return;
  const mode = (value as { mode?: unknown }).mode;
  const full = dimensions((value as { full?: unknown }).full, MIN_FULL_HEIGHT);
  const minimized = dimensions((value as { minimized?: unknown }).minimized, 1);
  if ((mode !== "full" && mode !== "minimized") || !full || !minimized) return;
  return { version: 1, mode, full, minimized };
}

export function readOutlinerLayoutSettings(storage: Pick<Storage, "getItem"> = window.localStorage) {
  try {
    const raw = storage.getItem(OUTLINER_LAYOUT_SETTINGS_KEY);
    return raw === null ? undefined : parseOutlinerLayoutSettings(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function writeOutlinerLayoutSettings(settings: OutlinerLayoutSettings, storage: Pick<Storage, "setItem"> = window.localStorage) {
  try { storage.setItem(OUTLINER_LAYOUT_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Keep live dimensions when storage is unavailable. */ }
}
