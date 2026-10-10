import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";

const noto = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "搭子日程",
    template: "%s · 搭子日程",
  },
  description: "和搭子对齐空闲。一组里约行程，其他组只看到忙碌。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-3 focus:py-2"
        >
          跳到内容
        </a>
        <Suspense fallback={<p className="px-4 py-8 text-sm text-muted">加载中…</p>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
