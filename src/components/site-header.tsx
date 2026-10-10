import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight sm:text-lg">
          搭子日程
        </Link>
        <nav className="flex min-w-0 flex-1 items-center justify-end gap-0.5 text-sm" aria-label="主导航">
          <Link href="/blocks" className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 hover:bg-card sm:px-3">
            添加占用
          </Link>
          <Link href="/account" className="min-w-0 truncate rounded-full px-2.5 py-1.5 hover:bg-card sm:px-3">
            {name}
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
