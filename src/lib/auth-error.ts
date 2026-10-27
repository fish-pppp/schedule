/**
 * Better Auth reports in English. The app is Chinese, so map the common
 * messages and keep Chinese copy that the mailer already wrote.
 */

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/user already exists|already registered/i, "这个邮箱已经注册过了"],
  [/otp expired/i, "验证码过期了，请重新发送"],
  [/invalid otp/i, "验证码不对"],
  [/too many attempts/i, "验证码试太多次了，请重新发送"],
  [/unsupported otp type/i, "验证码类型不对"],
  [/邮件服务还没配好/i, "邮件服务还没配好，暂时发不了验证码"],
  [/^验证码发送失败$/i, "验证码发送失败，请稍后再试"],
  [/invalid email or password|invalid credentials|invalid password|user not found/i, "邮箱或密码不对"],
  [/invalid email/i, "请填写有效的邮箱"],
  [/password too short|at least 8/i, "密码至少 8 位"],
  [/password too long/i, "密码太长了"],
  [/invalid origin/i, "登录来源校验失败，请用地址栏里的这个网站再试一次"],
  [/too many requests|rate limit/i, "操作太频繁，稍等一下再试"],
  [/failed to fetch|network|load failed/i, "网络不通，请稍后再试"],
];

export function friendlyAuthError(message: string | undefined | null, fallback: string): string {
  const text = (message ?? "").trim();
  if (!text) return fallback;
  for (const [pattern, copy] of AUTH_MESSAGES) {
    if (pattern.test(text)) return copy;
  }
  if (/[\u4e00-\u9fff]/.test(text)) return text;
  return fallback;
}

export type SendResetCodeResult = { sent: true; delivery: "log" | "mail" } | { error: string };

/** Better Auth always returns success. The trace says whether a code actually went out. */
export function passwordResetSendResult(trace: {
  delivered: boolean;
  error: string | null;
  channel?: "log" | "mail" | null;
}): SendResetCodeResult {
  if (trace.error) return { error: friendlyAuthError(trace.error, "验证码发送失败，请稍后再试") };
  if (!trace.delivered) return { error: "验证码没有发出去：这个邮箱还没注册" };
  return { sent: true, delivery: trace.channel === "log" ? "log" : "mail" };
}
