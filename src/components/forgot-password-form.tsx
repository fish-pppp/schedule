"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { friendlyAuthError } from "@/lib/auth-error";
import { resetPasswordWithCode } from "@/lib/auth-client";
import { isMailbox, RESET_OTP_LENGTH } from "@/lib/otp-mail";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { sendPasswordResetCode } from "@/server/reset-password";

const RESEND_COOLDOWN_SEC = 60;

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    if (!isMailbox(trimmed)) {
      setError("请填写有效的邮箱");
      return;
    }
    setPending(true);
    try {
      const result = await sendPasswordResetCode(trimmed);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep("code");
      setNotice(
        result.delivery === "log"
          ? "这台机器还没配发信。验证码写在运行 npm run dev 的终端里。"
          : "发送成功，请到邮箱查看验证码（也看一眼垃圾箱）。",
      );
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      setError("验证码发送失败，请稍后再试");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "email") {
      await sendCode();
      return;
    }
    if (step !== "code") return;

    setError(null);
    if (!new RegExp(`^\\d{${RESET_OTP_LENGTH}}$`).test(otp.trim())) {
      setError(`请填写邮箱里的 ${RESET_OTP_LENGTH} 位验证码`);
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password.length > 128) {
      setError("密码太长了");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一样");
      return;
    }

    setPending(true);
    try {
      await resetPasswordWithCode({ email, otp, password });
      setStep("done");
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null, "改密码失败"));
    } finally {
      setPending(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">密码已经改好，请用新密码登录。</p>
        <Link className={`${buttonClass} w-full`} href="/login">
          去登录
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <label className="block" htmlFor="reset-email">
        <span className={labelClass}>邮箱</span>
        <input
          id="reset-email"
          className={inputClass}
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus={step === "email"}
          disabled={step === "code"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      {notice ? (
        <p role="status" className="text-sm text-ink">
          {notice}
        </p>
      ) : null}

      {step === "code" ? (
        <>
          <label className="block" htmlFor="reset-otp">
            <span className={labelClass}>验证码</span>
            <input
              id="reset-otp"
              className={`${inputClass} tracking-[0.3em]`}
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={RESET_OTP_LENGTH}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, RESET_OTP_LENGTH))}
              placeholder="6 位数字"
            />
          </label>
          <label className="block" htmlFor="reset-password">
            <span className={labelClass}>新密码</span>
            <input
              id="reset-password"
              className={inputClass}
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="block" htmlFor="reset-confirm">
            <span className={labelClass}>再输一次</span>
            <input
              id="reset-confirm"
              className={inputClass}
              name="confirm"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button className={`${buttonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "请稍等…" : step === "email" ? "发送验证码" : "改好密码"}
      </button>

      {step === "code" ? (
        <button
          type="button"
          className={`${secondaryButtonClass} w-full`}
          disabled={pending || cooldown > 0}
          onClick={() => {
            void sendCode();
          }}
        >
          {cooldown > 0 ? `重新发送（${cooldown}s）` : "重新发送"}
        </button>
      ) : null}

      <p className="text-center text-sm text-muted">
        <Link className="font-medium text-ink" href="/login">
          返回登录
        </Link>
      </p>
    </form>
  );
}
