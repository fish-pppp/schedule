export function groupWeekHref(groupId: string, week?: string): string {
  if (!week) return `/groups/${groupId}`;
  return `/groups/${groupId}?week=${encodeURIComponent(week)}`;
}

export function dayViewHref(groupId: string, day: string, week?: string): string {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  params.set("day", day);
  return `/groups/${groupId}?${params.toString()}#day-chart`;
}

export function safeNext(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.includes("://") || value.includes("\\")) return "/";
  return value;
}
