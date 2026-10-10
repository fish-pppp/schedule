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
    <main id="main" className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">收件箱</h1>
        <p className="mt-2 text-sm text-muted">别人约你的行程先到这里。你同意之后，它才会出现在日历上。时间可以改，改完要对方再同意一次。</p>
      </div>
      <InboxList received={data.received} sent={data.sent} waiting={data.waiting} viewerId={user.id} />
    </main>
  );
}
