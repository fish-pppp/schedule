import Link from "next/link";
import { Suspense } from "react";

import { Chevron } from "@/components/group-rows";
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
  const upcoming = [
    ...data.blocks.map((block) => ({
      id: block.id,
      kind: "block" as const,
      title: block.title,
      startAt: block.startAt,
      endAt: block.endAt,
      href: `/blocks/${block.id}`,
      meta: "占用",
    })),
    ...data.upcomingOutings.map((plan) => ({
      id: plan.id,
      kind: "outing" as const,
      title: plan.title,
      startAt: plan.startAt,
      endAt: plan.endAt,
      href: `/groups/${plan.groupId}/outings`,
      meta: `${plan.groupName}${plan.status === "maybe" ? " · 可能" : ""}`,
    })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <main id="main" className="mx-auto max-w-lg">
      <div className="mb-5 flex items-end justify-between gap-3 px-1">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">日程</h1>
        <Link href="/blocks" className="mb-1 text-[17px] text-accent">
          占用
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">还没有安排。</p>
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
    </main>
  );
}
