import type { Item } from "@owlbear-rodeo/sdk";
import { linkedVirtualLayers, resolveGroupId, type EnforcedItemState, type InheritedItemState, type StatefulProperty, type VirtualInheritance, type VirtualLayerState } from "./virtualLayers.ts";
import { getTransparentState, isItemTransparent, needsTransparencyEnforcement } from "./transparentState.ts";

const ITEM_INHERITANCE_METADATA_KEY = "com.ex-asperis.outliner/stateInheritance";
const VIRTUAL_LAYER_METADATA_KEY = "com.ex-asperis.outliner/virtualLayer";
const UNASSIGNED_ID = "__unassigned__";

export type { StatefulProperty } from "./virtualLayers";
export type InheritanceVisualState = "disabled" | "enabled" | "blocked-item" | "blocked-virtual-layer";
export const EMPTY_INHERITED_STATE: InheritedItemState = { disableHit: false, locked: false, visible: true, transparent: false };

export interface ItemInheritanceState { independent: true; legacy: boolean }
export interface InheritanceUpdate { instructions?: EnforcedItemState; preserveTransparency?: boolean }

export function itemState(item: Pick<Item, "disableHit" | "locked" | "visible" | "metadata">): InheritedItemState {
  return { disableHit: item.disableHit === true, locked: item.locked, visible: item.visible, transparent: isItemTransparent(item) };
}

export function parseItemInheritance(value: unknown): ItemInheritanceState | undefined {
  if (!value || typeof value !== "object") return undefined;
  if ((value as { independent?: unknown }).independent === true) return { independent: true, legacy: false };
  const legacy = value as Partial<InheritedItemState>;
  return typeof legacy.disableHit === "boolean" && typeof legacy.locked === "boolean" && typeof legacy.visible === "boolean"
    ? { independent: true, legacy: true } : undefined;
}

export function getItemRule(item: Pick<Item, "metadata">) {
  return parseItemInheritance(item.metadata[ITEM_INHERITANCE_METADATA_KEY]);
}

export function getNativeRule(state: VirtualLayerState, layer: Item["layer"]): EnforcedItemState {
  return state.inheritance?.native?.[layer] ?? {};
}

export function getGroupInheritance(state: VirtualLayerState, layer: Item["layer"], groupId: string): VirtualInheritance {
  return groupId === UNASSIGNED_ID
    ? state.inheritance?.unassigned?.[layer] ?? { mode: "pass-through" }
    : state.inheritance?.virtual?.[groupId] ?? { mode: "pass-through" };
}

export function getGroupRule(state: VirtualLayerState, layer: Item["layer"], groupId: string): EnforcedItemState | undefined {
  const config = getGroupInheritance(state, layer, groupId);
  return config.mode === "independent" ? config.enforce : undefined;
}

export function getGroupEffectiveInstructions(state: VirtualLayerState, layer: Item["layer"], groupId: string): EnforcedItemState {
  const config = getGroupInheritance(state, layer, groupId);
  return config.mode === "independent" ? config.enforce : getNativeRule(state, layer);
}

function resolveItemGroup(item: Pick<Item, "layer" | "metadata">, state: VirtualLayerState) {
  const value = item.metadata[VIRTUAL_LAYER_METADATA_KEY];
  const id = value && typeof value === "object" && typeof (value as { virtualLayerId?: unknown }).virtualLayerId === "string"
    ? (value as { virtualLayerId: string }).virtualLayerId : undefined;
  const definition = id ? state.layers.find((entry) => entry.id === id) : undefined;
  return definition?.obrLayer === item.layer ? definition.id : UNASSIGNED_ID;
}

export function getItemParentRule(item: Pick<Item, "layer" | "metadata" | "id" | "zIndex">, state: VirtualLayerState) {
  return getGroupEffectiveInstructions(state, item.layer, resolveItemGroup(item, state));
}

export function getEffectiveItemRule(item: Pick<Item, "layer" | "metadata" | "id" | "zIndex">, state: VirtualLayerState) {
  return getItemRule(item) ? {} : getItemParentRule(item, state);
}

export function directGroupItemIds(items: Item[], state: VirtualLayerState, layer: Item["layer"], groupId: string) {
  return items.filter((item) => item.layer === layer && resolveGroupId(item, state) === groupId && !getItemRule(item)).map((item) => item.id);
}

export function directNativeItemIds(items: Item[], state: VirtualLayerState, layer: Item["layer"]) {
  return items.filter((item) => item.layer === layer && !getItemRule(item) &&
    getGroupInheritance(state, layer, resolveGroupId(item, state)).mode === "pass-through").map((item) => item.id);
}

export function linkedDirectPropertyItemIds(items: Item[], state: VirtualLayerState, sourceId: string, property: StatefulProperty) {
  const source = state.layers.find((layer) => layer.id === sourceId);
  if (!source || Object.prototype.hasOwnProperty.call(getGroupEffectiveInstructions(state, source.obrLayer, source.id), property)) return [];
  return linkedVirtualLayers(state, sourceId).filter((layer) =>
    !Object.prototype.hasOwnProperty.call(getGroupEffectiveInstructions(state, layer.obrLayer, layer.id), property))
    .flatMap((layer) => items.filter((item) => item.layer === layer.obrLayer && resolveGroupId(item, state) === layer.id).map((item) => item.id));
}

export function hasInstructions(rule: EnforcedItemState | undefined) {
  return Boolean(rule && Object.keys(rule).length);
}

const has = (rule: EnforcedItemState, property: StatefulProperty) => Object.prototype.hasOwnProperty.call(rule, property);

export function calculateInheritanceUpdates(items: Item[], state: VirtualLayerState) {
  const updates = new Map<string, InheritanceUpdate>();
  for (const item of items) {
    const itemRule = getItemRule(item);
    const instructions = itemRule ? {} : getItemParentRule(item, state);
    const transparentState = getTransparentState(item);
    if (itemRule?.legacy) {
      updates.set(item.id, { instructions, preserveTransparency: Boolean(transparentState) });
      continue;
    }
    const transparencyMismatch = has(instructions, "transparent")
      ? instructions.transparent ? !transparentState || needsTransparencyEnforcement(item) : Boolean(transparentState)
      : transparentState?.source === "inherited";
    const hitMismatch = has(instructions, "disableHit") && !instructions.transparent && (item.disableHit === true) !== instructions.disableHit;
    const visibleMismatch = has(instructions, "visible") && !instructions.transparent && item.visible !== instructions.visible;
    const lockMismatch = has(instructions, "locked") && item.locked !== instructions.locked;
    if (transparencyMismatch || hitMismatch || visibleMismatch || lockMismatch) updates.set(item.id, { instructions });
  }
  return updates;
}

export function itemInheritanceLabel(independent: boolean) {
  return independent ? "Allow inheritance" : "Independent";
}

export function inheritanceVisualState(level: "native" | "virtual" | "item", active: boolean, independent = false): InheritanceVisualState {
  if (independent) return level === "item" ? "blocked-item" : "blocked-virtual-layer";
  return active ? "enabled" : "disabled";
}

export function captureAggregateState(items: Array<Pick<Item, "disableHit" | "locked" | "visible" | "metadata">>): InheritedItemState {
  if (!items.length) return EMPTY_INHERITED_STATE;
  return { disableHit: items.every((item) => item.disableHit === true), locked: items.every((item) => item.locked),
    visible: items.every((item) => item.visible), transparent: items.every((item) => isItemTransparent(item)) };
}
