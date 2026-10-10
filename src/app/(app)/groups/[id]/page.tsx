import Link from "next/link";
import { Suspense } from "react";

import { CopyLink } from "@/components/copy-link";
import { Loading } from "@/components/loading";
import { OutingList } from "@/components/outing-list";
import { WeekBoard } from "@/components/week-board";
import { addDays, formatDay } from "@/lib/time";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
import { requireUser } from "@/server/guard";
import { getGroupPage } from "@/server/queries";

function monthDay(ymd: string): string {
  return `${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8, 10))}日`;
}

export default function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
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
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { week } = await searchParams;
  const data = await getGroupPage(user.id, id, week);

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
    <main id="main" className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: data.group.color }} />
            搭子组
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{data.group.name}</h1>
          <p className="mt-2 break-words text-sm text-muted">
            {data.members.map((member) => member.name).join("、")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Link href={`/groups/${id}/outings/new`} className={`${buttonClass} w-full sm:w-auto`}>
            约行程
          </Link>
          <Link href={`/blocks?returnTo=${encodeURIComponent(`/groups/${id}`)}`} className={`${secondaryButtonClass} w-full sm:w-auto`}>
            添加占用
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <p className="min-w-0 text-sm">
          邀请码 <span className="font-medium">{data.group.inviteCode}</span>
        </p>
        <CopyLink path={`/join/${data.group.inviteCode}`} />
      </section>

      <section className="min-w-0 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold sm:text-lg">
            <span className="md:hidden">
              {monthDay(firstDay)} – {monthDay(lastDay)}
            </span>
            <span className="hidden md:inline">
              {formatDay(firstDay)} – {formatDay(lastDay)}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <Link className={`${secondaryButtonClass} w-full md:w-auto`} href={`/groups/${id}?week=${addDays(data.monday, -7)}`}>
              上一周
            </Link>
            <Link className={`${secondaryButtonClass} w-full md:w-auto`} href={`/groups/${id}`}>
              本周
            </Link>
            <Link className={`${secondaryButtonClass} w-full md:w-auto`} href={`/groups/${id}?week=${addDays(data.monday, 7)}`}>
              下一周
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted md:hidden">点日期查看这一天。实心是忙碌，虚线是可能忙。</p>
        <p className="hidden text-sm text-muted md:block">点某一天可以约行程。实心是忙碌，虚线是可能忙。</p>
        <WeekBoard
          groupId={id}
          color={data.group.color}
          days={data.days}
          members={data.members}
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
