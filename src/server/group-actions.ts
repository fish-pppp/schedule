"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { buddyGroup, membership } from "@/db/schema";
import { groupColor } from "@/lib/colors";
import { createId, createInviteCode } from "@/lib/ids";
import { isTextError, requiredText } from "@/lib/text";
import { findGroupByInvite } from "@/server/queries";
import { refreshSchedule } from "@/server/refresh";
import { requireUser } from "@/server/guard";

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
