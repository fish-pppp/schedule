import Link from "next/link";
import { Suspense } from "react";

import { CopyLink } from "@/components/copy-link";
import { Loading } from "@/components/loading";
import { MonthBoard, type CalendarEntry } from "@/components/month-board";
import { OutingList } from "@/components/outing-list";
import { addMonths, currentShanghaiYmd, formatMonthTitle } from "@/lib/time";
import { secondaryButtonClass } from "@/lib/ui";
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

  const members = data.members.map((member) => ({
    userId: member.userId,
    name: member.name,
    entries: member.entries.map(toCalendarEntry),
  }));

  return (
    <main id="main" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">搭子组</p>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{data.group.name}</h1>
          <p className="mt-1 text-sm text-muted">{data.members.map((member) => member.name).join("、")}</p>
        </div>
        <Link href={`/blocks?returnTo=${encodeURIComponent(`/groups/${id}?month=${data.month}`)}`} className={secondaryButtonClass}>
          添加占用
        </Link>
      </div>

      <section className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          邀请码 <span className="font-medium text-ink">{data.group.inviteCode}</span>
        </span>
        <CopyLink path={`/join/${data.group.inviteCode}`} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[28px] font-semibold tracking-tight">{formatMonthTitle(data.month)}</h2>
        <div className="flex items-center rounded-full bg-card p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <Link className="grid size-8 place-items-center rounded-full text-lg text-accent" href={`/groups/${id}?month=${addMonths(data.month, -1)}`} aria-label="上个月">
            ‹
          </Link>
          <Link className="px-2 text-sm font-medium text-accent" href={`/groups/${id}`}>
            今天
          </Link>
          <Link className="grid size-8 place-items-center rounded-full text-lg text-accent" href={`/groups/${id}?month=${addMonths(data.month, 1)}`} aria-label="下个月">
            ›
          </Link>
        </div>
      </div>

      <MonthBoard
        groupId={id}
        color={data.group.color}
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
