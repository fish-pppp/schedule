import Link from "next/link";

import { HolidayLabel } from "@/components/holiday-mark";
import type { AgendaDay } from "@/lib/agenda";
import { holidayPhrase, isMarkedRestDay } from "@/lib/holidays";
import { monthKeyOf, shanghaiWeekdayIndex } from "@/lib/time";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

export function AgendaMonth({
  month,
  today,
  grid,
  agenda,
  selected,
}: {
  month: string;
  today: string;
  grid: string[];
  agenda: AgendaDay[];
  selected: string | null;
}) {
  const byDay = new Map(agenda.map((day) => [day.ymd, day]));
  const weeks: string[][] = [];
  for (let index = 0; index < grid.length; index += 7) weeks.push(grid.slice(index, index + 7));

  return (
    <section className="overflow-hidden rounded-2xl bg-card" aria-label="月历">
      <div className="grid grid-cols-7 border-b border-line px-1 py-1 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7">
          {week.map((day) => (
            <DayCell
              key={day}
              day={day}
              month={month}
              today={today}
              selected={day === selected}
              entry={byDay.get(day)}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function DayCell({
  day,
  month,
  today,
  selected,
  entry,
}: {
  day: string;
  month: string;
  today: string;
  selected: boolean;
  entry: AgendaDay | undefined;
}) {
  const inMonth = monthKeyOf(day) === month;
  const sunday = shanghaiWeekdayIndex(new Date(`${day}T12:00:00+08:00`)) === 0;
  const rest = isMarkedRestDay(day, sunday);
  const mine = entry?.mine ?? [];
  const others = entry?.others ?? [];
  const lines = [
    ...mine.map((item) => ({ key: item.key, text: item.title, color: item.color, muted: false })),
    ...(others.length > 0
      ? [{ key: `others-${day}`, text: others.length === 1 ? others[0]?.name ?? "" : `${others.length}人`, color: "", muted: true }]
      : []),
  ];
  const shown = lines.slice(0, 2);
  const more = lines.length - shown.length;

  return (
    <Link
      href={`/?view=calendar&month=${month}&day=${day}`}
      className={`flex min-h-[4.6rem] flex-col border-b border-r border-line/80 p-0.5 ${
        selected ? "bg-[#e8f2ff]" : inMonth ? "bg-card" : "bg-[#f6f6f8]"
      }`}
      aria-current={selected ? "date" : undefined}
      aria-label={labelFor(day, mine, others)}
    >
      <span className="mb-0.5 flex w-full shrink-0 flex-col items-center">
        <span
          className={`inline-grid size-5 place-items-center rounded-full text-[12px] font-medium ${
            day === today ? "bg-accent text-white" : inMonth ? (rest ? "text-[#ff3b30]" : "text-ink") : "text-[#c7c7cc]"
          }`}
        >
          {Number(day.slice(8, 10))}
        </span>
        <HolidayLabel ymd={day} inMonth={inMonth} />
      </span>
      <span className="flex min-h-0 flex-col gap-0.5">
        {shown.map((line) =>
          line.muted ? (
            <span key={line.key} className="truncate px-0.5 text-[10px] leading-[14px] text-muted">
              {line.text}
            </span>
          ) : (
            <span
              key={line.key}
              className="truncate rounded-[3px] px-0.5 text-[10px] leading-[14px] text-white"
              style={{ backgroundColor: line.color }}
            >
              {line.text}
            </span>
          ),
        )}
        {more > 0 ? <span className="px-0.5 text-[10px] leading-[14px] text-muted">+{more}</span> : null}
      </span>
    </Link>
  );
}

function labelFor(day: string, mine: AgendaDay["mine"], others: AgendaDay["others"]): string {
  const bits = [
    ...mine.map((item) => item.title),
    ...others.map((item) => `${item.name} ${item.label}`),
  ];
  const phrase = holidayPhrase(day);
  const when = phrase ? `${day}，${phrase}` : day;
  return bits.length === 0 ? `${when}，没有安排` : `${when}，${bits.join("、")}`;
}
