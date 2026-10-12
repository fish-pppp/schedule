import Link from "next/link";
import { Suspense } from "react";

import { Chevron } from "@/components/group-rows";
import { Loading } from "@/components/loading";
import { safeNext } from "@/lib/paths";
import { formatRange } from "@/lib/time";
import { requireUser } from "@/server/guard";
import { getOwnBlocks } from "@/server/queries";

export const metadata = { title: "占用" };

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
  const addHref = `/blocks/new?returnTo=${encodeURIComponent(returnTo === "/blocks" ? "/blocks" : returnTo)}`;

  return (
    <main id="main" className="mx-auto max-w-lg">
      <div className="mb-5 flex items-end justify-between gap-3 px-1">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">占用</h1>
        <Link href={addHref} className="mb-1 text-[17px] text-accent">
          添加
        </Link>
      </div>
      {blocks.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">还没有占用。</p>
      ) : (
        <ul className="inset-group">
          {blocks.map((block, index) => (
            <li key={block.id}>
              <Link href={`/blocks/${block.id}`} className="inset-row">
                {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">{block.title}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">
                    {formatRange(block.startAt, block.endAt)} · {block.hideTitle ? "只显示忙碌" : "同组可见标题"}
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
