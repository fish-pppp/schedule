import Link from "next/link";
import { Suspense } from "react";

import { Loading } from "@/components/loading";
import { OutingList } from "@/components/outing-list";
import { requireUser } from "@/server/guard";
import { getGroupPage } from "@/server/queries";

export const metadata = { title: "后续行程" };

export default function GroupOutingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <OutingsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OutingsContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { month } = await searchParams;
  const data = await getGroupPage(user.id, id, month);

  if (!data) {
    return (
      <main id="main" className="space-y-3">
        <h1 className="text-2xl font-semibold">找不到这个搭子组</h1>
        <Link href="/groups" className="text-sm font-medium text-accent">
          回到搭子组
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-lg">
      <Link href={`/groups/${id}?month=${data.month}`} className="text-[15px] text-accent">
        ‹ {data.group.name}
      </Link>
      <h1 className="mt-1 px-0.5 text-[34px] leading-tight font-semibold tracking-tight">后续行程</h1>
      <div className="mt-6">
        <OutingList
          outings={data.outings}
          members={data.members}
          viewerId={data.viewerId}
          canModerate={data.group.role === "owner"}
          month={data.month}
          returnTo={`/groups/${id}/outings?month=${data.month}`}
        />
      </div>
    </main>
  );
}
