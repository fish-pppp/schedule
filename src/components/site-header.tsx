import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-[17px] font-semibold tracking-tight">
          搭子日程
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="主导航">
          <Link href="/blocks" className="rounded-full px-3 py-1.5 font-medium text-accent">
            添加占用
          </Link>
          <Link href="/account" className="rounded-full px-3 py-1.5 text-ink">
            {name}
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
