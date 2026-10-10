import Link from "next/link";
import { Suspense } from "react";

import { JoinForm } from "@/components/join-form";
import { Loading } from "@/components/loading";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { findGroupByInvite } from "@/server/queries";
import { getSession } from "@/server/session";

export const metadata = { title: "加入搭子组" };

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const group = await findGroupByInvite(code);

  if (!group) {
    return (
      <main id="main" className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">这个邀请链接失效了</h1>
        <p className="mt-2 text-sm text-muted">请让朋友重新发一个链接。</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent">
          回到首页
        </Link>
      </main>
    );
  }

  const session = await getSession();
  const nextPath = `/join/${code}`;

  return (
    <main id="main" className="mx-auto flex min-h-full max-w-md flex-col px-4 py-16">
      <Link href="/" className="text-sm font-semibold">
        搭子日程
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">加入{group.name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        加入后可以看到这个组的行程。你的占用也会让同组的人看到；别的组里约好的事，在这里只会显示成忙碌。
      </p>
      <div className={`${cardClass} mt-6`}>
        {session ? (
          <JoinForm code={code} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClass} href={`/login?next=${encodeURIComponent(nextPath)}`}>
              登录后加入
            </Link>
            <Link className={secondaryButtonClass} href={`/register?next=${encodeURIComponent(nextPath)}`}>
              注册后加入
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
