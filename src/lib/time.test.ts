import assert from "node:assert/strict";
import test from "node:test";

import { addDays, mondayOf, parseRange } from "./time.ts";

test("weeks start on Monday in Beijing time", () => {
  assert.equal(mondayOf("2026-10-10"), "2026-10-05");
  assert.equal(mondayOf("2026-10-11"), "2026-10-05");
  assert.equal(mondayOf("2026-10-12"), "2026-10-12");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
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
