import Link from "next/link";
import { Suspense } from "react";

import { Loading } from "@/components/loading";
import { OutingForm } from "@/components/outing-form";
import { cardClass } from "@/lib/ui";
import { currentShanghaiYmd, isYmd } from "@/lib/time";
import { requireGroupMember, requireUser } from "@/server/guard";

export const metadata = { title: "约行程" };

export default function NewOutingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <NewOutingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewOutingContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { date } = await searchParams;
  const access = await requireGroupMember(id, user.id);

  if (!access) {
    return (
      <main id="main" className="space-y-3">
        <h1 className="text-2xl font-semibold">找不到这个搭子组</h1>
        <Link href="/" className="text-sm font-medium text-accent">
          回到首页
        </Link>
      </main>
    );
  }

  const defaultDate = date && isYmd(date) ? date : currentShanghaiYmd();

  return (
    <main id="main" className="mx-auto max-w-lg space-y-4">
      <p className="text-sm text-muted">
        <Link href={`/groups/${id}`} className="hover:text-ink">
          {access.groupName}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">约一个行程</h1>
      <div className={cardClass}>
        <OutingForm key={defaultDate} groupId={id} defaultDate={defaultDate} />
      </div>
    </main>
  );
}
