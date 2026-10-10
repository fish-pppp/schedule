import "server-only";

import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { buddyGroup, membership, outing, personalBlock, rsvp, user } from "@/db/schema";
import {
  availabilityDuring,
  visibleEntries,
  type Availability,
  type PersonalBlock,
  type RsvpStatus,
  type VisibleEntry,
} from "@/lib/visibility";
import { currentShanghaiYmd, dayBounds, isMonthKey, monthGrid, monthKeyOf } from "@/lib/time";

export async function getHome(userId: string) {
  const now = new Date();
  const [groups, blocks, upcomingOutings] = await Promise.all([
    db
      .select({
        id: buddyGroup.id,
        name: buddyGroup.name,
        color: buddyGroup.color,
        role: membership.role,
      })
      .from(membership)
      .innerJoin(buddyGroup, eq(membership.groupId, buddyGroup.id))
      .where(eq(membership.userId, userId))
      .orderBy(asc(membership.createdAt)),
    db
      .select()
      .from(personalBlock)
      .where(and(eq(personalBlock.userId, userId), gt(personalBlock.endAt, now)))
      .orderBy(asc(personalBlock.startAt))
      .limit(12),
    db
      .select({
        id: outing.id,
        title: outing.title,
        place: outing.place,
        startAt: outing.startAt,
        endAt: outing.endAt,
        groupId: outing.groupId,
        groupName: buddyGroup.name,
        color: buddyGroup.color,
        status: rsvp.status,
      })
      .from(rsvp)
      .innerJoin(outing, eq(rsvp.outingId, outing.id))
      .innerJoin(buddyGroup, eq(outing.groupId, buddyGroup.id))
      .where(and(eq(rsvp.userId, userId), inArray(rsvp.status, ["going", "maybe"]), gt(outing.endAt, now)))
      .orderBy(asc(outing.startAt))
      .limit(12),
  ]);

  const groupIds = groups.map((group) => group.id);
  const counts =
    groupIds.length === 0
      ? []
      : await db
          .select({
            groupId: membership.groupId,
            total: sql<number>`cast(count(*) as int)`,
          })
          .from(membership)
          .where(inArray(membership.groupId, groupIds))
          .groupBy(membership.groupId);

  return { groups, blocks, upcomingOutings, counts };
}

export async function getOwnBlocks(userId: string) {
  return db
    .select()
    .from(personalBlock)
    .where(eq(personalBlock.userId, userId))
    .orderBy(asc(personalBlock.startAt));
}

export type GroupPageMember = {
  userId: string;
  name: string;
  role: string;
  entries: VisibleEntry[];
};

export type GroupPageOuting = {
  id: string;
  title: string;
  place: string | null;
  startAt: Date;
  endAt: Date;
  createdBy: string;
  responses: { userId: string; name: string; status: string }[];
};

