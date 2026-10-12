import Link from "next/link";

export function SiteHeader({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1) || "我";

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(60,60,67,0.12)] bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          搭子日程
        </Link>
        <Link
          href="/account"
          aria-label={`账号，${name}`}
          className="grid size-7 place-items-center rounded-full bg-[#e5e5ea] text-[13px] font-semibold"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
