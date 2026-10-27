import { addDays } from "./time.ts";

/**
 * Statutory holidays and the makeup workdays published with them.
 * Each year follows 国务院办公厅关于部分节假日安排的通知:
 * 2024 https://www.gov.cn/zhengce/zhengceku/202310/content_6911528.htm
 * 2025 https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm
 * 2026 https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
 * Leave a year out until that notice exists. Makeup days are not derivable from the calendar.
 */
export type StatutoryHoliday = {
  /** Full name, e.g. 国庆节. */
  name: string;
  /** At most three characters, for a month cell. */
  short: string;
  /** False on a makeup workday (调休上班). */
  off: boolean;
};

type HolidayDay = {
  name: string;
  off: boolean;
};

const SHORT_NAME: Record<string, string> = {
  元旦: "元旦",
  春节: "春节",
  清明节: "清明",
  劳动节: "劳动节",
  端午节: "端午",
  中秋节: "中秋",
  国庆节: "国庆",
};

const days = new Map<string, HolidayDay>();

function through(start: string, end: string): string[] {
  const result: string[] = [];
  for (let ymd = start; ymd <= end; ymd = addDays(ymd, 1)) result.push(ymd);
  return result;
}

function fill(name: string, off: readonly string[], work: readonly string[] = []) {
  for (const ymd of off) days.set(ymd, { name, off: true });
  for (const ymd of work) days.set(ymd, { name, off: false });
}

fill("元旦", ["2024-01-01"]);
fill("春节", through("2024-02-10", "2024-02-17"), ["2024-02-04", "2024-02-18"]);
fill("清明节", through("2024-04-04", "2024-04-06"), ["2024-04-07"]);
fill("劳动节", through("2024-05-01", "2024-05-05"), ["2024-04-28", "2024-05-11"]);
fill("端午节", ["2024-06-10"]);
fill("中秋节", through("2024-09-15", "2024-09-17"), ["2024-09-14"]);
fill("国庆节", through("2024-10-01", "2024-10-07"), ["2024-09-29", "2024-10-12"]);

fill("元旦", ["2025-01-01"]);
fill("春节", through("2025-01-28", "2025-02-04"), ["2025-01-26", "2025-02-08"]);
fill("清明节", through("2025-04-04", "2025-04-06"));
fill("劳动节", through("2025-05-01", "2025-05-05"), ["2025-04-27"]);
fill("端午节", through("2025-05-31", "2025-06-02"));
fill("国庆节", through("2025-10-01", "2025-10-08"), ["2025-09-28", "2025-10-11"]);
// 2025 国庆 and 中秋 are one published holiday. October 6 is 中秋 itself.
days.set("2025-10-06", { name: "中秋节", off: true });

fill("元旦", through("2026-01-01", "2026-01-03"), ["2026-01-04"]);
fill("春节", through("2026-02-15", "2026-02-23"), ["2026-02-14", "2026-02-28"]);
fill("清明节", through("2026-04-04", "2026-04-06"));
fill("劳动节", through("2026-05-01", "2026-05-05"), ["2026-05-09"]);
fill("端午节", through("2026-06-19", "2026-06-21"));
fill("中秋节", through("2026-09-25", "2026-09-27"));
fill("国庆节", through("2026-10-01", "2026-10-07"), ["2026-09-20", "2026-10-10"]);

export function holidayOn(ymd: string): StatutoryHoliday | null {
  const found = days.get(ymd);
  if (!found) return null;
  const short = SHORT_NAME[found.name];
  if (!short) return null;
  return { name: found.name, short, off: found.off };
}

/** Label drawn inside a month cell: the short holiday name, or 班 on a makeup workday. */
export function holidayCellText(ymd: string): string | null {
  const holiday = holidayOn(ymd);
  if (!holiday) return null;
  return holiday.off ? holiday.short : "班";
}

/** Sentence fragment for a day heading or an accessible name. */
export function holidayPhrase(ymd: string): string | null {
  const holiday = holidayOn(ymd);
  if (!holiday) return null;
  return holiday.off ? holiday.name : `${holiday.name}，调休上班`;
}

/**
 * Whether the day number is drawn in red.
 * A statutory day off is red on any weekday. A makeup workday stays dark, including Sunday.
 * Other Sundays stay red, matching the rest of the calendar.
 */
export function isMarkedRestDay(ymd: string, sunday: boolean): boolean {
  const holiday = holidayOn(ymd);
  if (holiday) return holiday.off;
  return sunday;
}
