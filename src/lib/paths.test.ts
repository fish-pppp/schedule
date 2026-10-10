import assert from "node:assert/strict";
import test from "node:test";

import { dayViewHref, groupWeekHref, safeNext } from "./paths.ts";

test("day links keep the week and open that day's chart", () => {
  assert.equal(groupWeekHref("group-1"), "/groups/group-1");
  assert.equal(groupWeekHref("group-1", "2026-10-12"), "/groups/group-1?week=2026-10-12");
  assert.equal(dayViewHref("group-1", "2026-10-10"), "/groups/group-1?day=2026-10-10#day-chart");
  assert.equal(
    dayViewHref("group-1", "2026-10-10", "2026-10-05"),
    "/groups/group-1?week=2026-10-05&day=2026-10-10#day-chart",
  );
});

test("safeNext only keeps in-app paths", () => {
  assert.equal(safeNext("/groups/abc?week=2026-10-05"), "/groups/abc?week=2026-10-05");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext(null), "/");
});
