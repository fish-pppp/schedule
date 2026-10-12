"use client";

import { useState } from "react";

import { quietButtonClass } from "@/lib/ui";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={quietButtonClass}
      onClick={() => {
        const url = `${window.location.origin}${path}`;
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
        });
      }}
    >
      {copied ? "已复制" : "邀请"}
    </button>
  );
}
