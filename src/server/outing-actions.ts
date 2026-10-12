"use server";

import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { membership, outing, rsvp } from "@/db/schema";
import { createId } from "@/lib/ids";
import { isTextError, optionalText, requiredText } from "@/lib/text";
import { isMonthKey, parseRange } from "@/lib/time";
import { safeNext } from "@/lib/paths";
import { requireGroupMember, requireUser } from "@/server/guard";
import { previewAvailability } from "@/server/queries";
import { refreshSchedule } from "@/server/refresh";
import { redirect } from "next/navigation";

export type ActionState = { error?: string };

export type AvailabilityPreview =
  | { error: string }
  | { people: { userId: string; name: string; state: "free" | "busy" | "maybe" }[] };

export async function checkAvailability(
  groupId: string,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): Promise<AvailabilityPreview> {
  const user = await requireUser();
  const access = await requireGroupMember(groupId, user.id);
  if (!access) return { error: "你不在这个搭子组里" };

  const range = parseRange({ startDate, startTime, endDate, endTime });
  if ("error" in range) return range;

  const people = await previewAvailability(user.id, groupId, range.start, range.end);
  return { people };
}

export async function createOuting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const access = await requireGroupMember(groupId, user.id);
  if (!access) return { error: "你不在这个搭子组里" };

  const title = requiredText(formData.get("title"), "先写行程叫什么", 80, "标题最多 80 个字");
  if (isTextError(title)) return title;
  const place = optionalText(formData.get("place"), 120, "地点最多 120 个字");
  if (place && typeof place !== "string") return place;

  const range = parseRange({
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  });
  if ("error" in range) return range;

  const requested = [...new Set(formData.getAll("participant").map((value) => String(value)).filter(Boolean))];
  if (requested.length === 0) return { error: "先勾选一起去的人" };
  const members = await db
    .select({ userId: membership.userId })
    .from(membership)
    .where(and(eq(membership.groupId, groupId), inArray(membership.userId, requested)));
  const participants = members.map((member) => member.userId);
  if (participants.length !== requested.length) return { error: "有人不是这个搭子组的" };

  const outingId = createId();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(outing).values({
      id: outingId,
      groupId,
      title,
      place,
      startAt: range.start,
      endAt: range.end,
      createdBy: user.id,
      createdAt: now,
    });
    await tx.insert(rsvp).values(
      participants.map((userId) => ({
        id: createId(),
        outingId,
        userId,
        status: userId === user.id ? "going" : "invited",
        updatedAt: now,
      })),
    );
  });

  refreshSchedule();
  const asksOthers = participants.some((userId) => userId !== user.id);
  if (asksOthers) redirect("/inbox");
  const month = String(formData.get("month") ?? "");
  redirect(isMonthKey(month) ? `/groups/${groupId}?month=${month}` : `/groups/${groupId}`);
}

