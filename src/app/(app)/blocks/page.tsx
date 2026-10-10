import { Suspense } from "react";

import { BlockForm } from "@/components/block-form";
import { Loading } from "@/components/loading";
import { safeNext } from "@/lib/paths";
import { cardClass } from "@/lib/ui";
import { currentShanghaiYmd, formatRange } from "@/lib/time";
import { deleteBlock } from "@/server/block-actions";
import { requireUser } from "@/server/guard";
import { getOwnBlocks } from "@/server/queries";

export const metadata = { title: "添加占用" };

export default function BlocksPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <BlocksContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BlocksContent({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const returnTo = safeNext(params.returnTo ?? "/blocks");
  const blocks = await getOwnBlocks(user.id);

  return (
    <main id="main" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="min-w-0 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">我的占用</h1>
        <p className="text-sm text-muted">这些安排会挡住你在每个搭子组里的空闲。时间按北京时间。</p>
        {blocks.length === 0 ? <p className="text-sm text-muted">还没有占用。</p> : null}
        <ul className="space-y-2">
          {blocks.map((block) => (
            <li key={block.id} className={cardClass}>
              <p className="font-medium">{block.title}</p>
              <p className="mt-1 text-sm text-muted">
                {formatRange(block.startAt, block.endAt)}
                {block.hideTitle ? " · 其他人只看到忙碌" : " · 同组可见标题"}
              </p>
              <form action={deleteBlock} className="mt-3">
                <input type="hidden" name="id" value={block.id} />
                <button type="submit" className="text-sm text-muted underline">
                  删除
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${cardClass} min-w-0`}>
        <h2 className="text-lg font-semibold">添加占用</h2>
        <div className="mt-4">
          <BlockForm returnTo={returnTo} defaultDate={currentShanghaiYmd()} />
        </div>
      </section>
    </main>
  );
}