export async function getGroupPage(userId: string, groupId: string, monthParam: string | undefined) {
  const access = await db
    .select({
      role: membership.role,
      id: buddyGroup.id,
      name: buddyGroup.name,
      color: buddyGroup.color,
      inviteCode: buddyGroup.inviteCode,
    })
    .from(membership)
    .innerJoin(buddyGroup, eq(membership.groupId, buddyGroup.id))
    .where(and(eq(membership.userId, userId), eq(membership.groupId, groupId)))
    .limit(1);

  const group = access[0];
  if (!group) return null;

  const today = currentShanghaiYmd();
  const month = monthParam && isMonthKey(monthParam) ? monthParam : monthKeyOf(today);
  const days = monthGrid(month);
  const rangeStart = dayBounds(days[0] ?? `${month}-01`).start;
  const rangeEnd = dayBounds(days.at(-1) ?? `${month}-01`).end;
  const now = new Date();

  const members = await db
    .select({
      userId: membership.userId,
      name: user.name,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(eq(membership.groupId, groupId))
    .orderBy(asc(membership.createdAt));

  const memberIds = members.map((member) => member.userId);
  if (memberIds.length === 0) {
    return { group, month, days, members: [], outings: [], viewerId: userId };
  }

  const [blocks, occupied, upcoming] = await Promise.all([
    db
      .select()
      .from(personalBlock)
      .where(
        and(
          inArray(personalBlock.userId, memberIds),
          lt(personalBlock.startAt, rangeEnd),
          gt(personalBlock.endAt, rangeStart),
        ),
      ),
    db
      .select({
        outingId: outing.id,
        groupId: outing.groupId,
        title: outing.title,
        place: outing.place,
        startAt: outing.startAt,
        endAt: outing.endAt,
        userId: rsvp.userId,
        status: rsvp.status,
      })
      .from(rsvp)
      .innerJoin(outing, eq(rsvp.outingId, outing.id))
      .where(
        and(
          inArray(rsvp.userId, memberIds),
          lt(outing.startAt, rangeEnd),
          gt(outing.endAt, rangeStart),
        ),
      ),
    db
      .select()
      .from(outing)
      .where(and(eq(outing.groupId, groupId), gt(outing.endAt, now)))
      .orderBy(asc(outing.startAt))
      .limit(20),
  ]);

  const upcomingIds = upcoming.map((item) => item.id);
  const responses =
    upcomingIds.length === 0
      ? []
      : await db
          .select({
            outingId: rsvp.outingId,
            userId: rsvp.userId,
            status: rsvp.status,
            name: user.name,
          })
          .from(rsvp)
          .innerJoin(user, eq(user.id, rsvp.userId))
          .where(inArray(rsvp.outingId, upcomingIds));

  const outingMap = new Map<
    string,
    {
      id: string;
      groupId: string;
      title: string;
      place: string | null;
      startAt: Date;
      endAt: Date;
    }
  >();
  const rsvpRows: { outingId: string; userId: string; status: RsvpStatus }[] = [];
  for (const row of occupied) {
    if (row.status !== "going" && row.status !== "maybe" && row.status !== "no") continue;
    outingMap.set(row.outingId, {
      id: row.outingId,
      groupId: row.groupId,
      title: row.title,
      place: row.place,
      startAt: row.startAt,
      endAt: row.endAt,
    });
    rsvpRows.push({ outingId: row.outingId, userId: row.userId, status: row.status });
  }

  const personalBlocks: PersonalBlock[] = blocks.map((item) => ({
    id: item.id,
    userId: item.userId,
    title: item.title,
    startAt: item.startAt,
    endAt: item.endAt,
    hideTitle: item.hideTitle,
  }));

  const memberRows: GroupPageMember[] = members.map((member) => ({
    userId: member.userId,
    name: member.name,
    role: member.role,
    entries: visibleEntries({
      viewerId: userId,
      contextGroupId: groupId,
      viewerGroupIds: [groupId],
      subjectUserId: member.userId,
      subjectInContextGroup: true,
      blocks: personalBlocks,
      outings: [...outingMap.values()],
      rsvps: rsvpRows,
    }),
  }));

  const outingCards: GroupPageOuting[] = upcoming.map((item) => ({
    id: item.id,
    title: item.title,
    place: item.place,
    startAt: item.startAt,
    endAt: item.endAt,
    createdBy: item.createdBy,
    responses: responses
      .filter((response) => response.outingId === item.id)
      .map((response) => ({
        userId: response.userId,
        name: response.name,
        status: response.status,
      })),
  }));

  return {
    group,
    month,
    days,
    members: memberRows,
    outings: outingCards,
    viewerId: userId,
  };
}

export async function previewAvailability(
  viewerId: string,
  groupId: string,
  start: Date,
  end: Date,
): Promise<{ userId: string; name: string; state: Availability }[]> {
  const members = await db
    .select({ userId: membership.userId, name: user.name })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(eq(membership.groupId, groupId))
    .orderBy(asc(membership.createdAt));

  if (members.length === 0) return [];
  const memberIds = members.map((member) => member.userId);

  const [blocks, occupied] = await Promise.all([
    db
      .select()
      .from(personalBlock)
      .where(
        and(inArray(personalBlock.userId, memberIds), lt(personalBlock.startAt, end), gt(personalBlock.endAt, start)),
      ),
    db
      .select({
        outingId: outing.id,
        groupId: outing.groupId,
        title: outing.title,
        place: outing.place,
        startAt: outing.startAt,
        endAt: outing.endAt,
        userId: rsvp.userId,
        status: rsvp.status,
      })
      .from(rsvp)
      .innerJoin(outing, eq(rsvp.outingId, outing.id))
      .where(and(inArray(rsvp.userId, memberIds), lt(outing.startAt, end), gt(outing.endAt, start))),
  ]);

  const outingMap = new Map<
    string,
    { id: string; groupId: string; title: string; place: string | null; startAt: Date; endAt: Date }
  >();
  for (const item of occupied) {
    outingMap.set(item.outingId, {
      id: item.outingId,
      groupId: item.groupId,
      title: item.title,
      place: item.place,
      startAt: item.startAt,
      endAt: item.endAt,
    });
  }

  const people = members.map((member) => {
    const entries = visibleEntries({
      viewerId,
      contextGroupId: groupId,
      viewerGroupIds: [groupId],
      subjectUserId: member.userId,
      subjectInContextGroup: true,
      blocks: blocks.map((item) => ({
        id: item.id,
        userId: item.userId,
        title: item.title,
        startAt: item.startAt,
        endAt: item.endAt,
        hideTitle: item.hideTitle,
      })),
      outings: [...outingMap.values()],
      rsvps: occupied
        .filter(
          (item): item is typeof item & { status: RsvpStatus } =>
            item.status === "going" || item.status === "maybe" || item.status === "no",
        )
        .map((item) => ({
          outingId: item.outingId,
          userId: item.userId,
          status: item.status,
        })),
    });
    return {
      userId: member.userId,
      name: member.name,
      state: availabilityDuring(entries, start, end),
    };
  });

  const rank: Record<Availability, number> = { busy: 0, maybe: 1, free: 2 };
  people.sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name, "zh"));
  return people;
}

export async function findGroupByInvite(code: string) {
  const rows = await db
    .select({
      id: buddyGroup.id,
      name: buddyGroup.name,
      color: buddyGroup.color,
    })
    .from(buddyGroup)
    .where(eq(buddyGroup.inviteCode, code))
    .limit(1);
  return rows[0] ?? null;
}
