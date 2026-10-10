import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { buddyGroup, membership } from "@/db/schema";
import { getSession } from "@/server/session";

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

export async function requireGroupMember(groupId: string, userId: string) {
  const rows = await db
    .select({
      role: membership.role,
      groupId: buddyGroup.id,
      groupName: buddyGroup.name,
      color: buddyGroup.color,
      inviteCode: buddyGroup.inviteCode,
    })
    .from(membership)
    .innerJoin(buddyGroup, eq(membership.groupId, buddyGroup.id))
    .where(and(eq(membership.groupId, groupId), eq(membership.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}
