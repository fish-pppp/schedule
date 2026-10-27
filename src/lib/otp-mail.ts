/** Password-reset mail helpers. No network I/O — shared by the sender and tests. */

export const APP_NAME = "搭子日程";
export const EMAIL_FROM_EXAMPLE = `${APP_NAME} <noreply@diyforvisa.com>`;
export const RESET_OTP_MINUTES = 10;
export const RESET_OTP_SECONDS = RESET_OTP_MINUTES * 60;
export const RESET_OTP_LENGTH = 6;

const EMAIL_ADDR = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAILBOX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Env = Record<string, string | undefined>;

export type Mailer =
  | { kind: "resend"; apiKey: string; from: string }
  | {
      kind: "smtp";
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      from: string;
    }
  | { kind: "log" }
  | { kind: "invalid"; reason: "EMAIL_FROM is required" | "EMAIL_FROM is malformed" }
  | { kind: "none" };

/** Read an env var, treating empty or whitespace as unset. Strips wrapping quotes. */
export function envTrim(env: Env, key: string): string | undefined {
  const value = env[key]?.trim();
  if (!value) return undefined;
  const unquoted = value.replace(/^(['"])(.*)\1$/, "$2").trim();
  return unquoted || undefined;
}

export function isMailbox(value: string): boolean {
  return MAILBOX.test(value);
}

/**
 * Resend only accepts `email@domain` or `Name <email@domain>`.
 * Forms often eat `<noreply@…>` and leave the display name.
 */
export function normalizeEmailFrom(from: string | undefined, env: Env = {}): string | undefined {
  if (!from) return from;
  let value = String(from)
    .trim()
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*60;/g, "<")
    .replace(/&#0*62;/g, ">")
    .replace(/[＜〈]/g, "<")
    .replace(/[＞〉]/g, ">");
  value = value.replace(/^(['"])(.*)\1$/, "$2").trim();

  const angled = value.match(/^(.*?)<\s*([^<>@\s]+@[^<>@\s]+)\s*>\s*$/);
  if (angled) {
    const name = angled[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    const email = angled[2]?.trim() ?? "";
    return name ? `${name} <${email}>` : email;
  }

  const loose = value.match(/^(.*?)\s+([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*$/);
  if (loose?.[1]?.trim() && loose[2]) {
    return `${loose[1].trim()} <${loose[2]}>`;
  }

  if (EMAIL_ADDR.test(value)) return value;

  const fallback = fallbackNoreply(env);
  if (fallback && !value.includes("@")) {
    return `${value} <${fallback}>`;
  }

  return value;
}

function fallbackNoreply(env: Env): string | undefined {
  const raw = envTrim(env, "BETTER_AUTH_URL");
  if (!raw) return undefined;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host.includes(".") ? `noreply@${host}` : undefined;
  } catch {
    return undefined;
  }
}

export function isUsableFromAddress(from: string): boolean {
  return EMAIL_ADDR.test(extractEmailAddress(from));
}

/**
 * When no Resend or SMTP is configured, print the code to the server log.
 * On Vercel (and any NODE_ENV=production) this stays off unless explicitly
 * enabled — otherwise a forgotten EMAIL_FROM would succeed without mail.
 */
export function allowOtpLog(env: Env): boolean {
  const flag = envTrim(env, "EMAIL_OTP_ALLOW_LOG");
  if (flag === "true") return true;
  if (flag === "false") return false;
  if (envTrim(env, "VERCEL")) return false;
  return envTrim(env, "NODE_ENV") !== "production";
}

/**
 * Pick how to deliver a reset code.
 *
 *   resend  — RESEND_API_KEY + EMAIL_FROM
 *   smtp    — SMTP_HOST + EMAIL_FROM
 *   log     — local fallback: print the code, do not send
 *   invalid — mail was started but EMAIL_FROM is missing or unusable
 *   none    — production with nothing configured
 */
export function resolveMailer(env: Env): Mailer {
  const from = normalizeEmailFrom(envTrim(env, "EMAIL_FROM"), env);
  const resendKey = envTrim(env, "RESEND_API_KEY");
  const host = envTrim(env, "SMTP_HOST");

  if ((resendKey || host) && !from) {
    return { kind: "invalid", reason: "EMAIL_FROM is required" };
  }

  if (from && !isUsableFromAddress(from)) {
    return { kind: "invalid", reason: "EMAIL_FROM is malformed" };
  }

  if (resendKey && from) {
    return { kind: "resend", apiKey: resendKey, from };
  }

  if (host && from) {
    const parsedPort = Number(envTrim(env, "SMTP_PORT") || "587");
    const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;
    const secureFlag = envTrim(env, "SMTP_SECURE");
    const secure = secureFlag === "true" || (secureFlag !== "false" && port === 465);
    return {
      kind: "smtp",
      host,
      port,
      secure,
      user: envTrim(env, "SMTP_USER"),
      pass: envTrim(env, "SMTP_PASS"),
      from,
    };
  }

  if (allowOtpLog(env)) return { kind: "log" };
  return { kind: "none" };
}

export function mailerNotReadyMessage(mailer: Extract<Mailer, { kind: "none" | "invalid" }>): string {
  if (mailer.kind === "invalid") {
    return mailer.reason === "EMAIL_FROM is malformed"
      ? `邮件服务还没配好：EMAIL_FROM 请写成 ${EMAIL_FROM_EXAMPLE}`
      : "邮件服务还没配好：已经有发信配置，但缺少 EMAIL_FROM";
  }
  return "邮件服务还没配好：Vercel 里要有 EMAIL_FROM 和 RESEND_API_KEY，保存后 Redeploy";
}

/** `搭子日程 <a@b.com>` → `a@b.com`. A bare address is returned as-is. */
export function extractEmailAddress(from: string): string {
  const match = String(from).match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}

/** `you@email.com` → `yo***@email.com` for server logs. */
export function maskEmail(email: string): string {
  const trimmed = String(email).trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const shown = local.length <= 1 ? `${local}*` : `${local.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}

/** Pull a short provider message out of `Resend 403: {"message":"..."}`. */
export function parseProviderDetail(raw: unknown, max = 180): string {
  const text = String(raw ?? "");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { message?: unknown };
      if (parsed && typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.replace(/\s+/g, " ").trim().slice(0, max);
      }
    } catch {
      /* not JSON */
    }
  }
  return text
    .replace(/^Resend \d+:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Resend or SMTP failure → Chinese copy the user can act on. */
export function formatMailerError(raw: unknown): string {
  const detail = parseProviderDetail(raw);
  const hay = `${String(raw ?? "")}\n${detail}`;
  if (/timed out|timeout|aborted/i.test(hay)) {
    return "验证码发送超时，请稍后再试";
  }
  if (/not verified|unverified domain/i.test(hay)) {
    return `发件域名还没在 Resend 验证通过。EMAIL_FROM 必须是已验证域名，例如 ${EMAIL_FROM_EXAMPLE}。${detail}`;
  }
  if (/401|unauthorized|invalid.*api.?key|api[_ ]?key/i.test(hay)) {
    return "Resend API Key 无效，请检查 Vercel 的 RESEND_API_KEY，保存后 Redeploy。";
  }
  if (/from/i.test(hay) && /invalid|not allowed|unauthorized|malformed/i.test(hay)) {
    return `EMAIL_FROM 不被 Resend 接受。请写成 ${EMAIL_FROM_EXAMPLE}（尖括号不能省，也不要加引号）。${detail}`;
  }
  if (/SMTP/i.test(hay)) {
    return `SMTP 发信失败：${detail || "请检查主机、端口和授权码"}`;
  }
  return detail ? `验证码发送失败：${detail}` : "验证码发送失败，请稍后再试";
}

export function passwordResetEmail(otp: string): { subject: string; text: string; html: string } {
  const subject = `${APP_NAME}验证码 ${otp}`;
  const text = [
    `你正在重置${APP_NAME}的登录密码。`,
    "",
    `验证码：${otp}`,
    "",
    `请在 ${RESET_OTP_MINUTES} 分钟内输入。如果不是你本人操作，忽略这封邮件即可。`,
  ].join("\n");
  const html = [
    `<div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#1c1915;line-height:1.6">`,
    `<p>你正在重置${APP_NAME}的登录密码。</p>`,
    `<p style="font-size:28px;letter-spacing:0.25em;font-weight:600">${otp}</p>`,
    `<p style="color:#6b6560">请在 ${RESET_OTP_MINUTES} 分钟内输入。如果不是你本人操作，忽略这封邮件即可。</p>`,
    `</div>`,
  ].join("");
  return { subject, text, html };
}
