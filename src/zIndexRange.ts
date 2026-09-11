export function formatZIndexRange(values: number[]) {
  if (!values.length) return "z-index —";
  return `z-index ${Math.min(...values)} – ${Math.max(...values)}`;
}
