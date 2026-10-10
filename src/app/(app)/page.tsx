import Link from "next/link";
import { Suspense } from "react";

import { Loading } from "@/components/loading";
import { buttonClass, cardClass, secondaryButtonClass } from "@/lib/ui";
import { formatRange } from "@/lib/time";
import { getHome } from "@/server/queries";
import { requireUser } from "@/server/guard";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const user = await requireUser();
  const data = await getHome(user.id);
  const counts = new Map(data.counts.map((row) => [row.groupId, Number(row.total)]));
  const upcoming = [
    ...data.blocks.map((block) => ({
      id: block.id,
      kind: "block" as const,
      title: block.title,
      startAt: block.startAt,
      endAt: block.endAt,
      href: "/blocks",
      meta: block.hideTitle ? "仅自己看到标题" : "搭子组可见标题",
    })),
    ...data.upcomingOutings.map((plan) => ({
      id: plan.id,
      kind: "outing" as const,
      title: plan.title,
      startAt: plan.startAt,
      endAt: plan.endAt,
      href: `/groups/${plan.groupId}`,
      meta: `${plan.groupName}${plan.status === "maybe" ? " · 可能参加" : ""}`,
      color: plan.color,
    })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <main id="main" className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight">这个月和谁有空</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            把朋友分成搭子组。每个人记下自己的占用，在组里约行程。这个组看得到细节，其他组只看得到你这段时间忙碌。
          </p>
        </div>
        <Link href="/groups/new" className={buttonClass}>
          新建搭子组
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">我的搭子组</h2>
        {data.groups.length === 0 ? (
          <p className="text-sm text-muted">还没有组。建一个，把邀请链接发给朋友。</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className={`${cardClass} block hover:border-ink`}>
                  <span className="inline-block size-3 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="ml-2 font-medium">{group.name}</span>
                  <p className="mt-2 text-sm text-muted">{counts.get(group.id) ?? 1} 人</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">即将到来</h2>
          <Link href="/blocks" className={secondaryButtonClass}>
            添加占用
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">还没有即将到来的占用或行程。</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link href={item.href} className={`${cardClass} block`}>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatRange(item.startAt, item.endAt)} · {item.meta}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
