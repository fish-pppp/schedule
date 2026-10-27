import assert from "node:assert/strict";
import test from "node:test";

import { holidayCellText, holidayOn, holidayPhrase, isMarkedRestDay } from "./holidays.ts";
import { addDays, shanghaiWeekdayIndex } from "./time.ts";

test("2026 follows the State Council holiday notice", () => {
  assert.deepEqual(holidayOn("2026-01-01"), { name: "元旦", short: "元旦", off: true });
  assert.equal(holidayOn("2026-01-03")?.off, true);
  assert.deepEqual(holidayOn("2026-01-04"), { name: "元旦", short: "元旦", off: false });
  assert.equal(holidayOn("2026-01-05"), null);

  assert.equal(holidayOn("2026-02-14")?.off, false);
  for (let ymd = "2026-02-15"; ymd <= "2026-02-23"; ymd = addDays(ymd, 1)) {
    assert.equal(holidayOn(ymd)?.name, "春节", ymd);
    assert.equal(holidayOn(ymd)?.off, true, ymd);
  }
  assert.equal(holidayOn("2026-02-13"), null);
  assert.equal(holidayOn("2026-02-24"), null);
  assert.equal(holidayOn("2026-02-28")?.off, false);

  assert.equal(holidayOn("2026-04-04")?.name, "清明节");
  assert.equal(holidayOn("2026-04-06")?.off, true);
  assert.equal(holidayOn("2026-04-07"), null);

  assert.equal(holidayOn("2026-05-01")?.name, "劳动节");
  assert.equal(holidayOn("2026-05-05")?.off, true);
  assert.equal(holidayOn("2026-05-06"), null);
  assert.equal(holidayOn("2026-05-09")?.off, false);

  assert.equal(holidayOn("2026-06-19")?.name, "端午节");
  assert.equal(holidayOn("2026-06-21")?.off, true);
  assert.equal(holidayOn("2026-06-22"), null);

  assert.equal(holidayOn("2026-09-25")?.name, "中秋节");
  assert.equal(holidayOn("2026-09-27")?.off, true);
  assert.equal(holidayOn("2026-09-24"), null);
  assert.equal(holidayOn("2026-09-28"), null);

  assert.equal(holidayOn("2026-10-01")?.name, "国庆节");
  assert.equal(holidayOn("2026-10-07")?.off, true);
  assert.equal(holidayOn("2026-10-08"), null);
  assert.equal(holidayOn("2026-09-20")?.off, false);
  assert.equal(holidayOn("2026-10-10")?.off, false);
});

test("2025 mid-autumn sits inside the combined national day holiday", () => {
  assert.equal(holidayOn("2025-10-01")?.name, "国庆节");
  assert.equal(holidayOn("2025-10-06")?.name, "中秋节");
  assert.equal(holidayOn("2025-10-06")?.off, true);
  assert.equal(holidayOn("2025-10-08")?.name, "国庆节");
  assert.equal(holidayOn("2025-09-28")?.off, false);
  assert.equal(holidayOn("2025-10-11")?.off, false);
  assert.equal(holidayOn("2025-01-28")?.name, "春节");
  assert.equal(holidayOn("2025-01-26")?.off, false);
  assert.equal(holidayOn("2025-01-27"), null);
});

test("2024 boundaries and unpublished years stay exact", () => {
  assert.equal(holidayOn("2024-02-04")?.off, false);
  assert.equal(holidayOn("2024-02-10")?.name, "春节");
  assert.equal(holidayOn("2024-02-17")?.off, true);
  assert.equal(holidayOn("2024-02-18")?.off, false);
  assert.equal(holidayOn("2024-06-08"), null);
  assert.equal(holidayOn("2024-06-10")?.name, "端午节");
  assert.equal(holidayOn("2024-09-17")?.name, "中秋节");
  assert.equal(holidayOn("2024-10-01")?.name, "国庆节");
  assert.equal(holidayOn("2023-10-01"), null);
  assert.equal(holidayOn("2027-01-01"), null);
  assert.equal(holidayOn("not-a-date"), null);
});

test("cells use a short name, and makeup days say 班", () => {
  assert.equal(holidayCellText("2026-10-01"), "国庆");
  assert.equal(holidayCellText("2026-10-10"), "班");
  assert.equal(holidayCellText("2026-05-01"), "劳动节");
  assert.equal(holidayCellText("2026-09-25"), "中秋");
  assert.equal(holidayCellText("2026-10-12"), null);
  assert.equal(holidayPhrase("2026-10-01"), "国庆节");
  assert.equal(holidayPhrase("2026-09-20"), "国庆节，调休上班");

  let marked = 0;
  for (let ymd = "2024-01-01"; ymd <= "2026-12-31"; ymd = addDays(ymd, 1)) {
    const text = holidayCellText(ymd);
    if (!text) continue;
    marked += 1;
    assert.ok(Array.from(text).length <= 3, `${ymd} ${text}`);
  }
  assert.equal(marked, 108);
});

test("makeup Sundays are workdays, and holiday weekdays are rest days", () => {
  const makeupSunday = shanghaiWeekdayIndex(new Date("2026-09-20T12:00:00+08:00")) === 0;
  assert.equal(makeupSunday, true);
  assert.equal(isMarkedRestDay("2026-09-20", makeupSunday), false);
  assert.equal(isMarkedRestDay("2026-10-01", false), true);
  assert.equal(isMarkedRestDay("2026-10-03", false), true);
  assert.equal(isMarkedRestDay("2026-10-11", true), true);
  assert.equal(isMarkedRestDay("2026-10-10", false), false);
  assert.equal(isMarkedRestDay("2026-10-12", false), false);
});
