"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { buddyGroup, membership, outing, rsvp } from "@/db/schema";
import { groupColor } from "@/lib/colors";
import { createId, createInviteCode } from "@/lib/ids";
import { planLeave } from "@/lib/leave-group";
import { isTextError, requiredText } from "@/lib/text";
import { findGroupByInvite } from "@/server/queries";
import { refreshSchedule } from "@/server/refresh";
import { requireGroupMember, requireUser } from "@/server/guard";

export type ActionState = { error?: string };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = requiredText(formData.get("name"), "先写一个组名", 40, "组名最多 40 个字");
  if (isTextError(name)) return name;

  const existing = await db
    .select({ id: membership.id })
    .from(membership)
    .where(eq(membership.userId, user.id));
  const id = createId();
  const now = new Date();
  let created = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(buddyGroup).values({
          id,
          name,
          inviteCode: createInviteCode(),
          color: groupColor(existing.length),
          createdBy: user.id,
          createdAt: now,
        });
        await tx.insert(membership).values({
          id: createId(),
          userId: user.id,
          groupId: id,
          role: "owner",
          createdAt: now,
        });
      });
      created = true;
      break;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 4) continue;
      throw error;
    }
  }

  if (!created) return { error: "组没有建成，请再试一次" };
  refreshSchedule();
  redirect(`/groups/${id}`);
}

export async function joinGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const group = await findGroupByInvite(code);
  if (!group) return { error: "这个邀请链接失效了" };

  const existing = await db
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.userId, user.id), eq(membership.groupId, group.id)))
    .limit(1);

  if (!existing[0]) {
    try {
      await db.insert(membership).values({
        id: createId(),
        userId: user.id,
        groupId: group.id,
        role: "member",
        createdAt: new Date(),
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  refreshSchedule();
  redirect(`/groups/${group.id}`);
}

export async function leaveGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const access = await db
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.userId, user.id), eq(membership.groupId, groupId)))
    .limit(1);
  if (!access[0]) redirect("/groups");

  await db.transaction(async (tx) => {
    const members = await tx
      .select({ userId: membership.userId, role: membership.role })
      .from(membership)
      .where(eq(membership.groupId, groupId))
      .orderBy(asc(membership.createdAt));
    const plan = planLeave(members, user.id);
    if (plan.kind === "missing") return;
    if (plan.kind === "dissolve") {
      await tx.delete(buddyGroup).where(eq(buddyGroup.id, groupId));
      return;
    }

    const outingRows = await tx.select({ id: outing.id }).from(outing).where(eq(outing.groupId, groupId));
    if (outingRows.length > 0) {
      await tx.delete(rsvp).where(
        and(
          eq(rsvp.userId, user.id),
          inArray(
            rsvp.outingId,
            outingRows.map((row) => row.id),
          ),
        ),
      );
    }
    await tx.delete(membership).where(and(eq(membership.groupId, groupId), eq(membership.userId, user.id)));
    if (plan.nextOwnerId) {
      await tx
        .update(membership)
        .set({ role: "owner" })
        .where(and(eq(membership.groupId, groupId), eq(membership.userId, plan.nextOwnerId)));
    }
  });

  refreshSchedule();
  redirect("/groups");
}

export async function renameGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = requiredText(formData.get("name"), "先写一个组名", 40, "组名最多 40 个字");
  if (isTextError(name)) return name;

  const access = await requireGroupMember(groupId, user.id);
  if (!access) return { error: "你不在这个组里" };
  if (access.groupName === name) return {};

  await db.update(buddyGroup).set({ name }).where(eq(buddyGroup.id, groupId));
  refreshSchedule();
  return {};
}
