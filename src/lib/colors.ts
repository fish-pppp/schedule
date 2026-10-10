export const GROUP_COLORS = [
  "#c6533a",
  "#2f6f6a",
  "#c7862a",
  "#3d5a80",
  "#8c4a6f",
  "#5c7a3a",
  "#3f6f9a",
  "#8a5a3b",
] as const;

export function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length] ?? GROUP_COLORS[0];
}
