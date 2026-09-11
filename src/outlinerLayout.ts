import { EXTENSION_ID } from "./constants.ts";

export interface OutlinerDimensions { width: number; height: number }
export interface OutlinerLayoutSettings { version: 1; dimensions: OutlinerDimensions }
export type ResizeAxis = "width" | "height" | "both";
export const OUTLINER_LAYOUT_SETTINGS_KEY = `${EXTENSION_ID}/layoutSettings`;
export const MIN_OUTLINER_WIDTH = 300;
export const MAX_OUTLINER_WIDTH = 800;
export const MIN_OUTLINER_HEIGHT = 129;
export const MAX_OUTLINER_HEIGHT = 800;
export const DEFAULT_OUTLINER_DIMENSIONS: OutlinerDimensions = { width: 375, height: 129 };
export const clampDimension = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, Math.round(value)));
export function resizedDimensions(start: OutlinerDimensions, axis: ResizeAxis, deltaX: number, deltaY: number) {
  return { width: axis === "height" ? start.width : clampDimension(start.width + deltaX, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH), height: axis === "width" ? start.height : clampDimension(start.height + deltaY, MIN_OUTLINER_HEIGHT, MAX_OUTLINER_HEIGHT) };
}
export function parseOutlinerLayoutSettings(value: unknown): OutlinerLayoutSettings | undefined {
  if (!value || typeof value !== "object") return;
  const raw = (value as { version?: unknown; dimensions?: unknown; full?: unknown }).version === 1 && (value as { dimensions?: unknown }).dimensions
    ? (value as { dimensions: unknown }).dimensions : (value as { full?: unknown }).full;
  if (!raw || typeof raw !== "object") return;
  const { width, height } = raw as { width?: unknown; height?: unknown };
  if (typeof width !== "number" || !Number.isFinite(width) || typeof height !== "number" || !Number.isFinite(height)) return;
  return { version: 1, dimensions: { width: clampDimension(width, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH), height: clampDimension(height, MIN_OUTLINER_HEIGHT, MAX_OUTLINER_HEIGHT) } };
}
export function readOutlinerLayoutSettings(storage: Pick<Storage, "getItem"> = window.localStorage) { try { const raw = storage.getItem(OUTLINER_LAYOUT_SETTINGS_KEY); return raw === null ? undefined : parseOutlinerLayoutSettings(JSON.parse(raw)); } catch { return undefined; } }
export function writeOutlinerLayoutSettings(settings: OutlinerLayoutSettings, storage: Pick<Storage, "setItem"> = window.localStorage) { try { storage.setItem(OUTLINER_LAYOUT_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Keep live dimensions. */ } }
