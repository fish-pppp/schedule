"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  addMonths,
  formatMonthTitle,
  formatOccupied,
  halfBounds,
  halfClock,
  monthKeyOf,
  shanghaiWeekdayIndex,
  type DayHalf,
} from "@/lib/time";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { overlaps, type VisibleEntry } from "@/lib/visibility";
import { checkAvailability, createOuting, type ActionState, type AvailabilityPreview } from "@/server/outing-actions";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;
const initialState: ActionState = {};
const stateLabel = { busy: "忙碌", maybe: "可能有空", free: "空闲" } as const;

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

export function MonthBoard({
  groupId,
  color,
  month,
  today,
  days,
  members,
  viewerId,
}: {
  groupId: string;
  color: string;
  month: string;
  today: string;
  days: string[];
  viewerId: string;
  members: { userId: string; name: string; entries: CalendarEntry[] }[];
}) {
  const [slot, setSlot] = useState<{ day: string; half: DayHalf } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (slot && !dialog.open) dialog.showModal();
    if (!slot && dialog.open) dialog.close();
  }, [slot]);

  return (
    <div className="space-y-4">
      <section aria-label="每个人这个月已经占用的时间">
        <h2 className="text-[13px] font-medium tracking-wide text-muted">这个月已经占用</h2>
        <ul className="mt-2 flex gap-3 overflow-x-auto pb-1">
          {members.map((member) => {
            const occupied = member.entries.filter((entry) => overlapsMonth(entry, month));
            return (
              <li key={member.userId} className="w-64 shrink-0 rounded-2xl bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: member.userId === viewerId ? "#007aff" : color }}
                  >
                    {member.name.slice(0, 1)}
                  </span>
                  <p className="truncate font-medium">
                    {member.name}
                    {member.userId === viewerId ? <span className="ml-1 text-xs font-normal text-muted">我</span> : null}
                  </p>
                </div>
                {occupied.length === 0 ? (
                  <p className="mt-2 text-[13px] text-muted">这个月没有占用</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {occupied.slice(0, 4).map((entry) => (
                      <li key={`${entry.source}-${entry.id}`} className="truncate text-[13px] text-ink">
                        <span className={entry.level === "maybe" ? "text-maybe" : ""}>
                          {formatOccupied(new Date(entry.startAt), new Date(entry.endAt))}
                        </span>
                        <span className="text-muted"> · {entryLabel(entry)}</span>
                      </li>
                    ))}
                    {occupied.length > 4 ? <li className="text-[13px] text-muted">还有 {occupied.length - 4} 段</li> : null}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="overflow-hidden rounded-3xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="sr-only">{formatMonthTitle(month)}</h2>
        <div className="grid grid-cols-7 border-b border-line px-1 py-2 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = monthKeyOf(day) === month;
            const isToday = day === today;
            const dayNumber = Number(day.slice(8, 10));
            const sunday = shanghaiWeekdayIndex(new Date(`${day}T12:00:00+08:00`)) === 0;
            return (
              <div key={day} className={`min-h-24 border-b border-r border-line p-1 ${inMonth ? "" : "bg-[#f6f6f8]"}`}>
                <p className="mb-1 text-center">
                  <span
                    className={`inline-grid size-6 place-items-center rounded-full text-[13px] font-medium ${
                      isToday ? "bg-accent text-white" : inMonth ? (sunday ? "text-[#ff3b30]" : "text-ink") : "text-[#c7c7cc]"
                    }`}
                  >
                    {dayNumber}
                  </span>
                </p>
                <HalfButton
                  day={day}
                  half="morning"
                  inMonth={inMonth}
                  members={members}
                  color={color}
                  groupId={groupId}
                  onOpen={setSlot}
                />
                <HalfButton
                  day={day}
                  half="afternoon"
                  inMonth={inMonth}
                  members={members}
                  color={color}
                  groupId={groupId}
                  onOpen={setSlot}
                />
              </div>
            );
          })}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="slot-dialog rounded-[28px] bg-paper p-0 text-ink backdrop:bg-black/35"
        onClose={() => setSlot(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setSlot(null);
        }}
      >
        {slot ? (
          <SlotForm
            key={`${slot.day}-${slot.half}`}
            titleId={titleId}
            groupId={groupId}
            day={slot.day}
            half={slot.half}
            onClose={() => setSlot(null)}
          />
        ) : null}
      </dialog>
    </div>
  );
}

function HalfButton({
  day,
  half,
  inMonth,
  members,
  color,
  groupId,
  onOpen,
}: {
  day: string;
  half: DayHalf;
  inMonth: boolean;
  members: { userId: string; name: string; entries: CalendarEntry[] }[];
  color: string;
  groupId: string;
  onOpen: (slot: { day: string; half: DayHalf }) => void;
}) {
  const bounds = halfBounds(day, half);
  const hits = members.flatMap((member) =>
    member.entries
      .filter((entry) => overlaps(new Date(entry.startAt), new Date(entry.endAt), bounds.start, bounds.end))
      .map((entry) => ({ entry, name: member.name })),
  );
  const shown = hits.slice(0, 2);
  const label = half === "morning" ? "上午" : "下午";

  return (
    <button
      type="button"
      className="mb-1 flex w-full flex-col items-stretch rounded-lg px-1 py-0.5 text-left hover:bg-[#f2f2f7]"
      onClick={() => onOpen({ day, half })}
      aria-label={`${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日${label}，创建行程`}
    >
      <span className={`text-[10px] ${inMonth ? "text-muted" : "text-[#c7c7cc]"}`}>{label}</span>
      {shown.map(({ entry, name }) => (
        <span
          key={`${entry.source}-${entry.id}-${name}`}
          className="mt-0.5 truncate rounded px-1 text-[10px] leading-4 text-white"
          style={{ backgroundColor: chipColor(entry, groupId, color) }}
        >
          {entry.level === "detail" ? entryLabel(entry) : name}
        </span>
      ))}
      {hits.length > 2 ? <span className="text-[10px] text-muted">+{hits.length - 2}</span> : null}
    </button>
  );
}

function SlotForm({
  titleId,
  groupId,
  day,
  half,
  onClose,
}: {
  titleId: string;
  groupId: string;
  day: string;
  half: DayHalf;
  onClose: () => void;
}) {
  const clock = halfClock(half);
  const [state, action, pending] = useActionState(createOuting, initialState);
  const [preview, setPreview] = useState<AvailabilityPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkAvailability(groupId, day, clock.start, day, clock.end).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId, day, clock.start, clock.end]);

  const month = monthKeyOf(day);
  const heading = `${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日 ${half === "morning" ? "上午" : "下午"}`;

  return (
    <form action={action} className="space-y-4 p-5">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="startDate" value={day} />
      <input type="hidden" name="endDate" value={day} />
      <input type="hidden" name="startTime" value={clock.start} />
      <input type="hidden" name="endTime" value={clock.end} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {clock.start}–{clock.end} · 北京时间
          </p>
        </div>
        <button type="button" className="text-sm font-medium text-accent" onClick={onClose}>
          取消
        </button>
      </div>
      <label className="block">
        <span className={labelClass}>行程</span>
        <input className={inputClass} name="title" required maxLength={80} placeholder="喝咖啡" autoFocus />
      </label>
      <label className="block">
        <span className={labelClass}>地点</span>
        <input className={inputClass} name="place" maxLength={120} placeholder="可选" />
      </label>
      <AvailabilityList preview={preview} />
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={`${buttonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "创建中…" : "创建行程"}
      </button>
    </form>
  );
}

function AvailabilityList({ preview }: { preview: AvailabilityPreview | null }) {
  if (!preview) return <p className="text-sm text-muted">正在看大家的空闲…</p>;
  if ("error" in preview) return <p className="text-sm text-accent">{preview.error}</p>;
  return (
    <ul className="overflow-hidden rounded-2xl bg-card text-sm">
      {preview.people.map((person) => (
        <li key={person.userId} className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0">
          <span>{person.name}</span>
          <span className={person.state === "free" ? "text-muted" : "font-medium"}>{stateLabel[person.state]}</span>
        </li>
      ))}
    </ul>
  );
}

function overlapsMonth(entry: CalendarEntry, month: string): boolean {
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00+08:00`);
  return overlaps(new Date(entry.startAt), new Date(entry.endAt), start, end);
}

function entryLabel(entry: CalendarEntry): string {
  if (entry.level === "busy") return "忙碌";
  if (entry.level === "maybe") return "可能忙";
  return entry.title ?? "忙碌";
}

function chipColor(entry: CalendarEntry, groupId: string, color: string): string {
  if (entry.level === "maybe") return "#ff9500";
  if (entry.level === "busy") return "#8e8e93";
  if (entry.source === "outing" && entry.groupId && entry.groupId !== groupId) return "#8e8e93";
  return color;
}
