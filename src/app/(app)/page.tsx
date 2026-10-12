import Link from "next/link";
import { Suspense } from "react";

import { Chevron, GroupRows } from "@/components/group-rows";
import { Loading } from "@/components/loading";
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
    })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <main id="main" className="mx-auto max-w-lg space-y-8">
      <h1 className="px-1 text-[34px] leading-tight font-semibold tracking-tight">日程</h1>

      <section>
        <div className="mb-2 flex items-baseline justify-between px-4">
          <h2 className="text-[13px] text-muted">即将到来</h2>
          <Link href="/blocks" className="text-[15px] text-accent">
            添加占用
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-4 text-[15px] text-muted">还没有安排。</p>
        ) : (
          <ul className="inset-group">
            {upcoming.map((item, index) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link href={item.href} className="inset-row">
                  {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {formatRange(item.startAt, item.endAt)} · {item.meta}
                    </span>
                  </span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between px-4">
          <h2 className="text-[13px] text-muted">搭子组</h2>
          <Link href="/groups" className="text-[15px] text-accent">
            全部
          </Link>
        </div>
        {data.groups.length === 0 ? (
          <p className="px-4 text-[15px] text-muted">
            还没有组。
            <Link href="/groups/new" className="text-accent">
              {" "}
              新建
            </Link>
          </p>
        ) : (
          <GroupRows
            groups={data.groups.slice(0, 5).map((group) => ({
              id: group.id,
              name: group.name,
              color: group.color,
              count: counts.get(group.id) ?? 1,
            }))}
          />
        )}
      </section>
    </main>
  );
}
