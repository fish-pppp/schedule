import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@/components/loading";
import { SiteHeader } from "@/components/site-header";
import { TabBar } from "@/components/tab-bar";
import { countOpenInvites } from "@/server/queries";
import { getSession } from "@/server/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <SiteHeader name={session.user.name} />
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-28">{children}</div>
      <TabBar invites={await countOpenInvites(session.user.id)} />
    </>
  );
}
