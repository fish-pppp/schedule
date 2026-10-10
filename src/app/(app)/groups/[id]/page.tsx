import Link from "next/link";
import { Suspense } from "react";

import { CopyLink } from "@/components/copy-link";
import { GroupWeek, type GroupWeekMember } from "@/components/group-week";
import { Loading } from "@/components/loading";
import { OutingList } from "@/components/outing-list";
import { memberColor } from "@/lib/colors";
import { addDays, formatDay, isYmd } from "@/lib/time";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
import { requireUser } from "@/server/guard";
import { getGroupPage, type GroupPageMember } from "@/server/queries";

export default function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string; day?: string }>;
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
  searchParams: Promise<{ week?: string; day?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { week, day } = await searchParams;
  const weekValue = week && isYmd(week) ? week : undefined;
  const dayValue = day && isYmd(day) ? day : undefined;
  const data = await getGroupPage(user.id, id, weekValue ?? dayValue);

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

  const firstDay = data.days[0] ?? data.monday;
  const lastDay = data.days[6] ?? data.monday;

  return (
    <main id="main" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: data.group.color }} />
            搭子组
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.group.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {data.members.map((member) => member.name).join("、")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/groups/${id}/outings/new`} className={buttonClass}>
            约行程
          </Link>
          <Link href={`/blocks?returnTo=${encodeURIComponent(`/groups/${id}`)}`} className={secondaryButtonClass}>
            添加占用
          </Link>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm">
          邀请码 <span className="font-medium">{data.group.inviteCode}</span>
        </p>
        <CopyLink path={`/join/${data.group.inviteCode}`} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {formatDay(firstDay)} – {formatDay(lastDay)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClass} href={`/groups/${id}?week=${addDays(data.monday, -7)}`}>
              上一周
            </Link>
            <Link className={secondaryButtonClass} href={`/groups/${id}`}>
              本周
            </Link>
            <Link className={secondaryButtonClass} href={`/groups/${id}?week=${addDays(data.monday, 7)}`}>
              下一周
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted">
          点某一天看这一天的时间图。每个人一种颜色，同一时间叠在同一行里。斜线是可能忙。
        </p>
        <p className="text-sm text-muted sm:hidden">左右滑动查看整周。</p>
        <GroupWeek
          groupId={id}
          color={data.group.color}
          days={data.days}
          members={coloredMembers(data.members)}
          viewerId={data.viewerId}
        />
      </section>

      <OutingList
        outings={data.outings}
        members={data.members}
        viewerId={data.viewerId}
        canModerate={data.group.role === "owner"}
      />
    </main>
  );
}

function coloredMembers(members: GroupPageMember[]): GroupWeekMember[] {
  return members.map((member, index) => ({
    userId: member.userId,
    name: member.name,
    color: memberColor(index),
    entries: member.entries.map((entry) => ({
      ...entry,
      startAt: entry.startAt.toISOString(),
      endAt: entry.endAt.toISOString(),
    })),
  }));
}
