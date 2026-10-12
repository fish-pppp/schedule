import Link from "next/link";
import { Suspense } from "react";

import type { CalendarEntry } from "@/components/day-screen";
import { GroupInfo } from "@/components/group-info";
import { Loading } from "@/components/loading";
import { MonthBoard } from "@/components/month-board";
import { OutingList } from "@/components/outing-list";
import { memberColor } from "@/lib/colors";
import { addMonths, currentShanghaiYmd, formatMonthTitle } from "@/lib/time";
import { requireUser } from "@/server/guard";
import { getGroupPage } from "@/server/queries";
import type { VisibleEntry } from "@/lib/visibility";

export default function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <GroupContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function GroupContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { month } = await searchParams;
  const data = await getGroupPage(user.id, id, month);

  if (!data) {
    return (
      <main id="main" className="space-y-3">
        <h1 className="text-2xl font-semibold">找不到这个搭子组</h1>
        <p className="text-sm text-muted">它可能不存在，或者你还不在里面。</p>
        <Link href="/" className="text-sm font-medium text-accent">
          回到首页
        </Link>
      </main>
    );
  }

  const members = data.members.map((member, index) => ({
    userId: member.userId,
    name: member.name,
    color: memberColor(index),
    entries: member.entries.map(toCalendarEntry),
  }));

  return (
    <main id="main" className="space-y-7">
      <GroupInfo
        name={data.group.name}
        color={data.group.color}
        inviteCode={data.group.inviteCode}
        members={members}
        blocksHref={`/blocks?returnTo=${encodeURIComponent(`/groups/${id}?month=${data.month}`)}`}
      />

      <div className="flex items-end justify-between gap-3 px-1">
        <h2 className="text-[28px] font-semibold tracking-tight">{formatMonthTitle(data.month)}</h2>
        <div className="mb-0.5 flex items-center text-accent">
          <Link className="grid size-8 place-items-center text-[22px] leading-none" href={`/groups/${id}?month=${addMonths(data.month, -1)}`} aria-label="上个月">
            ‹
          </Link>
          <Link className="px-1 text-[15px]" href={`/groups/${id}`}>
            今天
          </Link>
          <Link className="grid size-8 place-items-center text-[22px] leading-none" href={`/groups/${id}?month=${addMonths(data.month, 1)}`} aria-label="下个月">
            ›
          </Link>
        </div>
      </div>

      <MonthBoard
        groupId={id}
        month={data.month}
        today={currentShanghaiYmd()}
        days={data.days}
        members={members}
        viewerId={data.viewerId}
      />

      <OutingList
        outings={data.outings}
        members={data.members}
        viewerId={data.viewerId}
        canModerate={data.group.role === "owner"}
        month={data.month}
      />
    </main>
  );
}

function toCalendarEntry(entry: VisibleEntry): CalendarEntry {
  return {
    id: entry.id,
    source: entry.source,
    level: entry.level,
    title: entry.title,
    place: entry.place,
    startAt: entry.startAt.toISOString(),
    endAt: entry.endAt.toISOString(),
    userId: entry.userId,
    groupId: entry.groupId ?? undefined,
    status: entry.status ?? undefined,
  };
}