export async function setRsvp(formData: FormData) {
  const user = await requireUser();
  const outingId = String(formData.get("outingId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "going" && status !== "maybe" && status !== "no") return;

  const rows = await db
    .select({ groupId: outing.groupId })
    .from(outing)
    .where(eq(outing.id, outingId))
    .limit(1);
  const plan = rows[0];
  if (!plan) return;
  const access = await requireGroupMember(plan.groupId, user.id);
  if (!access) return;

  const now = new Date();
  await db
    .insert(rsvp)
    .values({
      id: createId(),
      outingId,
      userId: user.id,
      status,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [rsvp.outingId, rsvp.userId],
      set: { status, updatedAt: now },
    });

  refreshSchedule();
}

export async function updateOuting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const outingId = String(formData.get("outingId") ?? "");
  const rows = await db
    .select({ groupId: outing.groupId, createdBy: outing.createdBy })
    .from(outing)
    .where(eq(outing.id, outingId))
    .limit(1);
  const plan = rows[0];
  if (!plan) return { error: "找不到这个行程" };
  const access = await requireGroupMember(plan.groupId, user.id);
  if (!access) return { error: "你不在这个搭子组里" };
  if (access.role !== "owner" && plan.createdBy !== user.id) return { error: "只有发起人或组长能改这个行程" };

  const title = requiredText(formData.get("title"), "先写行程叫什么", 80, "标题最多 80 个字");
  if (isTextError(title)) return title;
  const place = optionalText(formData.get("place"), 120, "地点最多 120 个字");
  if (place && typeof place !== "string") return place;

  const range = parseRange({
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  });
  if ("error" in range) return range;

  await db
    .update(outing)
    .set({
      title,
      place,
      startAt: range.start,
      endAt: range.end,
    })
    .where(and(eq(outing.id, outingId), eq(outing.groupId, plan.groupId)));

  refreshSchedule();
  const back = String(formData.get("returnTo") ?? "");
  if (back) redirect(safeNext(back));
  const month = String(formData.get("month") ?? "");
  redirect(isMonthKey(month) ? `/groups/${plan.groupId}?month=${month}` : `/groups/${plan.groupId}`);
}

export async function acceptInvite(formData: FormData) {
  await answerInvite(formData, "going");
}

export async function declineInvite(formData: FormData) {
  await answerInvite(formData, "no");
}

async function answerInvite(formData: FormData, status: "going" | "no") {
  const user = await requireUser();
  const outingId = String(formData.get("outingId") ?? "");
  const rows = await db
    .select({ status: rsvp.status, groupId: outing.groupId })
    .from(rsvp)
    .innerJoin(outing, eq(rsvp.outingId, outing.id))
    .where(and(eq(rsvp.outingId, outingId), eq(rsvp.userId, user.id)))
    .limit(1);
  const mine = rows[0];
  if (!mine || mine.status !== "invited") return;
  const access = await requireGroupMember(mine.groupId, user.id);
  if (!access) return;

  await db
    .update(rsvp)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(rsvp.outingId, outingId), eq(rsvp.userId, user.id)));
  refreshSchedule();
}

export async function reviseOutingTime(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const outingId = String(formData.get("outingId") ?? "");
  const rows = await db
    .select({ groupId: outing.groupId, createdBy: outing.createdBy })
    .from(outing)
    .where(eq(outing.id, outingId))
    .limit(1);
  const plan = rows[0];
  if (!plan) return { error: "找不到这个行程" };
  const access = await requireGroupMember(plan.groupId, user.id);
  if (!access) return { error: "你不在这个搭子组里" };

  const mine = await db
    .select({ id: rsvp.id })
    .from(rsvp)
    .where(and(eq(rsvp.outingId, outingId), eq(rsvp.userId, user.id)))
    .limit(1);
  if (!mine[0] && plan.createdBy !== user.id) return { error: "这不是给你的行程" };

  const range = parseRange({
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  });
  if ("error" in range) return range;

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(outing)
      .set({ startAt: range.start, endAt: range.end })
      .where(and(eq(outing.id, outingId), eq(outing.groupId, plan.groupId)));
    await tx
      .update(rsvp)
      .set({ status: "invited", updatedAt: now })
      .where(and(eq(rsvp.outingId, outingId), ne(rsvp.userId, user.id)));
    await tx
      .insert(rsvp)
      .values({
        id: createId(),
        outingId,
        userId: user.id,
        status: "going",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [rsvp.outingId, rsvp.userId],
        set: { status: "going", updatedAt: now },
      });
  });

  refreshSchedule();
  redirect("/inbox");
}

export async function deleteOuting(formData: FormData) {
  const user = await requireUser();
  const outingId = String(formData.get("outingId") ?? "");
  const rows = await db
    .select({ groupId: outing.groupId, createdBy: outing.createdBy })
    .from(outing)
    .where(eq(outing.id, outingId))
    .limit(1);
  const plan = rows[0];
  if (!plan) return;
  const access = await requireGroupMember(plan.groupId, user.id);
  if (!access) return;
  if (access.role !== "owner" && plan.createdBy !== user.id) return;

  await db.delete(outing).where(and(eq(outing.id, outingId), eq(outing.groupId, plan.groupId)));
  refreshSchedule();
}
