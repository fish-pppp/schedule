"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

function translateAuthError(message: string | undefined): string {
  const text = message?.toLowerCase() ?? "";
  if (text.includes("invalid email or password") || text.includes("invalid credentials")) {
    return "邮箱或密码不对";
  }
  if (text.includes("already") || text.includes("exist")) return "这个邮箱已经注册过了";
  if (text.includes("password")) return "密码至少 8 位";
  if (text.includes("email")) return "请填写有效的邮箱";
  return "没有完成，请再试一次";
}

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    setError(null);
    setPending(true);

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password, callbackURL: nextPath })
        : await authClient.signUp.email({ email, password, name, callbackURL: nextPath });

    if (result.error) {
      setError(translateAuthError(result.error.message));
      setPending(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <label className="block">
          <span className={labelClass}>显示名</span>
          <input className={inputClass} name="name" required maxLength={40} autoComplete="nickname" />
        </label>
      ) : null}
      <label className="block">
        <span className={labelClass}>邮箱</span>
        <input className={inputClass} name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block">
        <span className={labelClass}>密码</span>
        <input
          className={inputClass}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      <button className={`${buttonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "请稍等…" : mode === "login" ? "登录" : "注册"}
      </button>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <Link className="font-medium text-ink" href={`/register?next=${encodeURIComponent(nextPath)}`}>
              注册
            </Link>
          </>
        ) : (
          <>
            已经有账号？{" "}
            <Link className="font-medium text-ink" href={`/login?next=${encodeURIComponent(nextPath)}`}>
              登录
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
