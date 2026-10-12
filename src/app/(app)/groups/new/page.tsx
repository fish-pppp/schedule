import { Suspense } from "react";

import { GroupForm } from "@/components/group-form";
import { Loading } from "@/components/loading";
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
    <main id="main" className="mx-auto max-w-lg">
      <h1 className="px-1 text-[34px] leading-tight font-semibold tracking-tight">新建搭子组</h1>
      <div className="inset-group mt-6 px-4 py-4">
        <GroupForm />
      </div>
    </main>
  );
}
