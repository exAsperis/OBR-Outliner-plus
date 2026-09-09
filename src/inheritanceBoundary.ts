import type { VirtualLayerState } from "./virtualLayers.ts";
import { resolveParticipationModel } from "./participation.ts";

export type InheritanceBoundaryReason = "linked" | "dependent";
export interface InheritanceBoundary { reasons: InheritanceBoundaryReason[] }

export function getInheritanceBoundary(state: VirtualLayerState, definitionId: string): InheritanceBoundary | undefined {
  const logical = resolveParticipationModel(state).logicalLayers.find((entry) =>
    entry.definitions.some((definition) => definition.id === definitionId));
  if (!logical) return undefined;
  const reasons: InheritanceBoundaryReason[] = [];
  if (logical.definitions.length > 1) reasons.push("linked");
  if (logical.guardianId) reasons.push("dependent");
  return reasons.length ? { reasons } : undefined;
}

export function withoutBoundaryInheritance(state: VirtualLayerState): VirtualLayerState {
  const virtual = { ...state.inheritance?.virtual };
  let changed = false;
  for (const definition of state.layers) {
    if (getInheritanceBoundary(state, definition.id) && Object.prototype.hasOwnProperty.call(virtual, definition.id)) {
      delete virtual[definition.id];
      changed = true;
    }
  }
  if (!changed) return state;
  const inheritance = { ...state.inheritance };
  if (Object.keys(virtual).length) inheritance.virtual = virtual; else delete inheritance.virtual;
  return { ...state, inheritance: inheritance.native || inheritance.virtual || inheritance.unassigned ? inheritance : undefined };
}

export function inheritanceBoundaryDescription(boundary: InheritanceBoundary) {
  if (boundary.reasons.length === 2) return "Inheritance is blocked because this virtual layer is linked and dependent.";
  return boundary.reasons[0] === "linked"
    ? "Inheritance is blocked because linked virtual layers share one logical local state."
    : "Inheritance is blocked because dependent virtual layers use guardian participation.";
}
