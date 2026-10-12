import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { Loading } from "@/components/loading";
import { safeNext } from "@/lib/paths";
import { getSession } from "@/server/session";

export const metadata = { title: "登录" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="text-[13px] text-muted">
        搭子日程
      </Link>
      <h1 className="mt-1 text-[34px] font-semibold tracking-tight">登录</h1>
      <div className="mt-8">
        <AuthForm mode="login" nextPath={nextPath} />
      </div>
    </main>
  );
}
