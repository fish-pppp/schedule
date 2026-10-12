import Link from "next/link";
import { Suspense } from "react";

import { GroupRows } from "@/components/group-rows";
import { Loading } from "@/components/loading";
import { getHome } from "@/server/queries";
import { requireUser } from "@/server/guard";

export const metadata = { title: "搭子组" };

export default function GroupsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <GroupsContent />
    </Suspense>
  );
}

async function GroupsContent() {
  const user = await requireUser();
  const data = await getHome(user.id);
  const counts = new Map(data.counts.map((row) => [row.groupId, Number(row.total)]));

  return (
    <main id="main" className="mx-auto max-w-lg">
      <div className="mb-5 flex items-end justify-between gap-3 px-1">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">搭子组</h1>
        <Link href="/groups/new" className="mb-1 text-[17px] font-normal text-accent">
          新建
        </Link>
      </div>
      {data.groups.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">还没有组。</p>
      ) : (
        <GroupRows
          groups={data.groups.map((group) => ({
            id: group.id,
            name: group.name,
            color: group.color,
            count: counts.get(group.id) ?? 1,
          }))}
        />
      )}
    </main>
  );
}
