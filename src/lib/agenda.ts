import { addDays, dayBounds, formatClock, formatDay, isAllDay, shanghaiYmd } from "./time.ts";

export const AGENDA_HORIZON_DAYS = 90;

export type AgendaGroup = {
  id: string;
  name: string;
  color: string;
};

export type AgendaPerson = {
  userId: string;
  name: string;
  groupIds: readonly string[];
};

export type AgendaBlock = {
  id: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  hideTitle: boolean;
};

export type AgendaOuting = {
  id: string;
  groupId: string;
  title: string;
  place: string | null;
  startAt: Date;
  endAt: Date;
};

export type AgendaRsvp = {
  outingId: string;
  userId: string;
  status: string;
};

export type AgendaMine = {
  key: string;
  title: string;
  when: string;
  meta: string;
  place: string | null;
  color: string;
  href: string;
};

export type AgendaOther = {
  key: string;
  name: string;
  when: string;
  label: string;
  place: string | null;
  href: string | null;
};

export type AgendaDay = {
  ymd: string;
  title: string;
  subtitle: string | null;
  mine: AgendaMine[];
  others: AgendaOther[];
};

const BLOCK_COLOR = "#8e8e93";

export function agendaDayTitle(ymd: string, today: string): { title: string; subtitle: string | null } {
  if (ymd === today) return { title: "今天", subtitle: formatDay(ymd) };
  if (ymd === addDays(today, 1)) return { title: "明天", subtitle: formatDay(ymd) };
  return { title: formatDay(ymd), subtitle: null };
}

export function formatSlot(start: Date, end: Date, ymd: string): string {
  if (!(start < end)) return "";
  if (isAllDay(start, end)) return "全天";
  const startDay = shanghaiYmd(start);
  const lastDay = shanghaiYmd(new Date(end.getTime() - 1));
  if (startDay === lastDay) return `${formatClock(start)}–${formatClock(end)}`;
  if (ymd === startDay) return `${formatClock(start)} 开始`;
  if (ymd === lastDay) return `到 ${formatClock(end)}`;
  return "全天";
}

