import type { Item, Vector2 } from "@owlbear-rodeo/sdk";

// Kept literal so this pure module can run in Node's stripped-TypeScript test mode.
const ITEM_TRANSPARENCY_METADATA_KEY = "com.ex-asperis.outliner/transparentState";

export type TransparencySource = "direct" | "inherited";

export interface StoredTransparentState {
  scale: Vector2;
  visible: boolean;
  disableHit: boolean;
  source: TransparencySource;
  label?: {
    fillOpacity: number;
    strokeOpacity: number;
  };
}

export function parseTransparentState(value: unknown): StoredTransparentState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<StoredTransparentState>;
  const scale = candidate.scale;
  if (!scale || typeof scale !== "object" || !Number.isFinite(scale.x) || !Number.isFinite(scale.y) ||
      typeof candidate.visible !== "boolean" || typeof candidate.disableHit !== "boolean" ||
      (candidate.source !== "direct" && candidate.source !== "inherited")) return undefined;
  const rawLabel = candidate.label;
  const label = rawLabel && typeof rawLabel === "object" && Number.isFinite(rawLabel.fillOpacity) &&
    Number.isFinite(rawLabel.strokeOpacity) ? {
      fillOpacity: rawLabel.fillOpacity,
      strokeOpacity: rawLabel.strokeOpacity,
    } : undefined;
  return {
    scale: { x: scale.x, y: scale.y },
    visible: candidate.visible,
    disableHit: candidate.disableHit,
    source: candidate.source,
    ...(label ? { label } : {}),
  };
}

function getImageTextStyle(item: Item, labelsOnly: boolean) {
  if (item.type !== "IMAGE") return undefined;
  const image = item as Item & {
    textItemType?: unknown;
    text?: { style?: { fillOpacity?: unknown; strokeOpacity?: unknown } };
  };
  if (labelsOnly && image.textItemType !== "LABEL") return undefined;
  const style = image.text?.style;
  return style && typeof style.fillOpacity === "number" && typeof style.strokeOpacity === "number"
    ? style as { fillOpacity: number; strokeOpacity: number }
    : undefined;
}

export function getTransparentState(item: Pick<Item, "metadata">) {
  return parseTransparentState(item.metadata[ITEM_TRANSPARENCY_METADATA_KEY]);
}

export function isItemTransparent(item: Pick<Item, "metadata">) {
  return Boolean(getTransparentState(item));
}

export function activateTransparency(item: Item, source: TransparencySource) {
  const stored = getTransparentState(item);
  const labelStyle = getImageTextStyle(item, true);
  const next = stored
    ? { ...stored, source }
    : {
        scale: { ...item.scale },
        visible: item.visible,
        disableHit: item.disableHit === true,
        source,
      } satisfies StoredTransparentState;
  if (labelStyle && !next.label) next.label = {
    fillOpacity: labelStyle.fillOpacity,
    strokeOpacity: labelStyle.strokeOpacity,
  };
  item.metadata[ITEM_TRANSPARENCY_METADATA_KEY] = next;
  item.scale = { x: 0, y: 0 };
  item.visible = false;
  item.disableHit = true;
  if (labelStyle) {
    labelStyle.fillOpacity = 0;
    labelStyle.strokeOpacity = 0;
  }
}

export function restoreTransparency(item: Item) {
  const stored = getTransparentState(item);
  if (!stored) return false;
  item.scale = { ...stored.scale };
  item.visible = stored.visible;
  item.disableHit = stored.disableHit;
  const textStyle = stored.label ? getImageTextStyle(item, false) : undefined;
  if (stored.label && textStyle) {
    textStyle.fillOpacity = stored.label.fillOpacity;
    textStyle.strokeOpacity = stored.label.strokeOpacity;
  }
  delete item.metadata[ITEM_TRANSPARENCY_METADATA_KEY];
  return true;
}

export function needsTransparencyEnforcement(item: Item) {
  const stored = getTransparentState(item);
  if (!stored) return false;
  const labelStyle = getImageTextStyle(item, true);
  return item.scale.x !== 0 || item.scale.y !== 0 || item.visible || item.disableHit !== true ||
    Boolean(labelStyle && (!stored.label || labelStyle.fillOpacity !== 0 || labelStyle.strokeOpacity !== 0));
}
