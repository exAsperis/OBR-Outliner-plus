import type { VirtualLayerDefinition, VirtualLayerState } from "./virtualLayers.ts";
import { canonicalVirtualLayerIdentity, formatVirtualLayerPath, guardianVirtualLayerPath, parseVirtualLayerPath, type StatefulVirtualLayerSegment, type VirtualLayerPath } from "./virtualLayerName.ts";

export interface ResolvedLogicalVirtualLayer {
  id: string;
  name: string;
  definitions: VirtualLayerDefinition[];
  guardianId?: string;
  stateGroupId?: string;
  stateGroupName?: string;
  stateName?: string;
}

export interface ResolvedStateGroup {
  id: string;
  name: string;
  guardianId?: string;
  states: Array<{ id: string; name: string; layers: VirtualLayerDefinition[] }>;
}

export type SuppressionReason = "unselected" | "guardian-suppressed" | "guardian-missing";

export interface VirtualLayerParticipation {
  participating: boolean;
  locallySelected?: boolean;
  guardianParticipating: boolean;
  reasons: SuppressionReason[];
}

export interface ResolvedParticipationModel {
  logicalLayers: ResolvedLogicalVirtualLayer[];
  stateGroups: ResolvedStateGroup[];
  byDefinitionId: Map<string, VirtualLayerParticipation>;
  byLogicalId: Map<string, VirtualLayerParticipation>;
}

function stateGroupId(path: VirtualLayerPath, stateful: StatefulVirtualLayerSegment) {
  const parent = guardianVirtualLayerPath(path);
  const prefix = parent ? `${canonicalVirtualLayerIdentity(formatVirtualLayerPath(parent))}/` : "";
  return `${prefix}${stateful.group.toLocaleLowerCase()}`;
}

export function resolveParticipationModel(state: VirtualLayerState): ResolvedParticipationModel {
  const logicalById = new Map<string, ResolvedLogicalVirtualLayer>();
  for (const definition of state.layers) {
    const path = parseVirtualLayerPath(definition.name);
    const id = path && canonicalVirtualLayerIdentity(definition.name);
    if (!path || !id) continue;
    const guardian = guardianVirtualLayerPath(path);
    const final = path.segments[path.segments.length - 1];
    let logical = logicalById.get(id);
    if (!logical) {
      logical = {
        id,
        name: formatVirtualLayerPath(path),
        definitions: [],
        ...(guardian ? { guardianId: canonicalVirtualLayerIdentity(formatVirtualLayerPath(guardian)) } : {}),
        ...(final.kind === "state" ? {
          stateGroupId: stateGroupId(path, final),
          stateGroupName: final.group,
          stateName: final.state,
        } : {}),
      };
      logicalById.set(id, logical);
    }
    logical.definitions.push(definition);
  }

  const groups = new Map<string, ResolvedStateGroup>();
  for (const logical of logicalById.values()) {
    if (!logical.stateGroupId || !logical.stateGroupName || !logical.stateName) continue;
    let group = groups.get(logical.stateGroupId);
    if (!group) {
      group = { id: logical.stateGroupId, name: logical.stateGroupName,
        ...(logical.guardianId ? { guardianId: logical.guardianId } : {}), states: [] };
      groups.set(group.id, group);
    }
    group.states.push({ id: logical.id, name: logical.stateName, layers: logical.definitions });
  }

  const byLogicalId = new Map<string, VirtualLayerParticipation>();
  const resolve = (logical: ResolvedLogicalVirtualLayer): VirtualLayerParticipation => {
    const cached = byLogicalId.get(logical.id);
    if (cached) return cached;
    const selected = logical.stateGroupId && logical.stateName
      ? state.stateSelections?.[logical.stateGroupId] === logical.stateName.toLocaleLowerCase()
      : undefined;
    const guardian = logical.guardianId ? logicalById.get(logical.guardianId) : undefined;
    const guardianParticipation = guardian ? resolve(guardian) : undefined;
    const guardianParticipating = logical.guardianId ? guardianParticipation?.participating === true : true;
    const reasons: SuppressionReason[] = [];
    if (selected === false) reasons.push("unselected");
    if (logical.guardianId && !guardian) reasons.push("guardian-missing");
    else if (logical.guardianId && !guardianParticipating) reasons.push("guardian-suppressed");
    const participation = {
      participating: selected !== false && guardianParticipating,
      ...(selected !== undefined ? { locallySelected: selected } : {}),
      guardianParticipating,
      reasons,
    };
    byLogicalId.set(logical.id, participation);
    return participation;
  };

  for (const logical of logicalById.values()) resolve(logical);
  const byDefinitionId = new Map<string, VirtualLayerParticipation>();
  for (const logical of logicalById.values()) {
    const participation = byLogicalId.get(logical.id)!;
    for (const definition of logical.definitions) byDefinitionId.set(definition.id, participation);
  }
  return { logicalLayers: [...logicalById.values()], stateGroups: [...groups.values()], byDefinitionId, byLogicalId };
}

export function withStateGroupSelection(state: VirtualLayerState, groupId: string, stateName: string | null): VirtualLayerState {
  const normalizedGroup = groupId.trim().toLocaleLowerCase();
  if (!normalizedGroup) return state;
  return { ...state, stateSelections: {
    ...state.stateSelections,
    [normalizedGroup]: stateName === null ? null : stateName.trim().toLocaleLowerCase(),
  } };
}
