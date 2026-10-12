import Link from "next/link";
import { Suspense } from "react";

import { BlockForm } from "@/components/block-form";
import { Loading } from "@/components/loading";
import { safeNext } from "@/lib/paths";
import { currentShanghaiYmd } from "@/lib/time";
import { requireUser } from "@/server/guard";

export const metadata = { title: "添加占用" };

export default function NewBlockPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <NewBlockContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewBlockContent({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const returnTo = safeNext(params.returnTo ?? "/blocks");

  return (
    <main id="main" className="mx-auto max-w-lg">
      <Link href={returnTo} className="text-[15px] text-accent">
        ‹ 返回
      </Link>
      <h1 className="mt-1 text-[34px] leading-tight font-semibold tracking-tight">添加占用</h1>
      <div className="inset-group mt-6 px-4 py-4">
        <BlockForm returnTo={returnTo} defaultDate={currentShanghaiYmd()} />
      </div>
    </main>
  );
}