function coveredDays(start: Date, end: Date, today: string, horizonEnd: string): string[] {
  if (!(start < end)) return [];
  let day = shanghaiYmd(start);
  const last = shanghaiYmd(new Date(end.getTime() - 1));
  if (day < today) day = today;
  const days: string[] = [];
  while (day <= last && day < horizonEnd && days.length < AGENDA_HORIZON_DAYS) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

function shares(groupIds: readonly string[], viewerGroups: ReadonlySet<string>): boolean {
  return groupIds.some((id) => viewerGroups.has(id));
}

export function buildAgenda(input: {
  viewerId: string;
  now: Date;
  today: string;
  groups: readonly AgendaGroup[];
  people: readonly AgendaPerson[];
  blocks: readonly AgendaBlock[];
  outings: readonly AgendaOuting[];
  rsvps: readonly AgendaRsvp[];
}): AgendaDay[] {
  const horizonEnd = addDays(input.today, AGENDA_HORIZON_DAYS);
  const until = dayBounds(horizonEnd).start;
  const viewerGroups = new Set(input.groups.map((group) => group.id));
  const groupById = new Map(input.groups.map((group) => [group.id, group]));
  const outingById = new Map(input.outings.map((outing) => [outing.id, outing]));

  const pending = new Set<string>();
  for (const rsvp of input.rsvps) {
    if (rsvp.status === "invited") pending.add(rsvp.outingId);
  }

  const days = new Map<string, { day: AgendaDay; mine: Array<AgendaMine & { at: number }>; others: Array<AgendaOther & { at: number }> }>();
  const ensure = (ymd: string) => {
    const existing = days.get(ymd);
    if (existing) return existing;
    const heading = agendaDayTitle(ymd, input.today);
    const created = {
      day: { ymd, title: heading.title, subtitle: heading.subtitle, mine: [], others: [] } satisfies AgendaDay,
      mine: [] as Array<AgendaMine & { at: number }>,
      others: [] as Array<AgendaOther & { at: number }>,
    };
    days.set(ymd, created);
    return created;
  };

  const open = (start: Date, end: Date) => start < until && end > input.now;

  for (const block of input.blocks) {
    if (block.userId !== input.viewerId) continue;
    if (!open(block.startAt, block.endAt)) continue;
    for (const ymd of coveredDays(block.startAt, block.endAt, input.today, horizonEnd)) {
      ensure(ymd).mine.push({
        key: `block-${block.id}-${ymd}`,
        title: block.title,
        when: formatSlot(block.startAt, block.endAt, ymd),
        meta: "占用",
        place: null,
        color: BLOCK_COLOR,
        href: `/blocks/${block.id}`,
        at: block.startAt.getTime(),
      });
    }
  }

  for (const rsvp of input.rsvps) {
    if (rsvp.userId !== input.viewerId) continue;
    if (rsvp.status !== "going" && rsvp.status !== "maybe") continue;
    if (pending.has(rsvp.outingId)) continue;
    const outing = outingById.get(rsvp.outingId);
    if (!outing || !open(outing.startAt, outing.endAt)) continue;
    const group = groupById.get(outing.groupId);
    for (const ymd of coveredDays(outing.startAt, outing.endAt, input.today, horizonEnd)) {
      ensure(ymd).mine.push({
        key: `outing-${outing.id}-${ymd}`,
        title: outing.title,
        when: formatSlot(outing.startAt, outing.endAt, ymd),
        meta: group ? (rsvp.status === "maybe" ? `${group.name} · 可能` : group.name) : "行程",
        place: outing.place,
        color: group?.color ?? "#007aff",
        href: `/groups/${outing.groupId}/outings`,
        at: outing.startAt.getTime(),
      });
    }
  }

  for (const person of input.people) {
    if (person.userId === input.viewerId) continue;
    if (!shares(person.groupIds, viewerGroups)) continue;

    for (const block of input.blocks) {
      if (block.userId !== person.userId || !open(block.startAt, block.endAt)) continue;
      const hidden = block.hideTitle;
      for (const ymd of coveredDays(block.startAt, block.endAt, input.today, horizonEnd)) {
        ensure(ymd).others.push({
          key: `${person.userId}-block-${block.id}-${ymd}`,
          name: person.name,
          when: formatSlot(block.startAt, block.endAt, ymd),
          label: hidden ? "忙碌" : block.title,
          place: null,
          href: null,
          at: block.startAt.getTime(),
        });
      }
    }

    for (const rsvp of input.rsvps) {
      if (rsvp.userId !== person.userId) continue;
      if (rsvp.status !== "going" && rsvp.status !== "maybe") continue;
      if (pending.has(rsvp.outingId)) continue;
      const outing = outingById.get(rsvp.outingId);
      if (!outing || !open(outing.startAt, outing.endAt)) continue;
      const detail = viewerGroups.has(outing.groupId);
      for (const ymd of coveredDays(outing.startAt, outing.endAt, input.today, horizonEnd)) {
        ensure(ymd).others.push({
          key: `${person.userId}-outing-${outing.id}-${ymd}`,
          name: person.name,
          when: formatSlot(outing.startAt, outing.endAt, ymd),
          label: detail ? outing.title : rsvp.status === "maybe" ? "可能忙" : "忙碌",
          place: detail ? outing.place : null,
          href: detail ? `/groups/${outing.groupId}/outings` : null,
          at: outing.startAt.getTime(),
        });
      }
    }
  }

  const ordered = [...days.values()].sort((a, b) => a.day.ymd.localeCompare(b.day.ymd));
  return ordered
    .map((entry) => {
      entry.mine.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
      entry.others.sort((a, b) => a.at - b.at || a.name.localeCompare(b.name, "zh") || a.key.localeCompare(b.key));
      return {
        ...entry.day,
        mine: entry.mine.map((item) => ({
          key: item.key,
          title: item.title,
          when: item.when,
          meta: item.meta,
          place: item.place,
          color: item.color,
          href: item.href,
        })),
        others: entry.others.map((item) => ({
          key: item.key,
          name: item.name,
          when: item.when,
          label: item.label,
          place: item.place,
          href: item.href,
        })),
      };
    })
    .filter((day) => day.mine.length > 0 || day.others.length > 0);
}
