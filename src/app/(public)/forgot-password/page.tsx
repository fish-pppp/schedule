import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Loading } from "@/components/loading";
import { getSession } from "@/server/session";

export const metadata = { title: "找回密码" };

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ForgotContent searchParams={searchParams} />
    </Suspense>
  );
}

function initialEmail(value: string | undefined): string {
  const email = value?.trim() ?? "";
  if (!email || email.length > 200 || /[\s<>]/.test(email)) return "";
  return email;
}

async function ForgotContent({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="text-[13px] text-muted">
        搭子日程
      </Link>
      <h1 className="mt-1 text-[34px] font-semibold tracking-tight">找回密码</h1>
      <p className="mt-2 text-[15px] text-muted">输入邮箱，我们会发 6 位验证码。用验证码就能设新密码。</p>
      <div className="mt-8">
        <ForgotPasswordForm initialEmail={initialEmail(params.email)} />
      </div>
    </main>
  );
}
