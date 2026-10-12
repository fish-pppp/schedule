import { Suspense } from "react";

import { InboxList } from "@/components/inbox-list";
import { Loading } from "@/components/loading";
import { requireUser } from "@/server/guard";
import { getInbox } from "@/server/queries";

export const metadata = { title: "收件箱" };

export default function InboxPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InboxContent />
    </Suspense>
  );
}

async function InboxContent() {
  const user = await requireUser();
  const data = await getInbox(user.id);

  return (
    <main id="main" className="mx-auto max-w-lg">
      <h1 className="px-1 text-[34px] leading-tight font-semibold tracking-tight">收件箱</h1>
      <div className="mt-6">
        <InboxList received={data.received} sent={data.sent} waiting={data.waiting} viewerId={user.id} />
      </div>
    </main>
  );
}
