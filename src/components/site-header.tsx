import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          搭子日程
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="主导航">
          <Link href="/blocks" className="rounded-full px-3 py-1.5 hover:bg-card">
            添加占用
          </Link>
          <Link href="/account" className="rounded-full px-3 py-1.5 hover:bg-card">
            {name}
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
