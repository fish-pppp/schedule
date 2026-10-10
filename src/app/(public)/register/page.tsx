import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { Loading } from "@/components/loading";
import { safeNext } from "@/lib/paths";
import { getSession } from "@/server/session";

export const metadata = { title: "注册" };

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <main id="main" className="mx-auto flex min-h-full min-w-0 max-w-md flex-col px-4 py-10 sm:py-16">
      <Link href="/" className="text-sm font-semibold">
        搭子日程
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">注册</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        用邮箱建一个账号。邀请链接可以之后发到微信，朋友点开就能加入搭子组。
      </p>
      <div className="mt-6">
        <AuthForm mode="register" nextPath={nextPath} />
      </div>
    </main>
  );
}
