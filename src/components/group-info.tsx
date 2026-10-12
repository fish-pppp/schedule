import Link from "next/link";

import { CopyLink } from "@/components/copy-link";

export function GroupInfo({
  name,
  color,
  inviteCode,
  blocksHref,
}: {
  name: string;
  color: string;
  inviteCode: string;
  blocksHref: string;
}) {
  return (
    <header className="flex items-center gap-1">
      <h1 className="flex min-w-0 flex-1 items-center gap-2 text-[22px] leading-none font-semibold tracking-tight">
        <span className="inline-block size-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="truncate">{name}</span>
      </h1>
      <CopyLink path={`/join/${inviteCode}`} />
      <Link href={blocksHref} className="shrink-0 px-2 py-1.5 text-[15px] font-medium text-accent">
        添加占用
      </Link>
    </header>
  );
}
