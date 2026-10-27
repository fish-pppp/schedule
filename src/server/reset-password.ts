"use server";

import { headers } from "next/headers";

import { friendlyAuthError, passwordResetSendResult, type SendResetCodeResult } from "@/lib/auth-error";
import { auth } from "@/lib/auth";
import { isMailbox, mailerNotReadyMessage, resolveMailer } from "@/lib/otp-mail";
import { otpSendTrace, type OtpSendTrace } from "@/lib/send-reset-mail";

export async function sendPasswordResetCode(rawEmail: string): Promise<SendResetCodeResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!isMailbox(email)) return { error: "请填写有效的邮箱" };

  const mailer = resolveMailer(process.env);
  if (mailer.kind === "none" || mailer.kind === "invalid") {
    console.error("[auth] password-reset mail is not configured", mailer);
    return {
      error: friendlyAuthError(mailerNotReadyMessage(mailer), "验证码发送失败，请稍后再试"),
    };
  }

  const requestHeaders = new Headers(await headers());
  const trace: OtpSendTrace = { delivered: false, error: null, channel: null };

  try {
    await otpSendTrace.run(trace, async () => {
      await auth.api.requestPasswordResetEmailOTP({
        body: { email },
        headers: requestHeaders,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: friendlyAuthError(message, "验证码发送失败，请稍后再试") };
  }

  return passwordResetSendResult(trace);
}
