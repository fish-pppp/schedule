export const TIME_ZONE = "Asia/Shanghai";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00+08:00`));
}

function isHm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function shanghaiYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shanghaiWeekdayIndex(date: Date): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(date);
  const index = WEEKDAY_LABELS.indexOf(label as (typeof WEEKDAY_LABELS)[number]);
  if (index < 0) throw new Error(`unknown weekday ${label}`);
  return index;
}

export function addDays(ymd: string, days: number): string {
  const utc = Date.parse(`${ymd}T00:00:00+08:00`) + days * 24 * 60 * 60 * 1000;
  return shanghaiYmd(new Date(utc));
}

export function mondayOf(ymd: string): string {
  const noon = new Date(`${ymd}T12:00:00+08:00`);
  const index = shanghaiWeekdayIndex(noon);
  const delta = index === 0 ? -6 : 1 - index;
  return addDays(ymd, delta);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function dayBounds(ymd: string): { start: Date; end: Date } {
  return {
    start: new Date(`${ymd}T00:00:00+08:00`),
    end: new Date(`${addDays(ymd, 1)}T00:00:00+08:00`),
  };
}

export function currentShanghaiYmd(now = new Date()): string {
  return shanghaiYmd(now);
}

export function formatDay(ymd: string): string {
  const noon = new Date(`${ymd}T12:00:00+08:00`);
  const month = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  return `${month}月${day}日 ${WEEKDAY_NAMES[shanghaiWeekdayIndex(noon)]}`;
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatRange(start: Date, end: Date): string {
  const startDay = shanghaiYmd(start);
  const endDay = shanghaiYmd(end);
  if (startDay === endDay) {
    return `${formatDay(startDay)} ${formatClock(start)}–${formatClock(end)}`;
  }
  return `${formatDay(startDay)} ${formatClock(start)} – ${formatDay(endDay)} ${formatClock(end)}`;
}

export function parseRange(input: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): { start: Date; end: Date } | { error: string } {
  if (!isYmd(input.startDate) || !isYmd(input.endDate) || !isHm(input.startTime) || !isHm(input.endTime)) {
    return { error: "日期或时间格式不对" };
  }
  const start = new Date(`${input.startDate}T${input.startTime}:00+08:00`);
  const end = new Date(`${input.endDate}T${input.endTime}:00+08:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "时间无效" };
  }
  if (end <= start) return { error: "结束时间要晚于开始时间" };
  if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) {
    return { error: "一次最长 31 天" };
  }
  return { start, end };
}
