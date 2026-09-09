export interface PlainVirtualLayerSegment {
  kind: "plain";
  name: string;
}

export interface StatefulVirtualLayerSegment {
  kind: "state";
  group: string;
  state: string;
}

export type VirtualLayerPathSegment = PlainVirtualLayerSegment | StatefulVirtualLayerSegment;

export interface VirtualLayerPath {
  segments: VirtualLayerPathSegment[];
}

function parseSegment(value: string): VirtualLayerPathSegment | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const separator = trimmed.indexOf(":");
  if (separator < 0) return { kind: "plain", name: trimmed };
  const group = trimmed.slice(0, separator).trim();
  const state = trimmed.slice(separator + 1).trim();
  return group && state ? { kind: "state", group, state } : undefined;
}

export function parseVirtualLayerPath(value: string): VirtualLayerPath | undefined {
  const rawSegments = value.split("/");
  const segments = rawSegments.map(parseSegment);
  return segments.length && segments.every((segment): segment is VirtualLayerPathSegment => Boolean(segment))
    ? { segments } : undefined;
}

export function formatVirtualLayerPath(path: VirtualLayerPath) {
  return path.segments.map((segment) => segment.kind === "plain"
    ? segment.name.trim()
    : `${segment.group.trim()}: ${segment.state.trim()}`).join("/");
}

export function canonicalizeVirtualLayerName(value: string) {
  const parsed = parseVirtualLayerPath(value);
  if (!parsed) throw new Error("Virtual layer name must use non-empty names, state groups, and dependency segments.");
  return formatVirtualLayerPath(parsed);
}

export function canonicalVirtualLayerIdentity(value: string) {
  const parsed = parseVirtualLayerPath(value);
  return parsed ? formatVirtualLayerPath(parsed).toLocaleLowerCase() : undefined;
}

export function isDependentVirtualLayerPath(path: VirtualLayerPath) {
  return path.segments.length > 1;
}

export function guardianVirtualLayerPath(path: VirtualLayerPath): VirtualLayerPath | undefined {
  return path.segments.length > 1 ? { segments: path.segments.slice(0, -1) } : undefined;
}
