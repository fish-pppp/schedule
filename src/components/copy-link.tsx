"use client";

import { useState } from "react";

import { secondaryButtonClass } from "@/lib/ui";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={secondaryButtonClass}
      onClick={() => {
        const url = `${window.location.origin}${path}`;
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
        });
      }}
    >
      {copied ? "已复制" : "复制邀请链接"}
    </button>
  );
}
