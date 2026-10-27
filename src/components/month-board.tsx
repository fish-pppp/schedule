"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";

import { DayScreen, entriesOnDay, type CalendarEntry, type CalendarMember } from "@/components/day-screen";
import { HolidayLabel, HolidayNote } from "@/components/holiday-mark";
import { ParticipantPicker } from "@/components/participant-picker";
import { holidayPhrase, isMarkedRestDay } from "@/lib/holidays";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { addDays, formatDay, formatMonthTitle, monthKeyOf, shanghaiWeekdayIndex } from "@/lib/time";
import { checkAvailability, createOuting, type ActionState, type AvailabilityPreview } from "@/server/outing-actions";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;
const initialState: ActionState = {};

export type { CalendarEntry, CalendarMember };

export function MonthBoard({
  groupId,
  month,
  today,
  days,
  members,
  viewerId,
}: {
  groupId: string;
  month: string;
  today: string;
  days: string[];
  viewerId: string;
  members: CalendarMember[];
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeDay = useCallback(() => setOpenDay(null), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (creating && !dialog.open) dialog.showModal();
    if (!creating && dialog.open) dialog.close();
  }, [creating]);

  const weeks = chunkWeeks(days);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ul className="-mx-1 flex shrink-0 gap-3 overflow-x-auto px-1 text-[13px] text-muted" aria-label="成员">
        {members.map((member) => (
          <li key={member.userId} className="inline-flex shrink-0 items-center gap-1.5">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: member.color }} aria-hidden="true" />
            <span className="text-ink">{member.name}</span>
            {member.userId === viewerId ? <span>我</span> : null}
          </li>
        ))}
      </ul>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card">
        <h2 className="sr-only">{formatMonthTitle(month)}</h2>
        <div className="grid shrink-0 grid-cols-7 border-b border-line px-1 py-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateRows: `repeat(${Math.max(weeks.length, 1)}, minmax(0, 1fr))` }}
        >
          {weeks.map((week) => (
            <div key={week[0]} className="grid min-h-0 grid-cols-7">
              {week.map((cell) => (
                <DayCell
                  key={cell}
                  day={cell}
                  month={month}
                  today={today}
                  members={members}
                  onOpen={(next) => {
                    setCreating(false);
                    setOpenDay(next);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {openDay ? (
        <DayScreen day={openDay} members={members} viewerId={viewerId} onClose={closeDay} onCreate={() => setCreating(true)} />
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="slot-dialog rounded-[28px] bg-paper p-0 text-ink backdrop:bg-black/35"
        onClose={() => setCreating(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setCreating(false);
        }}
      >
        {creating && openDay ? (
          <SlotForm
            key={openDay}
            titleId={titleId}
            groupId={groupId}
            day={openDay}
            viewerId={viewerId}
            members={members.map((member) => ({ userId: member.userId, name: member.name }))}
            onClose={() => setCreating(false)}
          />
        ) : null}
      </dialog>
    </div>
  );
}

function DayCell({
  day,
  month,
  today,
  members,
  onOpen,
}: {
  day: string;
  month: string;
  today: string;
  members: CalendarMember[];
  onOpen: (day: string) => void;
}) {
  const inMonth = monthKeyOf(day) === month;
  const isToday = day === today;
  const dayNumber = Number(day.slice(8, 10));
  const sunday = shanghaiWeekdayIndex(new Date(`${day}T12:00:00+08:00`)) === 0;
  const rest = isMarkedRestDay(day, sunday);
  const marks = marksFor(day, members);

  return (
    <button
      type="button"
      className={`flex h-full min-h-0 flex-col overflow-hidden border-b border-r border-line/80 p-0.5 text-left hover:bg-[#f7f7fa] ${
        inMonth ? "" : "bg-[#f6f6f8]"
      }`}
      onClick={() => onOpen(day)}
      aria-label={dayLabel(day, marks)}
    >
      <span className="mb-0.5 flex w-full shrink-0 flex-col items-center">
        <span
          className={`inline-grid size-5 place-items-center rounded-full text-[12px] font-medium ${
            isToday ? "bg-accent text-white" : inMonth ? (rest ? "text-[#ff3b30]" : "text-ink") : "text-[#c7c7cc]"
          }`}
        >
          {dayNumber}
        </span>
        <HolidayLabel ymd={day} inMonth={inMonth} />
      </span>
      <span className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
        {marks.slice(0, 3).map((mark) => (
          <span key={mark.userId} className="flex min-w-0 items-center gap-1 px-0.5" title={mark.title}>
            <span
              className="inline-block size-1.5 shrink-0 rounded-full"
              style={
                mark.uncertain
                  ? { backgroundColor: "transparent", boxShadow: `inset 0 0 0 1.5px ${mark.color}` }
                  : { backgroundColor: mark.color }
              }
              aria-hidden="true"
            />
            <span className={`truncate text-[10px] leading-none ${inMonth ? "text-ink" : "text-[#c7c7cc]"}`}>
              {mark.label}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

function marksFor(day: string, members: CalendarMember[]) {
  return members.flatMap((member) => {
    const hits = entriesOnDay(member.entries, day);
    if (hits.length === 0) return [];
    const uncertain = hits.every((entry) => entry.level === "maybe" || entry.status === "maybe");
    const titled = hits.find((entry) => entry.title?.trim());
    return [
      {
        userId: member.userId,
        name: member.name,
        color: member.color,
        uncertain,
        label: shortLabel(titled?.title, uncertain),
        title: `${member.name} · ${titled?.title?.trim() || (uncertain ? "可能忙" : "有安排")}`,
      },
    ];
  });
}

function dayLabel(day: string, marks: { name: string; label: string; uncertain: boolean }[]): string {
  const phrase = holidayPhrase(day);
  const when = phrase ? `${formatDay(day)}，${phrase}` : formatDay(day);
  if (marks.length === 0) return `${when}，空闲`;
  return `${when}，${marks.map((mark) => `${mark.name} ${mark.label}`).join("、")}`;
}

function shortLabel(title: string | null | undefined, uncertain: boolean): string {
  const text = title?.trim() || (uncertain ? "可能" : "忙");
  const chars = Array.from(text);
  return chars.length > 5 ? `${chars.slice(0, 5).join("")}…` : text;
}

function chunkWeeks(days: string[]): string[][] {
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

function SlotForm({
  titleId,
  groupId,
  day,
  viewerId,
  members,
  onClose,
}: {
  titleId: string;
  groupId: string;
  day: string;
  viewerId: string;
  members: { userId: string; name: string }[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(createOuting, initialState);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [selected, setSelected] = useState<string[]>([viewerId]);
  const [preview, setPreview] = useState<AvailabilityPreview | null>(null);
  const nextDay = addDays(day, 1);
  const startDate = day;
  const endDate = allDay ? nextDay : day;
  const start = allDay ? "00:00" : startTime;
  const end = allDay ? "00:00" : endTime;
  const invalid = !allDay && endTime <= startTime;
  const nobody = selected.length === 0;
  const people = members.map((member) => ({
    ...member,
    state:
      preview && !("error" in preview)
        ? preview.people.find((person) => person.userId === member.userId)?.state
        : undefined,
  }));
  const heading = `${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日`;

  useEffect(() => {
    if (invalid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkAvailability(groupId, startDate, start, endDate, end).then((result) => {
        if (!cancelled) setPreview(result);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [groupId, startDate, start, endDate, end, invalid]);

  return (
    <form action={action} className="space-y-4 p-5">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="month" value={monthKeyOf(day)} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="startTime" value={start} />
      <input type="hidden" name="endTime" value={end} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
            {heading}
          </h2>
          <HolidayNote ymd={day} />
          <p className="mt-1 text-sm text-muted">
            {allDay ? "这一整天" : "自己定开始和结束，或改成全天"}。别人要在收件箱里同意，行程才会出现。
          </p>
        </div>
        <button type="button" className="text-sm font-medium text-accent" onClick={onClose}>
          取消
        </button>
      </div>
      <label className="flex items-center justify-between rounded-2xl bg-card px-3 py-3 text-[17px]">
        <span>全天</span>
        <input
          type="checkbox"
          className="size-5 accent-[#34c759]"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />
      </label>
      {allDay ? null : (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>开始</span>
            <input className={inputClass} type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label className="block">
            <span className={labelClass}>结束</span>
            <input className={inputClass} type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
        </div>
      )}
      <label className="block">
        <span className={labelClass}>行程</span>
        <input className={inputClass} name="title" required maxLength={80} placeholder="喝咖啡" autoFocus />
      </label>
      <label className="block">
        <span className={labelClass}>地点</span>
        <input className={inputClass} name="place" maxLength={120} placeholder="可选" />
      </label>
      <ParticipantPicker
        people={people}
        selected={selected}
        viewerId={viewerId}
        onToggle={(userId) =>
          setSelected((current) =>
            current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
          )
        }
      />
      {invalid ? <p className="text-sm text-muted">结束时间要晚于开始时间。</p> : null}
      {nobody ? <p className="text-sm text-muted">先勾选一起去的人。</p> : null}
      {preview && "error" in preview ? <p className="text-sm text-accent">{preview.error}</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={`${buttonClass} w-full`} type="submit" disabled={pending || invalid || nobody}>
        {pending ? "发送中…" : allDay ? "发出全天邀请" : "发出邀请"}
      </button>
    </form>
  );
}
