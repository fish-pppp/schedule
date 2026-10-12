export type RsvpStatus = "going" | "maybe" | "no";

export type PersonalBlock = {
  id: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  hideTitle: boolean;
};

export type Outing = {
  id: string;
  groupId: string;
  title: string;
  place: string | null;
  startAt: Date;
  endAt: Date;
};

export type Rsvp = {
  outingId: string;
  userId: string;
  status: RsvpStatus;
};

export type VisibleLevel = "detail" | "busy" | "maybe";

export type VisibleEntry = {
  id: string;
  userId: string;
  startAt: Date;
  endAt: Date;
  source: "personal" | "outing";
  level: VisibleLevel;
  title: string | null;
  place: string | null;
  status: RsvpStatus | null;
  groupId: string | null;
};

const RSVP_STATUSES = new Set<RsvpStatus>(["going", "maybe", "no"]);

export function overlaps(start: Date, end: Date, otherStart: Date, otherEnd: Date): boolean {
  return start < otherEnd && end > otherStart;
}

function isValidRange(start: Date, end: Date): boolean {
  return start < end;
}

/**
 * What `viewerId` can see about `subjectUserId` while looking at `contextGroupId`.
 * Personal titles stay visible to every shared group unless the block hides them.
 * An outing keeps its title and place inside its own group, and for the person
 * it belongs to. Everyone else in another group only gets 忙碌 or 可能忙.
 */
export function visibleEntries(input: {
  viewerId: string;
  contextGroupId: string;
  viewerGroupIds: readonly string[];
  subjectUserId: string;
  subjectInContextGroup: boolean;
  blocks: readonly PersonalBlock[];
  outings: readonly Outing[];
  rsvps: readonly Rsvp[];
}): VisibleEntry[] {
  const viewerInContext = input.viewerGroupIds.includes(input.contextGroupId);
  const isSelf = input.viewerId === input.subjectUserId;
  if (!viewerInContext) return [];
  if (!isSelf && !input.subjectInContextGroup) return [];

  const entries: VisibleEntry[] = [];

  for (const block of input.blocks) {
    if (block.userId !== input.subjectUserId) continue;
    if (!isValidRange(block.startAt, block.endAt)) continue;
    const showTitle = isSelf || !block.hideTitle;
    entries.push({
      id: block.id,
      userId: block.userId,
      startAt: block.startAt,
      endAt: block.endAt,
      source: "personal",
      level: showTitle ? "detail" : "busy",
      title: showTitle ? block.title : null,
      place: null,
      status: null,
      groupId: null,
    });
  }

  const rsvpByOuting = new Map<string, Rsvp>();
  for (const rsvp of input.rsvps) {
    if (rsvp.userId !== input.subjectUserId) continue;
    if (!RSVP_STATUSES.has(rsvp.status)) continue;
    rsvpByOuting.set(rsvp.outingId, rsvp);
  }

  for (const outing of input.outings) {
    const rsvp = rsvpByOuting.get(outing.id);
    if (!rsvp || rsvp.status === "no") continue;
    if (!isValidRange(outing.startAt, outing.endAt)) continue;
    const showDetail = isSelf || outing.groupId === input.contextGroupId;
    entries.push({
      id: outing.id,
      userId: input.subjectUserId,
      startAt: outing.startAt,
      endAt: outing.endAt,
      source: "outing",
      level: showDetail ? "detail" : rsvp.status === "maybe" ? "maybe" : "busy",
      title: showDetail ? outing.title : null,
      place: showDetail ? outing.place : null,
      status: rsvp.status,
      groupId: showDetail ? outing.groupId : null,
    });
  }

  entries.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id));
  return entries;
}

export type Availability = "free" | "busy" | "maybe";

export function availabilityDuring(
  entries: readonly VisibleEntry[],
  start: Date,
  end: Date,
): Availability {
  if (!isValidRange(start, end)) return "free";
  let maybe = false;
  for (const entry of entries) {
    if (!overlaps(entry.startAt, entry.endAt, start, end)) continue;
    if (entry.level === "maybe" || entry.status === "maybe") {
      maybe = true;
      continue;
    }
    return "busy";
  }
  return maybe ? "maybe" : "free";
}
