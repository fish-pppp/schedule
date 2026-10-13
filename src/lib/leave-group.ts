export type LeaveMember = {
  userId: string;
  role: string;
};

export type LeavePlan =
  | { kind: "missing" }
  | { kind: "dissolve" }
  | { kind: "leave"; nextOwnerId: string | null };

export function planLeave(members: LeaveMember[], userId: string): LeavePlan {
  const me = members.find((member) => member.userId === userId);
  if (!me) return { kind: "missing" };
  if (members.length <= 1) return { kind: "dissolve" };
  if (me.role !== "owner") return { kind: "leave", nextOwnerId: null };
  const next = members.find((member) => member.userId !== userId);
  return { kind: "leave", nextOwnerId: next?.userId ?? null };
}
