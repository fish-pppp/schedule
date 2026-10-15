"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "日程", match: (path: string) => path === "/" || path.startsWith("/plan") },
  { href: "/groups", label: "搭子组", match: (path: string) => path.startsWith("/groups") },
  { href: "/inbox", label: "收件箱", match: (path: string) => path.startsWith("/inbox") },
] as const;

export function TabBar({ invites }: { invites: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(60,60,67,0.16)] bg-[rgba(242,242,247,0.9)] backdrop-blur-xl"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="主导航"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 px-1 pt-1.5 pb-1 text-[10px] font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <TabIcon name={tab.label} />
                {tab.href === "/inbox" && invites > 0 ? (
                  <span className="absolute top-1 left-1/2 ml-2 inline-grid min-w-4 place-items-center rounded-full bg-[#ff3b30] px-1 text-[10px] leading-4 font-semibold text-white">
                    {invites > 9 ? "9+" : invites}
                  </span>
                ) : null}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabIcon({ name }: { name: string }) {
  const common = {
    width: 25,
    height: 25,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };
  if (name === "日程") {
    return (
      <svg {...common}>
        <rect x="3.25" y="4.75" width="17.5" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.25 9.25h17.5M8 3.25v3.2M16 3.25v3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "搭子组") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.2 18.2c.5-2.4 2.4-3.7 4.8-3.7s4.3 1.3 4.8 3.7M13.2 14.7c1.5-.2 3 .5 3.8 2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "收件箱") {
    return (
      <svg {...common}>
        <path d="M4 13.2 6.2 5.6A2 2 0 0 1 8.1 4.2h7.8a2 2 0 0 1 1.9 1.4L20 13.2v4.1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 13.2h4.2l1.1 2.1h5.4l1.1-2.1H20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}
