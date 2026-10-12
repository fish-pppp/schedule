import Link from "next/link";

import { CopyLink } from "@/components/copy-link";

export function GroupInfo({
  name,
  color,
  inviteCode,
  members,
  blocksHref,
}: {
  name: string;
  color: string;
  inviteCode: string;
  members: { userId: string; name: string; color: string }[];
  blocksHref: string;
}) {
  return (
    <header>
      <h1 className="flex min-w-0 items-center gap-2.5 text-[34px] leading-tight font-semibold tracking-tight">
        <span className="inline-block size-3.5 shrink-0 rounded-[4px]" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="truncate">{name}</span>
      </h1>
      <p className="mt-1 truncate text-[15px] text-muted">{members.map((member) => member.name).join("、")}</p>
      <div className="-ml-2 mt-1 flex items-center">
        <CopyLink path={`/join/${inviteCode}`} />
        <Link href={blocksHref} className="px-2 py-1.5 text-[15px] font-medium text-accent">
          添加占用
        </Link>
      </div>
    </header>
  );
}
