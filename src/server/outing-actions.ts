"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { outing, rsvp } from "@/db/schema";
import { createId } from "@/lib/ids";
import { isTextError, optionalText, requiredText } from "@/lib/text";
import { parseRange } from "@/lib/time";
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
    await tx.insert(rsvp).values({
      id: createId(),
      outingId,
      userId: user.id,
      status: "going",
      updatedAt: now,
    });
  });

  refreshSchedule();
  redirect(`/groups/${groupId}`);
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
