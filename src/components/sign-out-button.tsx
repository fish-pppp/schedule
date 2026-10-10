"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { quietButtonClass } from "@/lib/ui";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={quietButtonClass}
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
      退出
    </button>
  );
}
