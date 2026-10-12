"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { personalBlock } from "@/db/schema";
import { createId } from "@/lib/ids";
import { safeNext } from "@/lib/paths";
import { isTextError, requiredText } from "@/lib/text";
import { parseRange } from "@/lib/time";
import { requireUser } from "@/server/guard";
import { refreshSchedule } from "@/server/refresh";
import { redirect } from "next/navigation";

export type ActionState = { error?: string };

export async function createBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const title = requiredText(formData.get("title"), "先写被什么事占用了", 80, "标题最多 80 个字");
  if (isTextError(title)) return title;

  const range = parseRange({
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  });
  if ("error" in range) return range;

  await db.insert(personalBlock).values({
    id: createId(),
    userId: user.id,
    title,
    startAt: range.start,
    endAt: range.end,
    hideTitle: formData.get("hideTitle") === "on",
    createdAt: new Date(),
  });

  refreshSchedule();
  redirect(safeNext(String(formData.get("returnTo") ?? "/blocks")));
}

export async function updateBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "找不到这段占用" };

  const title = requiredText(formData.get("title"), "先写被什么事占用了", 80, "标题最多 80 个字");
  if (isTextError(title)) return title;

  const range = parseRange({
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
  });
  if ("error" in range) return range;

  const updated = await db
    .update(personalBlock)
    .set({
      title,
      startAt: range.start,
      endAt: range.end,
      hideTitle: formData.get("hideTitle") === "on",
    })
    .where(and(eq(personalBlock.id, id), eq(personalBlock.userId, user.id)))
    .returning({ id: personalBlock.id });
  if (!updated[0]) return { error: "找不到这段占用" };

  refreshSchedule();
  redirect(safeNext(String(formData.get("returnTo") ?? "/blocks")));
}

export async function deleteBlock(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(personalBlock).where(and(eq(personalBlock.id, id), eq(personalBlock.userId, user.id)));
  refreshSchedule();
  redirect(safeNext(String(formData.get("returnTo") ?? "/blocks")));
}
