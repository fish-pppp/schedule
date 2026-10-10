"use client";

import Link from "next/link";
import { useState } from "react";

import { CopyLink } from "@/components/copy-link";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

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
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-[22px] font-semibold tracking-tight">
          <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="truncate">{name}</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            aria-expanded={open}
            aria-controls="group-details"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "收起详情" : "组详情"}
          </button>
          <Link href={blocksHref} className={secondaryButtonClass}>
            添加占用
          </Link>
        </div>
      </div>
      {open ? (
        <section id="group-details" className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-[13px] font-medium text-muted">成员</h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {members.map((member) => (
                <li key={member.userId} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden="true"
                  />
                  {member.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p>
              邀请码 <span className="font-medium">{inviteCode}</span>
            </p>
            <CopyLink path={`/join/${inviteCode}`} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
