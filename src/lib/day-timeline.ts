import { dayBounds, formatClock, isYmd } from "./time.ts";
import { overlaps, type VisibleEntry } from "./visibility.ts";

export type DayMember = {
  userId: string;
  name: string;
  color: string;
  entries: readonly VisibleEntry[];
};

export type DayEntryDescription = {
  label: string;
  timeLabel: string;
  uncertain: boolean;
  detail: string;
};

export type DaySlicePerson = {
  key: string;
  userId: string;
  name: string;
  color: string;
  label: string;
  timeLabel: string;
  uncertain: boolean;
  detail: string;
};

export type DaySlice = {
  startRatio: number;
  endRatio: number;
  people: DaySlicePerson[];
};

function statusLabel(entry: VisibleEntry): string {
  if (entry.level === "busy") return "忙碌";
  if (entry.level === "maybe") return "可能忙";
  const title = entry.title?.trim();
  return title ? title : "忙碌";
}

function isUncertain(entry: VisibleEntry): boolean {
  return entry.level === "maybe" || entry.status === "maybe";
}

export function describeDayEntry(day: string, entry: VisibleEntry, contextGroupId: string): DayEntryDescription {
  if (!isYmd(day)) return { label: "", timeLabel: "", uncertain: false, detail: "" };
  const bounds = dayBounds(day);
  const startsBefore = entry.startAt < bounds.start;
  const endsAfter = entry.endAt > bounds.end;
  const endsAtDayEnd = endsAfter || entry.endAt.getTime() === bounds.end.getTime();
  const startText = startsBefore ? "00:00" : formatClock(entry.startAt);
  const endText = endsAtDayEnd ? "24:00" : formatClock(entry.endAt);
  const note = startsBefore && endsAfter ? "跨天" : startsBefore ? "从前一天" : endsAfter ? "到后一天" : "";
  const timeLabel = note ? `${startText}–${endText}（${note}）` : `${startText}–${endText}`;
  const label = statusLabel(entry);
  const extras: string[] = [];
  if (entry.level === "detail" && entry.place?.trim()) extras.push(entry.place.trim());
  if (entry.level === "detail" && entry.status === "maybe") extras.push("可能参加");
  if (entry.level === "detail" && entry.source === "outing" && entry.groupId && entry.groupId !== contextGroupId) {
    extras.push("其他搭子组");
  }
  return {
    label,
    timeLabel,
    uncertain: isUncertain(entry),
    detail: [timeLabel, label, ...extras].join(" · "),
  };
}

function oneBandPerPerson(
  active: { person: DaySlicePerson }[],
): DaySlicePerson[] {
  const people: DaySlicePerson[] = [];
  for (const mark of active) {
    const existing = people.find((person) => person.userId === mark.person.userId);
    if (!existing) {
      people.push({ ...mark.person, key: mark.person.userId });
      continue;
    }
    existing.uncertain = existing.uncertain && mark.person.uncertain;
    existing.label = `${existing.label}、${mark.person.label}`;
    existing.timeLabel = `${existing.timeLabel}；${mark.person.timeLabel}`;
    existing.detail = `${existing.detail}；${mark.person.detail}`;
  }
  return people;
}

/**
 * One horizontal day, 00:00–24:00. People who overlap share that stretch
 * and stay in member order so the row can stack a different color per person.
 */
export function buildDaySlices(day: string, members: readonly DayMember[], contextGroupId: string): DaySlice[] {
  if (!isYmd(day)) return [];
  const bounds = dayBounds(day);
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  const span = endMs - startMs;
  if (span <= 0) return [];

  const marks: { start: number; end: number; order: number; person: DaySlicePerson }[] = [];
  let order = 0;
  for (const member of members) {
    for (const entry of member.entries) {
      if (!overlaps(entry.startAt, entry.endAt, bounds.start, bounds.end)) continue;
      const start = Math.max(entry.startAt.getTime(), startMs);
      const end = Math.min(entry.endAt.getTime(), endMs);
      if (start >= end) continue;
      const described = describeDayEntry(day, entry, contextGroupId);
      marks.push({
        start,
        end,
        order,
        person: {
          key: `${entry.source}:${entry.id}:${member.userId}`,
          userId: member.userId,
          name: member.name,
          color: member.color,
          label: described.label,
          timeLabel: described.timeLabel,
          uncertain: described.uncertain,
          detail: described.detail,
        },
      });
      order += 1;
    }
  }
  if (marks.length === 0) return [];

  const times = [...new Set(marks.flatMap((mark) => [mark.start, mark.end]))].sort((a, b) => a - b);
  const slices: DaySlice[] = [];
  let current: { start: number; end: number; people: DaySlicePerson[]; signature: string } | null = null;

  const flush = () => {
    if (!current) return;
    slices.push({
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
    const active = marks
      .filter((mark) => mark.start <= t0 && mark.end >= t1)
      .sort((a, b) => a.order - b.order);
    if (active.length === 0) {
      flush();
      continue;
    }
    const people = oneBandPerPerson(active);
    const signature = people.map((person) => `${person.userId}:${person.uncertain ? "maybe" : "busy"}:${person.detail}`).join("|");
    if (current && current.signature === signature) {
      current.end = t1;
      continue;
    }
    flush();
    current = { start: t0, end: t1, people, signature };
  }
  flush();
  return slices;
}

export type DayBand = DaySlicePerson & {
  startRatio: number;
  endRatio: number;
  lane: number;
};

/** Keep each person on one horizontal line, and join touching pieces of the same plan. */
export function layoutDayBands(
  day: string,
  members: readonly DayMember[],
  contextGroupId: string,
): { bands: DayBand[]; laneCount: number } {
  const slices = buildDaySlices(day, members, contextGroupId);
  const laneIds = members
    .filter((member) => slices.some((slice) => slice.people.some((person) => person.userId === member.userId)))
    .map((member) => member.userId);
  const laneOf = new Map(laneIds.map((userId, index) => [userId, index]));
  const bands: DayBand[] = [];

  for (const userId of laneIds) {
    for (const slice of slices) {
      const person = slice.people.find((item) => item.userId === userId);
      if (!person) continue;
      const lane = laneOf.get(userId) ?? 0;
      const previous = bands[bands.length - 1];
      const samePlan =
        previous?.userId === userId &&
        previous.uncertain === person.uncertain &&
        previous.detail === person.detail &&
        Math.abs(previous.endRatio - slice.startRatio) < 1e-6;
      if (samePlan && previous) {
        previous.endRatio = slice.endRatio;
        continue;
      }
      bands.push({ ...person, startRatio: slice.startRatio, endRatio: slice.endRatio, lane });
    }
  }

  return { bands, laneCount: laneIds.length };
}
