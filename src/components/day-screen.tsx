"use client";

import { useEffect, useMemo, useRef } from "react";

import { HolidayNote } from "@/components/holiday-mark";
import { buildDayColumns, type DayColumnPerson } from "@/lib/day-columns";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
import { dayBounds, formatDay } from "@/lib/time";
import { overlaps, type VisibleEntry } from "@/lib/visibility";

const HOUR_PX = 52;
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

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

  useEffect(() => {
    document.getElementById("day-first-block")?.scrollIntoView({ block: "start" });
  }, [day]);

  const columns = useMemo(
    () =>
      buildDayColumns(
        day,
        members.map((member) => ({
          userId: member.userId,
          name: member.name,
          color: member.color,
          entries: member.entries.map((entry) => ({
            level: entry.level,
            title: entry.title,
            place: entry.place,
            startAt: new Date(entry.startAt),
            endAt: new Date(entry.endAt),
            status: entry.status,
          })),
        })),
      ),
    [day, members],
  );
  const busyIds = new Set(columns.flatMap((column) => column.people.map((person) => person.userId)));
  const free = members.filter((member) => !busyIds.has(member.userId));
  const trackHeight = 24 * HOUR_PX;

  return (
    <div id="day-screen" className="day-screen" role="dialog" aria-modal="true" aria-labelledby="day-chart-title">
      <div className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-muted">这一天</p>
            <h2 id="day-chart-title" tabIndex={-1} className="text-[28px] font-semibold tracking-tight" style={{ outline: "none" }}>
              {formatDay(day)}
            </h2>
            <HolidayNote ymd={day} />
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

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5">
        <ul className="flex gap-3 overflow-x-auto text-[13px] text-muted" aria-label="成员">
          {members.map((member) => (
            <li key={member.userId} className="inline-flex shrink-0 items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: member.color }} aria-hidden="true" />
              <span className="text-ink">{member.name}</span>
              {member.userId === viewerId ? <span>我</span> : null}
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-card p-3">
          <div className="flex">
            <div className="relative w-14 shrink-0 text-[11px] tabular-nums text-muted" style={{ height: trackHeight }} aria-hidden="true">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2"
                  style={{
                    top: `${(hour / 24) * 100}%`,
                    transform: hour === 0 ? "none" : hour === 24 ? "translateY(-100%)" : "translateY(-50%)",
                  }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            <div
              className="day-timetable relative min-w-0 flex-1"
              style={{ height: trackHeight, ["--hour" as string]: `${HOUR_PX}px` }}
            >
              {columns.length === 0 ? (
                <p className="absolute inset-0 grid place-items-center text-sm text-muted">这一天都空闲</p>
              ) : null}
              {columns.map((column) => {
                const px = (column.endRatio - column.startRatio) * trackHeight;
                return (
                  <div
                    key={`${column.startRatio}-${column.people.map((person) => person.userId).join("-")}`}
                    id={column === columns[0] ? "day-first-block" : undefined}
                    className="absolute flex gap-1 scroll-mt-28"
                    style={{
                      left: 4,
                      width: "calc(100% - 8px)",
                      top: `${column.startRatio * 100}%`,
                      height: `${(column.endRatio - column.startRatio) * 100}%`,
                    }}
                  >
                    {column.people.map((person) => (
                      <PersonShare key={person.userId} person={person} tall={px >= 72} medium={px >= 40} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {free.length > 0 && columns.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>空闲</span>
            {free.map((member) => (
              <span key={member.userId} className="inline-flex items-center gap-1.5 text-ink">
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: member.color }} aria-hidden="true" />
                {member.name}
              </span>
            ))}
          </p>
        ) : null}
        <ul className="sr-only">
          {columns.map((column) => (
            <li key={`text-${column.startRatio}`}>
              {column.people
                .map((person) => [person.name, person.timeLabel, person.label, person.notes].filter(Boolean).join(" "))
                .join("，")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PersonShare({ person, tall, medium }: { person: DayColumnPerson; tall: boolean; medium: boolean }) {
  const detail = [person.timeLabel, person.label, person.notes].filter(Boolean).join(" · ");
  return (
    <div
      className={person.uncertain ? "day-share is-maybe" : "day-share"}
      style={{ backgroundColor: person.color }}
      title={`${person.name} · ${detail}`}
    >
      {medium ? <p>{person.name}</p> : null}
      {tall ? <p className="font-normal opacity-90">{person.label}</p> : null}
      {tall ? <p className="font-normal opacity-90">{person.timeLabel}</p> : null}
      {tall && person.notes ? <p className="font-normal opacity-90">{person.notes}</p> : null}
    </div>
  );
}

export function entriesOnDay(entries: CalendarEntry[], day: string): CalendarEntry[] {
  const bounds = dayBounds(day);
  return entries
    .filter((entry) => overlaps(new Date(entry.startAt), new Date(entry.endAt), bounds.start, bounds.end))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}
