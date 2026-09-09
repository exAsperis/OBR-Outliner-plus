import { MINIMIZED_LAYOUT_METADATA_KEY } from "./constants.ts";
import { clampDimension, MAX_OUTLINER_HEIGHT, MAX_OUTLINER_WIDTH, MIN_FULL_HEIGHT, MIN_OUTLINER_WIDTH, type MinimizedOrientation, type OutlinerDimensions } from "./outlinerLayout.ts";

export interface SceneMinimizedLayout {
  version: 1;
  dimensions: Record<MinimizedOrientation, OutlinerDimensions>;
}

export const DEFAULT_SCENE_MINIMIZED_LAYOUT: SceneMinimizedLayout = {
  version: 1,
  dimensions: {
    horizontal: { width: 375, height: 129 },
    vertical: { width: 375, height: 375 },
  },
};

function dimensions(value: unknown, minimumWidth: number, minimumHeight: number): OutlinerDimensions | undefined {
  if (!value || typeof value !== "object") return;
  const width = (value as { width?: unknown }).width;
  const height = (value as { height?: unknown }).height;
  if (typeof width !== "number" || !Number.isFinite(width) || typeof height !== "number" || !Number.isFinite(height)) return;
  return {
    width: clampDimension(width, minimumWidth, MAX_OUTLINER_WIDTH),
    height: clampDimension(height, minimumHeight, MAX_OUTLINER_HEIGHT),
  };
}

export function parseSceneMinimizedLayout(value: unknown): SceneMinimizedLayout {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) return DEFAULT_SCENE_MINIMIZED_LAYOUT;
  const profiles = (value as { dimensions?: unknown }).dimensions;
  if (!profiles || typeof profiles !== "object") return DEFAULT_SCENE_MINIMIZED_LAYOUT;
  const horizontal = dimensions((profiles as { horizontal?: unknown }).horizontal, MIN_OUTLINER_WIDTH, 1);
  const vertical = dimensions((profiles as { vertical?: unknown }).vertical, 1, MIN_FULL_HEIGHT);
  return horizontal && vertical ? { version: 1, dimensions: { horizontal, vertical } } : DEFAULT_SCENE_MINIMIZED_LAYOUT;
}

export function sceneMinimizedLayoutFromMetadata(metadata: Record<string, unknown>) {
  return parseSceneMinimizedLayout(metadata[MINIMIZED_LAYOUT_METADATA_KEY]);
}
