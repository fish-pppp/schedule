"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex h-11 w-full items-center justify-center text-[17px] text-[#ff3b30] disabled:opacity-40"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/login");
              router.refresh();
            },
            onError: () => setPending(false),
          },
        });
      }}
    >
      {pending ? "退出中…" : "退出登录"}
    </button>
  );
}
