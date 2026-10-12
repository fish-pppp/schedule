import { Suspense } from "react";

import { DisplayNameForm } from "@/components/display-name-form";
import { Loading } from "@/components/loading";
import { SignOutButton } from "@/components/sign-out-button";
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
    <main id="main" className="mx-auto max-w-lg">
      <h1 className="px-1 text-[34px] leading-tight font-semibold tracking-tight">我的</h1>
      <p className="mt-1 px-1 text-[15px] text-muted">{user.email}</p>
      <div className="inset-group mt-6 px-4 py-4">
        <DisplayNameForm name={user.name} />
      </div>
      <div className="inset-group mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
