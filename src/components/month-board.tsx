"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";

import { DayScreen, entriesOnDay, type CalendarEntry, type CalendarMember } from "@/components/day-screen";
import { ParticipantPicker } from "@/components/participant-picker";
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

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2" aria-label="人物颜色">
        {members.map((member) => (
          <li
            key={member.userId}
            className="inline-flex items-center gap-1.5 rounded-full bg-card py-1 pr-2.5 pl-1.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          >
            <span className="inline-block h-2.5 w-6 rounded-full" style={{ backgroundColor: member.color }} aria-hidden="true" />
            <span>{member.name}</span>
            {member.userId === viewerId ? <span className="text-muted">我</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">颜色对应每个人。点某一天，全屏看这一天的时间。空心是可能忙。</p>

      <section className="overflow-hidden rounded-3xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="sr-only">{formatMonthTitle(month)}</h2>
        <div className="grid grid-cols-7 border-b border-line px-1 py-2 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        {chunkWeeks(days).map((week) => (
          <div key={week[0]} className="grid grid-cols-7">
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
  const marks = marksFor(day, members);

  return (
    <button
      type="button"
      className={`flex min-h-24 flex-col border-b border-r border-line p-1 text-left hover:bg-[#f2f2f7] ${
        inMonth ? "" : "bg-[#f6f6f8]"
      }`}
      onClick={() => onOpen(day)}
      aria-label={dayLabel(day, marks)}
    >
      <span className="mb-1 text-center">
        <span
          className={`inline-grid size-6 place-items-center rounded-full text-[13px] font-medium ${
            isToday ? "bg-accent text-white" : inMonth ? (sunday ? "text-[#ff3b30]" : "text-ink") : "text-[#c7c7cc]"
          }`}
        >
          {dayNumber}
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        {marks.map((mark) => (
          <span
            key={mark.userId}
            className="month-mark"
            style={
              mark.uncertain
                ? { backgroundColor: "transparent", boxShadow: `inset 0 0 0 2px ${mark.color}` }
                : { backgroundColor: mark.color }
            }
            title={mark.uncertain ? `${mark.name} · 可能忙` : mark.name}
          />
        ))}
      </span>
    </button>
  );
}

function marksFor(day: string, members: CalendarMember[]) {
  return members.flatMap((member) => {
    const hits = entriesOnDay(member.entries, day);
    if (hits.length === 0) return [];
    return [
      {
        userId: member.userId,
        name: member.name,
        color: member.color,
        uncertain: hits.every((entry) => entry.level === "maybe" || entry.status === "maybe"),
      },
    ];
  });
}

function dayLabel(day: string, marks: { name: string; uncertain: boolean }[]): string {
  const when = formatDay(day);
  if (marks.length === 0) return `${when}，空闲`;
  return `${when}，${marks.map((mark) => `${mark.name}${mark.uncertain ? "可能忙" : "有安排"}`).join("、")}`;
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
          <p className="mt-1 text-sm text-muted">{allDay ? "这一整天" : "自己定开始和结束，或改成全天"}</p>
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
        {pending ? "创建中…" : allDay ? "创建全天行程" : "创建行程"}
      </button>
    </form>
  );
}
