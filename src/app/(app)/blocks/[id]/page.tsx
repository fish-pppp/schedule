import Link from "next/link";
import { Suspense } from "react";

import { EditBlockForm } from "@/components/edit-block-form";
import { Loading } from "@/components/loading";
import { formatClock, shanghaiYmd } from "@/lib/time";
import { deleteBlock } from "@/server/block-actions";
import { requireUser } from "@/server/guard";
import { getOwnBlocks } from "@/server/queries";

export const metadata = { title: "修改占用" };

export default function EditBlockPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <EditBlockContent params={params} />
    </Suspense>
  );
}

async function EditBlockContent({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const blocks = await getOwnBlocks(user.id);
  const block = blocks.find((item) => item.id === id);

  if (!block) {
    return (
      <main id="main" className="mx-auto max-w-lg space-y-3">
        <h1 className="text-[22px] font-semibold">找不到这段占用</h1>
        <Link href="/blocks" className="text-[15px] text-accent">
          回到占用
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-lg">
      <Link href="/blocks" className="text-[15px] text-accent">
        ‹ 占用
      </Link>
      <h1 className="mt-1 truncate text-[34px] leading-tight font-semibold tracking-tight">{block.title}</h1>
      <div className="inset-group mt-6 px-4 py-4">
        <EditBlockForm
          id={block.id}
          title={block.title}
          startDate={shanghaiYmd(block.startAt)}
          startTime={formatClock(block.startAt)}
          endDate={shanghaiYmd(block.endAt)}
          endTime={formatClock(block.endAt)}
          hideTitle={block.hideTitle}
          returnTo="/blocks"
        />
      </div>
      <form action={deleteBlock} className="inset-group mt-8">
        <input type="hidden" name="id" value={block.id} />
        <input type="hidden" name="returnTo" value="/blocks" />
        <button type="submit" className="h-11 w-full text-[17px] text-[#ff3b30]">
          删除
        </button>
      </form>
    </main>
  );
}
