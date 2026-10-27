import Link from "next/link";
import { Suspense } from "react";

import { AgendaList } from "@/components/agenda-list";
import { AgendaMonth } from "@/components/agenda-month";
import { HolidayNote } from "@/components/holiday-mark";
import { Loading } from "@/components/loading";
import { agendaDayTitle } from "@/lib/agenda";
import { addMonths, currentShanghaiYmd, dayBounds, formatMonthTitle, isMonthKey, isYmd, monthGrid, monthKeyOf } from "@/lib/time";
import { requireUser } from "@/server/guard";
import { getAgenda } from "@/server/queries";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; day?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; day?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const calendar = params.view === "calendar";
  const today = currentShanghaiYmd();
  const month = params.month && isMonthKey(params.month) ? params.month : monthKeyOf(today);
  const grid = monthGrid(month);
  const first = grid[0] ?? `${month}-01`;
  const last = grid.at(-1) ?? first;
  const agenda = calendar
    ? await getAgenda(user.id, { start: dayBounds(first).start, end: dayBounds(last).end })
    : await getAgenda(user.id);
  const selected = calendar && params.day && isYmd(params.day) && grid.includes(params.day) ? params.day : null;
  const selectedDay = selected ? agenda.days.find((day) => day.ymd === selected) : undefined;

  return (
    <main id="main" className="mx-auto max-w-lg">
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">日程</h1>
        <div className="mb-1 flex items-center gap-4">
          <Link href="/blocks" className="text-[17px] text-accent">
            占用
          </Link>
          <Link href={`/plan?date=${selected ?? agenda.today}`} className="text-[17px] text-accent">
            约一下
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div className="inline-flex rounded-lg bg-[#e5e5ea] p-0.5 text-[13px] font-medium" role="tablist" aria-label="日程视图">
          <Link
            href="/"
            role="tab"
            aria-selected={!calendar}
            className={`rounded-md px-3 py-1 ${calendar ? "text-muted" : "bg-card text-ink shadow-sm"}`}
          >
            列表
          </Link>
          <Link
            href={`/?view=calendar&month=${month}`}
            role="tab"
            aria-selected={calendar}
            className={`rounded-md px-3 py-1 ${calendar ? "bg-card text-ink shadow-sm" : "text-muted"}`}
          >
            日历
          </Link>
        </div>
        {calendar ? (
          <div className="flex items-center text-[17px] font-semibold tracking-tight">
            <Link
              className="grid size-8 place-items-center text-[22px] leading-none text-accent"
              href={`/?view=calendar&month=${addMonths(month, -1)}`}
              aria-label="上个月"
            >
              ‹
            </Link>
            <span className="px-1">{formatMonthTitle(month)}</span>
            <Link
              className="grid size-8 place-items-center text-[22px] leading-none text-accent"
              href={`/?view=calendar&month=${addMonths(month, 1)}`}
              aria-label="下个月"
            >
              ›
            </Link>
          </div>
        ) : null}
      </div>

      {calendar ? (
        <>
          {month !== monthKeyOf(today) ? (
            <p className="mb-2 px-1 text-right text-[15px]">
              <Link href="/?view=calendar" className="text-accent">
                回到本月
              </Link>
            </p>
          ) : null}
          <AgendaMonth month={month} today={today} grid={grid} agenda={agenda.days} selected={selected} />
          {selected ? (
            <div className="mt-6">
              {selectedDay ? (
                <AgendaList days={[selectedDay]} />
              ) : (
                <EmptyDay ymd={selected} today={today} />
              )}
            </div>
          ) : (
            <p className="mt-3 px-1 text-[13px] text-muted">点一天，查看当天的安排。</p>
          )}
        </>
      ) : agenda.days.length === 0 ? (
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

function EmptyDay({ ymd, today }: { ymd: string; today: string }) {
  const heading = agendaDayTitle(ymd, today);
  return (
    <section>
      <div className="mb-2 px-1">
        <h2 className="text-[22px] font-semibold tracking-tight">{heading.title}</h2>
        {heading.subtitle ? <p className="text-[13px] text-muted">{heading.subtitle}</p> : null}
        <HolidayNote ymd={ymd} />
      </div>
      <p className="px-1 text-[15px] text-muted">
        这天没有安排。{" "}
        <Link href={`/plan?date=${ymd}`} className="text-accent">
          约一下
        </Link>
      </p>
    </section>
  );
}
