import { Suspense } from "react";

import { DisplayNameForm } from "@/components/display-name-form";
import { Loading } from "@/components/loading";
import { cardClass } from "@/lib/ui";
import { requireUser } from "@/server/guard";

export const metadata = { title: "账号" };

export default function AccountPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AccountContent />
    </Suspense>
  );
}

async function AccountContent() {
  const user = await requireUser();

  return (
    <main id="main" className="mx-auto max-w-lg space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">账号</h1>
      <p className="text-sm text-muted">{user.email}</p>
      <div className={cardClass}>
        <DisplayNameForm name={user.name} />
      </div>
    </main>
  );
}
