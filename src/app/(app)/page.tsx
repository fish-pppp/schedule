import Link from "next/link";
import { Suspense } from "react";

import { AgendaList } from "@/components/agenda-list";
import { Loading } from "@/components/loading";
import { requireUser } from "@/server/guard";
import { getAgenda } from "@/server/queries";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const user = await requireUser();
  const agenda = await getAgenda(user.id);

  return (
    <main id="main" className="mx-auto max-w-lg">
      <div className="mb-5 flex items-end justify-between gap-3 px-1">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">日程</h1>
        <div className="mb-1 flex items-center gap-4">
          <Link href="/blocks" className="text-[17px] text-accent">
            占用
          </Link>
          <Link href={`/plan?date=${agenda.today}`} className="text-[17px] text-accent">
            约一下
          </Link>
        </div>
      </div>
      {agenda.days.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">
          还没有安排。{" "}
          <Link href={`/plan?date=${agenda.today}`} className="text-accent">
            约一下
          </Link>
        </p>
      ) : (
        <AgendaList days={agenda.days} />
      )}
    </main>
  );
}
