import { dayBounds, formatClock, isYmd } from "./time.ts";
import { overlaps } from "./visibility.ts";

export type SliceEntry = {
  level: "detail" | "busy" | "maybe";
  title: string | null;
  place: string | null;
  startAt: Date;
  endAt: Date;
  status?: string | null;
};

export type SliceMember = {
  userId: string;
  name: string;
  color: string;
  entries: readonly SliceEntry[];
};

export type DayColumnPerson = {
  userId: string;
  name: string;
  color: string;
  label: string;
  timeLabel: string;
  notes: string;
  uncertain: boolean;
};

export type DayColumn = {
  startRatio: number;
  endRatio: number;
  people: DayColumnPerson[];
};

function entryLabel(entry: SliceEntry): string {
  if (entry.level === "busy") return "忙碌";
  if (entry.level === "maybe") return "可能忙";
  const title = entry.title?.trim();
  return title ? title : "忙碌";
}

function entryNotes(entry: SliceEntry): string {
  const notes: string[] = [];
  if (entry.level === "detail" && entry.place?.trim()) notes.push(entry.place.trim());
  if (entry.level === "detail" && entry.status === "maybe") notes.push("可能参加");
  return notes.join(" · ");
}

function entryTime(day: string, entry: SliceEntry): string {
  const bounds = dayBounds(day);
  const startsBefore = entry.startAt < bounds.start;
  const endsAfter = entry.endAt > bounds.end;
  const startText = startsBefore ? "00:00" : formatClock(entry.startAt);
  const endText = endsAfter || entry.endAt.getTime() === bounds.end.getTime() ? "24:00" : formatClock(entry.endAt);
  const note = startsBefore && endsAfter ? "跨天" : startsBefore ? "从前一天" : endsAfter ? "到后一天" : "";
  return note ? `${startText}–${endText}（${note}）` : `${startText}–${endText}`;
}

function isUncertain(entry: SliceEntry): boolean {
  return entry.level === "maybe" || entry.status === "maybe";
}

function mergePeople(active: { order: number; person: DayColumnPerson }[]): DayColumnPerson[] {
  const people: DayColumnPerson[] = [];
  for (const mark of [...active].sort((a, b) => a.order - b.order)) {
    const existing = people.find((person) => person.userId === mark.person.userId);
    if (!existing) {
      people.push({ ...mark.person });
      continue;
    }
    if (!existing.label.split("、").includes(mark.person.label)) existing.label = `${existing.label}、${mark.person.label}`;
    existing.timeLabel = `${existing.timeLabel}；${mark.person.timeLabel}`;
    if (mark.person.notes && !existing.notes.split(" · ").includes(mark.person.notes)) {
      existing.notes = existing.notes ? `${existing.notes} · ${mark.person.notes}` : mark.person.notes;
    }
    existing.uncertain = existing.uncertain && mark.person.uncertain;
  }
  return people;
}

/** Vertical day, 00:00–24:00. People who share a stretch sit side by side in that row. */
export function buildDayColumns(day: string, members: readonly SliceMember[]): DayColumn[] {
  if (!isYmd(day)) return [];
  const bounds = dayBounds(day);
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  const span = endMs - startMs;
  if (span <= 0) return [];

  const marks: { start: number; end: number; order: number; person: DayColumnPerson }[] = [];
  let order = 0;
  for (const member of members) {
    for (const entry of member.entries) {
      if (!overlaps(entry.startAt, entry.endAt, bounds.start, bounds.end)) continue;
      const start = Math.max(entry.startAt.getTime(), startMs);
      const end = Math.min(entry.endAt.getTime(), endMs);
      if (start >= end) continue;
      marks.push({
        start,
        end,
        order,
        person: {
          userId: member.userId,
          name: member.name,
          color: member.color,
          label: entryLabel(entry),
          timeLabel: entryTime(day, entry),
          notes: entryNotes(entry),
          uncertain: isUncertain(entry),
        },
      });
      order += 1;
    }
  }
  if (marks.length === 0) return [];

  const times = [...new Set(marks.flatMap((mark) => [mark.start, mark.end]))].sort((a, b) => a - b);
  const columns: DayColumn[] = [];
  let current: { start: number; end: number; people: DayColumnPerson[]; signature: string } | null = null;

  const flush = () => {
    if (!current) return;
    columns.push({
      startRatio: (current.start - startMs) / span,
      endRatio: (current.end - startMs) / span,
      people: current.people,
    });
    current = null;
  };

  for (let index = 0; index < times.length - 1; index += 1) {
    const t0 = times[index];
    const t1 = times[index + 1];
    if (t0 === undefined || t1 === undefined || t1 <= t0) continue;
    const active = marks.filter((mark) => mark.start <= t0 && mark.end >= t1);
    if (active.length === 0) {
      flush();
      continue;
    }
    const people = mergePeople(active);
    const signature = people
      .map((person) => `${person.userId}:${person.uncertain ? "maybe" : "busy"}:${person.label}:${person.notes}`)
      .join("|");
    if (current && current.signature === signature) {
      current.end = t1;
      continue;
    }
    flush();
    current = { start: t0, end: t1, people, signature };
  }
  flush();
  return columns;
}
