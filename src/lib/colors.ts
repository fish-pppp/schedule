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

export const MEMBER_COLORS = [
  "#c6533a",
  "#1f6f68",
  "#3d5a80",
  "#8a5314",
  "#8c4a6f",
  "#4d6b2f",
  "#2c5f8a",
  "#7a4030",
  "#5c4788",
  "#0e6a72",
  "#a33b55",
  "#3e5c4a",
] as const;

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length] ?? MEMBER_COLORS[0];
}
