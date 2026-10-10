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
    <main id="main" className="mx-auto flex min-h-full min-w-0 max-w-md flex-col px-4 py-10 sm:py-16">
      <Link href="/" className="text-sm font-semibold">
        搭子日程
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">登录</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        和搭子对齐空闲。你在一组里约好的行程，其他组只能看到你忙碌，看不到另一个局的细节。
      </p>
      <div className="mt-6">
        <AuthForm mode="login" nextPath={nextPath} />
      </div>
    </main>
  );
}
