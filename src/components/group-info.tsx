import Link from "next/link";

import { CopyLink } from "@/components/copy-link";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { RenameGroup } from "@/components/rename-group";

export function GroupInfo({
  groupId,
  name,
  color,
  inviteCode,
  blocksHref,
  sole,
}: {
  groupId: string;
  name: string;
  color: string;
  inviteCode: string;
  blocksHref: string;
  sole: boolean;
}) {
  return (
    <header className="flex items-center gap-1">
      <h1 className="min-w-0 flex-1">
        <RenameGroup groupId={groupId} name={name} color={color} />
      </h1>
      <LeaveGroupButton groupId={groupId} name={name} sole={sole} />
      <CopyLink path={`/join/${inviteCode}`} />
      <Link href={blocksHref} className="shrink-0 px-2 py-1.5 text-[15px] font-medium text-accent">
        添加占用
      </Link>
    </header>
  );
}