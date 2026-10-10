import { Suspense } from "react";

import { GroupForm } from "@/components/group-form";
import { Loading } from "@/components/loading";
import { cardClass } from "@/lib/ui";
import { requireUser } from "@/server/guard";

export const metadata = { title: "新建搭子组" };

export default function NewGroupPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewGroupContent />
    </Suspense>
  );
}

async function NewGroupContent() {
  await requireUser();

  return (
    <main id="main" className="mx-auto min-w-0 max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">新建搭子组</h1>
      <p className="text-sm text-muted">建好后复制邀请链接，发给要一起约的朋友。</p>
      <div className={cardClass}>
        <GroupForm />
      </div>
    </main>
  );
}
