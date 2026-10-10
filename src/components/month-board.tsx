"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  addDays,
  addMonths,
  dayBounds,
  formatClock,
  formatDay,
  formatMonthTitle,
  formatOccupied,
  isAllDay,
  monthKeyOf,
  shanghaiWeekdayIndex,
  shanghaiYmd,
} from "@/lib/time";
import { ParticipantPicker } from "@/components/participant-picker";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { overlaps, type VisibleEntry } from "@/lib/visibility";
import { checkAvailability, createOuting, type ActionState, type AvailabilityPreview } from "@/server/outing-actions";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;
const initialState: ActionState = {};

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
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (creating && !dialog.open) dialog.showModal();
    if (!creating && dialog.open) dialog.close();
  }, [creating]);

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
                      <li key={`${entry.source}-${entry.id}-${member.userId}`} className="truncate text-[13px] text-ink">
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
        {chunkWeeks(days).map((week) => (
          <div key={week[0]}>
            <div className="grid grid-cols-7">
              {week.map((cell) => (
                <DayCell
                  key={cell}
                  day={cell}
                  month={month}
                  today={today}
                  members={members}
                  color={color}
                  groupId={groupId}
                  selected={openDay === cell}
                  onOpen={(next) => {
                    setCreating(false);
                    setOpenDay((current) => (current === next ? null : next));
                  }}
                />
              ))}
            </div>
            {openDay && week.includes(openDay) ? (
              <DayAgenda
                day={openDay}
                members={members}
                viewerId={viewerId}
                color={color}
                groupId={groupId}
                onCreate={() => setCreating(true)}
              />
            ) : null}
          </div>
        ))}
      </section>

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
  color,
  groupId,
  selected,
  onOpen,
}: {
  day: string;
  month: string;
  today: string;
  members: { userId: string; name: string; entries: CalendarEntry[] }[];
  color: string;
  groupId: string;
  selected: boolean;
  onOpen: (day: string) => void;
}) {
  const inMonth = monthKeyOf(day) === month;
  const isToday = day === today;
  const dayNumber = Number(day.slice(8, 10));
  const sunday = shanghaiWeekdayIndex(new Date(`${day}T12:00:00+08:00`)) === 0;
  const bounds = dayBounds(day);
  const hits = members.flatMap((member) =>
    member.entries
      .filter((entry) => overlaps(new Date(entry.startAt), new Date(entry.endAt), bounds.start, bounds.end))
      .map((entry) => ({ entry, name: member.name })),
  );
  const shown = dedupeHits(hits).slice(0, 3);

  return (
    <button
      type="button"
      className={`flex min-h-24 flex-col border-b border-r border-line p-1 text-left hover:bg-[#f2f2f7] ${
        selected ? "bg-[#e8f1ff]" : inMonth ? "" : "bg-[#f6f6f8]"
      }`}
      onClick={() => onOpen(day)}
      aria-pressed={selected}
      aria-label={`${Number(day.slice(5, 7))}月${dayNumber}日，展开这一天`}
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
      {shown.map(({ entry, name }) => (
        <span
          key={`${entry.source}-${entry.id}-${name}`}
          className="mb-0.5 truncate rounded px-1 text-[10px] leading-4 text-white"
          style={{ backgroundColor: chipColor(entry, groupId, color) }}
        >
          {chipText(entry, name)}
        </span>
      ))}
      {hits.length > shown.length ? <span className="text-[10px] text-muted">+{hits.length - shown.length}</span> : null}
    </button>
  );
}

function DayAgenda({
  day,
  members,
  viewerId,
  color,
  groupId,
  onCreate,
}: {
  day: string;
  members: { userId: string; name: string; entries: CalendarEntry[] }[];
  viewerId: string;
  color: string;
  groupId: string;
  onCreate: () => void;
}) {
  const ordered = [...members].sort((a, b) => Number(b.userId === viewerId) - Number(a.userId === viewerId));
  return (
    <section className="border-t border-line px-4 py-4" aria-label={formatDay(day)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-tight">{formatDay(day)}</h3>
        <button type="button" className={buttonClass} onClick={onCreate}>
          约这一天
        </button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {ordered.map((member) => {
          const items = entriesOnDay(member.entries, day);
          return (
            <li key={member.userId} className="flex gap-3 py-3">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: member.userId === viewerId ? "#007aff" : color }}
              >
                {member.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {member.name}
                  {member.userId === viewerId ? <span className="ml-1 text-xs font-normal text-muted">我</span> : null}
                </p>
                {items.length === 0 ? <p className="mt-1 text-sm text-muted">这一天没有安排</p> : null}
                <ul className="mt-1 space-y-1">
                  {items.map((entry) => (
                    <li key={`${entry.source}-${entry.id}`} className="text-sm">
                      <span
                        className="mr-2 inline-block size-2 rounded-full align-middle"
                        style={{ backgroundColor: chipColor(entry, groupId, color) }}
                      />
                      <span className="tabular-nums text-muted">{whenLabel(entry, day)}</span>
                      <span className="ml-2">{entryLabel(entry)}</span>
                      {entry.level === "detail" && entry.place ? <span className="text-muted"> · {entry.place}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function chunkWeeks(days: string[]): string[][] {
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

function entriesOnDay(entries: CalendarEntry[], day: string): CalendarEntry[] {
  const bounds = dayBounds(day);
  return entries
    .filter((entry) => overlaps(new Date(entry.startAt), new Date(entry.endAt), bounds.start, bounds.end))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

function whenLabel(entry: CalendarEntry, day: string): string {
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

function overlapsMonth(entry: CalendarEntry, month: string): boolean {
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00+08:00`);
  return overlaps(new Date(entry.startAt), new Date(entry.endAt), start, end);
}

function dedupeHits(hits: { entry: CalendarEntry; name: string }[]) {
  const seen = new Set<string>();
  return hits.filter(({ entry }) => {
    if (entry.level !== "detail") return true;
    const key = `${entry.source}-${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function entryLabel(entry: CalendarEntry): string {
  if (entry.level === "busy") return "忙碌";
  if (entry.level === "maybe") return "可能忙";
  return entry.title ?? "忙碌";
}

function chipText(entry: CalendarEntry, name: string): string {
  const label = entry.level === "detail" ? entryLabel(entry) : name;
  return isAllDay(new Date(entry.startAt), new Date(entry.endAt)) ? `全天 ${label}` : label;
}

function chipColor(entry: CalendarEntry, groupId: string, color: string): string {
  if (entry.level === "maybe") return "#ff9500";
  if (entry.level === "busy") return "#8e8e93";
  if (entry.source === "outing" && entry.groupId && entry.groupId !== groupId) return "#8e8e93";
  return color;
}
