import assert from "node:assert/strict";
import test from "node:test";

import { addDays, addMonths, formatOccupied, isAllDay, mondayOf, monthGrid, parseRange } from "./time.ts";

test("weeks start on Monday in Beijing time", () => {
  assert.equal(mondayOf("2026-10-10"), "2026-10-05");
  assert.equal(mondayOf("2026-10-11"), "2026-10-05");
  assert.equal(mondayOf("2026-10-12"), "2026-10-12");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("a month grid starts on Monday and covers the whole month", () => {
  assert.equal(addMonths("2026-10", 1), "2026-11");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  const october = monthGrid("2026-10");
  assert.equal(october[0], "2026-09-28");
  assert.equal(october.at(-1), "2026-11-01");
  assert.equal(october.length % 7, 0);
  const allDayStart = new Date("2026-10-12T00:00:00+08:00");
  const allDayEnd = new Date("2026-10-13T00:00:00+08:00");
  assert.equal(isAllDay(allDayStart, allDayEnd), true);
  assert.equal(formatOccupied(allDayStart, allDayEnd), "12日 全天");
  assert.equal(
    formatOccupied(new Date("2026-10-12T14:00:00+08:00"), new Date("2026-10-12T16:00:00+08:00")),
    "12日 14:00–16:00",
  );
});

test("ranges are read as Beijing time", () => {
  const result = parseRange({
    startDate: "2026-10-10",
    startTime: "14:00",
    endDate: "2026-10-10",
    endTime: "17:00",
  });
  assert.ok("start" in result);
  if (!("start" in result)) return;
  assert.equal(result.start.toISOString(), "2026-10-10T06:00:00.000Z");
  assert.equal(result.end.toISOString(), "2026-10-10T09:00:00.000Z");
  assert.deepEqual(
    parseRange({
      startDate: "2026-10-10",
      startTime: "17:00",
      endDate: "2026-10-10",
      endTime: "14:00",
    }),
    { error: "结束时间要晚于开始时间" },
  );
});
