"use client";

import { useEffect, useRef } from "react";

import { buttonClass, secondaryButtonClass } from "@/lib/ui";
import {
  addDays,
  dayBounds,
  formatClock,
  formatDay,
  isAllDay,
  shanghaiYmd,
} from "@/lib/time";
import { overlaps, type VisibleEntry } from "@/lib/visibility";

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24] as const;

export type CalendarEntry = {
  id: string;
  source: VisibleEntry["source"];
  level: VisibleEntry["level"];
  title: string | null;
  place: string | null;
  startAt: string;
  endAt: string;
  userId: string;
  groupId?: string;
  status?: string;
};

export type CalendarMember = {
  userId: string;
  name: string;
  color: string;
  entries: CalendarEntry[];
};

export function DayScreen({
  day,
  members,
  viewerId,
  onClose,
  onCreate,
}: {
  day: string;
  members: CalendarMember[];
  viewerId: string;
  onClose: () => void;
  onCreate: () => void;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("day-chart-title")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      onCloseRef.current();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [day]);

  return (
    <div id="day-screen" className="day-screen" role="dialog" aria-modal="true" aria-labelledby="day-chart-title">
      <div className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-muted">这一天</p>
            <h2 id="day-chart-title" tabIndex={-1} className="text-[28px] font-semibold tracking-tight" style={{ outline: "none" }}>
              {formatDay(day)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              返回
            </button>
            <button type="button" className={buttonClass} onClick={onCreate}>
              约这一天
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-5">
        <p className="text-sm text-muted">横条是 0 点到 24 点，颜色和日历上的人一致。斜线是可能忙。</p>
        <ul className="space-y-3">
          {members.map((member) => {
            const items = entriesOnDay(member.entries, day);
            return (
              <li
                key={member.userId}
                className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                style={{ borderLeft: `4px solid ${member.color}` }}
              >
                <h3 className="flex items-center gap-2 font-medium">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden="true"
                  />
                  {member.name}
                  {member.userId === viewerId ? <span className="text-xs font-normal text-muted">我</span> : null}
                </h3>
                {items.length === 0 ? <p className="mt-3 text-sm text-muted">空闲</p> : null}
                {items.length > 0 ? (
                  <div className="day-scroll mt-3">
                    <div className="min-w-[36rem]">
                      <HourRuler />
                      <div className="day-row">
                        {items.map((entry) => {
                          const span = spanOnDay(entry, day);
                          if (!span) return null;
                          const hours = (span.end - span.start) * 24;
                          const uncertain = entry.level === "maybe" || entry.status === "maybe";
                          return (
                            <div
                              key={`${entry.source}-${entry.id}`}
                              className={uncertain ? "day-span is-maybe" : "day-span"}
                              style={{
                                left: `${span.start * 100}%`,
                                width: `${(span.end - span.start) * 100}%`,
                                backgroundColor: member.color,
                              }}
                              title={`${entryLabel(entry)} ${whenLabel(entry, day)}`}
                            >
                              {hours >= 1.5 ? <span>{entryLabel(entry)}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {items.map((entry) => (
                      <li key={`${entry.source}-${entry.id}`} className="text-sm">
                        <p className="font-medium">{entryLabel(entry)}</p>
                        <p className="mt-0.5 tabular-nums text-muted">{whenLabel(entry, day)}</p>
                        {entry.level === "detail" && entry.place ? <p className="text-muted">{entry.place}</p> : null}
                        {entry.level === "detail" && entry.status === "maybe" ? <p className="text-muted">可能参加</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function HourRuler() {
  return (
    <div className="relative mb-1 h-4 text-[11px] tabular-nums text-muted" aria-hidden="true">
      {HOURS.map((hour) => (
        <span
          key={hour}
          className="absolute top-0"
          style={{
            left: `${(hour / 24) * 100}%`,
            transform: hour === 0 ? "none" : hour === 24 ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {String(hour).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

export function entriesOnDay(entries: CalendarEntry[], day: string): CalendarEntry[] {
  const bounds = dayBounds(day);
  return entries
    .filter((entry) => overlaps(new Date(entry.startAt), new Date(entry.endAt), bounds.start, bounds.end))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function entryLabel(entry: CalendarEntry): string {
  if (entry.level === "busy") return "忙碌";
  if (entry.level === "maybe") return "可能忙";
  return entry.title ?? "忙碌";
}

export function whenLabel(entry: CalendarEntry, day: string): string {
  const start = new Date(entry.startAt);
  const end = new Date(entry.endAt);
  if (isAllDay(start, end)) return "全天";
  const startDay = shanghaiYmd(start);
  const endDay = shanghaiYmd(end);
  if (startDay === day && (endDay === day || (endDay === addDays(day, 1) && formatClock(end) === "00:00"))) {
    return formatClock(end) === "00:00" ? `${formatClock(start)} 开始` : `${formatClock(start)}–${formatClock(end)}`;
  }
  if (startDay === day) return `${formatClock(start)} 开始`;
  if (endDay === day) return `直到 ${formatClock(end)}`;
  return "全天";
}

function spanOnDay(entry: CalendarEntry, day: string): { start: number; end: number } | null {
  const bounds = dayBounds(day);
  const span = bounds.end.getTime() - bounds.start.getTime();
  if (span <= 0) return null;
  const start = Math.max(new Date(entry.startAt).getTime(), bounds.start.getTime());
  const end = Math.min(new Date(entry.endAt).getTime(), bounds.end.getTime());
  if (start >= end) return null;
  return { start: (start - bounds.start.getTime()) / span, end: (end - bounds.start.getTime()) / span };
}
