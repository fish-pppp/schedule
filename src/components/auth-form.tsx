"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { friendlyAuthError } from "@/lib/auth-error";
import { authClient } from "@/lib/auth-client";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/forgot-password";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedEmail = email.trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    setError(null);
    setPending(true);

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email: submittedEmail, password, callbackURL: nextPath })
        : await authClient.signUp.email({ email: submittedEmail, password, name, callbackURL: nextPath });

    if (result.error) {
      setError(friendlyAuthError(result.error.message, "没有完成，请再试一次"));
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
        <input
          className={inputClass}
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <div>
        {mode === "login" ? (
          <span className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="text-[13px] text-muted">
              密码
            </label>
            <Link className="text-[13px] font-medium text-ink" href={forgotHref}>
              忘记密码
            </Link>
          </span>
        ) : (
          <label htmlFor="password" className={labelClass}>
            密码
          </label>
        )}
        <input
          id="password"
          className={inputClass}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
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
