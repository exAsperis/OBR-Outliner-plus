import type { Item } from "@owlbear-rodeo/sdk";
import { ITEM_INHERITANCE_METADATA_KEY, VIRTUAL_LAYER_METADATA_KEY } from "./constants.ts";
import type { EnforcedItemState, InheritedItemState, StatefulProperty, VirtualInheritance, VirtualLayerState } from "./virtualLayers.ts";

export type InheritanceVisualState = "disabled" | "enabled" | "blocked-item" | "blocked-virtual-layer";
export const EMPTY_INHERITED_STATE: InheritedItemState = { disableHit: false, locked: false, visible: true };
export interface ItemInheritanceState { independent: true }

export function itemState(item: Pick<Item, "disableHit" | "locked" | "visible">): InheritedItemState { return { disableHit: item.disableHit === true, locked: item.locked, visible: item.visible }; }
export function parseItemInheritance(value: unknown): ItemInheritanceState | undefined { return value && typeof value === "object" && (value as { independent?: unknown }).independent === true ? { independent: true } : undefined; }
export function getItemRule(item: Pick<Item, "metadata">) { return parseItemInheritance(item.metadata[ITEM_INHERITANCE_METADATA_KEY]); }
export function getNativeRule(state: VirtualLayerState, layer: Item["layer"]): EnforcedItemState { return state.inheritance?.native?.[layer] ?? {}; }
export function getGroupInheritance(state: VirtualLayerState, layer: Item["layer"], groupId: string): VirtualInheritance { return groupId === "__unassigned__" ? state.inheritance?.unassigned?.[layer] ?? { mode: "pass-through" } : state.inheritance?.virtual?.[groupId] ?? { mode: "pass-through" }; }
export function getGroupEffectiveInstructions(state: VirtualLayerState, layer: Item["layer"], groupId: string): EnforcedItemState { const config = getGroupInheritance(state, layer, groupId); return config.mode === "independent" ? config.enforce : getNativeRule(state, layer); }
function resolveItemGroup(item: Pick<Item, "layer" | "metadata">, state: VirtualLayerState) { const raw = item.metadata[VIRTUAL_LAYER_METADATA_KEY]; const id = raw && typeof raw === "object" && typeof (raw as { virtualLayerId?: unknown }).virtualLayerId === "string" ? (raw as { virtualLayerId: string }).virtualLayerId : undefined; const definition = id ? state.layers.find((entry) => entry.id === id) : undefined; return definition?.obrLayer === item.layer ? definition.id : "__unassigned__"; }
export function getItemParentRule(item: Pick<Item, "layer" | "metadata">, state: VirtualLayerState) { return getGroupEffectiveInstructions(state, item.layer, resolveItemGroup(item, state)); }
export function getEffectiveItemRule(item: Pick<Item, "layer" | "metadata">, state: VirtualLayerState) { return getItemRule(item) ? {} : getItemParentRule(item, state); }
export function calculateInheritanceUpdates(items: Item[], state: VirtualLayerState) { const updates = new Map<string, EnforcedItemState>(); for (const item of items) { const rule = getEffectiveItemRule(item, state); if ((Object.prototype.hasOwnProperty.call(rule, "disableHit") && item.disableHit !== rule.disableHit) || (Object.prototype.hasOwnProperty.call(rule, "locked") && item.locked !== rule.locked) || (Object.prototype.hasOwnProperty.call(rule, "visible") && item.visible !== rule.visible)) updates.set(item.id, rule); } return updates; }
export function captureAggregateState(items: Array<Pick<Item, "disableHit" | "locked" | "visible">>): InheritedItemState { return items.length ? { disableHit: items.every((item) => item.disableHit === true), locked: items.every((item) => item.locked), visible: items.every((item) => item.visible) } : EMPTY_INHERITED_STATE; }
export function hasInstructions(rule: EnforcedItemState | undefined) { return Boolean(rule && Object.keys(rule).length); }
export function inheritanceVisualState(level: "native" | "virtual" | "item", active: boolean, independent = false): InheritanceVisualState { if (independent) return level === "item" ? "blocked-item" : "blocked-virtual-layer"; return active ? "enabled" : "disabled"; }
export const propertyIsEnforced = (rule: EnforcedItemState, property: StatefulProperty) => Object.prototype.hasOwnProperty.call(rule, property);
