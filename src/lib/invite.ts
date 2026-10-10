export function pendingOutingIds(rows: readonly { outingId: string; status: string }[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.status === "invited") ids.add(row.outingId);
  }
  return ids;
}
