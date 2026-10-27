/**
 * Deliver a password-reset code. Server-only.
 *
 * Prefer Resend (HTTPS). SMTP covers QQ, 163, and a self-hosted server.
 * Locally, with neither configured, the code is printed to the server log.
 * Better Auth swallows sendVerificationOTP errors, so the result is recorded
 * on `otpSendTrace` for the caller that is waiting.
 */
import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { writeFileSync } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

import {
  extractEmailAddress,
  formatMailerError,
  mailerNotReadyMessage,
  maskEmail,
  passwordResetEmail,
  resolveMailer,
} from "@/lib/otp-mail";

export type OtpSendTrace = {
  delivered: boolean;
  error: string | null;
  channel: "log" | "mail" | null;
};

const globalForOtp = globalThis as typeof globalThis & {
  __scheduleOtpSendTrace?: AsyncLocalStorage<OtpSendTrace>;
};

export const otpSendTrace = (globalForOtp.__scheduleOtpSendTrace ??= new AsyncLocalStorage<OtpSendTrace>());

function noteSend(update: Partial<OtpSendTrace>): void {
  const store = otpSendTrace.getStore();
  if (!store) return;
  if (update.delivered) store.delivered = true;
  if (update.error) store.error = update.error;
  if (update.channel) store.channel = update.channel;
}

const SMTP_TIMEOUT_MS = 20_000;
const RESET_OTP_FILE = "/tmp/schedule-reset-otp.json";

export async function sendPasswordResetOtp(input: { email: string; otp: string }): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const mailer = resolveMailer(process.env);
  const content = passwordResetEmail(input.otp);

  if (mailer.kind === "log") {
    console.info(`[auth] RESET_OTP ${maskEmail(email)} ${input.otp}`);
    try {
      writeFileSync(RESET_OTP_FILE, `${JSON.stringify({ email, otp: input.otp, at: Date.now() })}\n`);
    } catch {
      /* the log line above is enough */
    }
    noteSend({ delivered: true, channel: "log" });
    return;
  }

  if (mailer.kind === "none" || mailer.kind === "invalid") {
    const message = mailerNotReadyMessage(mailer);
    console.error("[auth] password-reset mail is not configured", mailer);
    noteSend({ error: message });
    throw new Error(message);
  }

  try {
    if (mailer.kind === "resend") {
      await sendResend({
        apiKey: mailer.apiKey,
        from: mailer.from,
        to: email,
        ...content,
      });
    } else {
      await sendSmtp({
        host: mailer.host,
        port: mailer.port,
        secure: mailer.secure,
        user: mailer.user,
        pass: mailer.pass,
        from: mailer.from,
        to: email,
        ...content,
      });
    }
    noteSend({ delivered: true, channel: "mail" });
  } catch (error) {
    const message = formatMailerError(error instanceof Error ? error.message : error);
    console.error("[auth] failed to send reset OTP to", maskEmail(email), error);
    noteSend({ error: message });
    throw new Error(message);
  }
}

async function sendResend(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const mailbox = extractEmailAddress(input.from);
  const froms = input.from === mailbox ? [input.from] : [input.from, mailbox];
  let lastError = "";

  for (const from of froms) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(SMTP_TIMEOUT_MS),
    });
    if (response.ok) return;
    const detail = await response.text().catch(() => "");
    lastError = `Resend ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`;
    if (!/invalid[`\s]*from/i.test(detail) || from === mailbox) break;
  }

  throw new Error(lastError);
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendSmtp(config: SmtpConfig): Promise<void> {
  await withTimeout(smtpSession(config), SMTP_TIMEOUT_MS, "SMTP timed out");
}

async function smtpSession(config: SmtpConfig): Promise<void> {
  let socket: Socket | TLSSocket = config.secure
    ? await connectTls(config.host, config.port)
    : await connectPlain(config.host, config.port);

  try {
    await readReply(socket, 220);
    await command(socket, "EHLO schedule");
    await readReply(socket, 250);

    if (!config.secure) {
      socket = await upgradeStartTls(socket, config.host);
      await command(socket, "EHLO schedule");
      await readReply(socket, 250);
    }

    if (config.user) {
      await command(socket, "AUTH LOGIN");
      await readReply(socket, 334);
      await command(socket, Buffer.from(config.user, "utf8").toString("base64"));
      await readReply(socket, 334);
      await command(socket, Buffer.from(config.pass ?? "", "utf8").toString("base64"));
      await readReply(socket, 235);
    }

    const fromAddr = extractEmailAddress(config.from);
    await command(socket, `MAIL FROM:<${fromAddr}>`);
    await readReply(socket, 250);
    await command(socket, `RCPT TO:<${config.to}>`);
    await readReply(socket, 250);
    await command(socket, "DATA");
    await readReply(socket, 354);
    socket.write(`${buildMime(config)}\r\n.\r\n`);
    await readReply(socket, 250);
    await command(socket, "QUIT").catch(() => undefined);
  } finally {
    socket.destroy();
  }
}

function connectPlain(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => resolve(socket));
    socket.once("error", reject);
  });
}

function connectTls(host: string, port: number): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({ host, port, servername: host }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function upgradeStartTls(socket: Socket, host: string): Promise<TLSSocket> {
  await command(socket, "STARTTLS");
  await readReply(socket, 220);
  return new Promise((resolve, reject) => {
    const tlsSocket = tlsConnect({ socket, servername: host }, () => resolve(tlsSocket));
    tlsSocket.once("error", reject);
  });
}

function command(socket: Socket, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(`${line}\r\n`, (error) => (error ? reject(error) : resolve()));
  });
}

function readReply(socket: Socket, code: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      const lines = buf.split(/\r?\n/).filter((line) => line.length > 0);
      const last = lines[lines.length - 1];
      if (!last || !/^\d{3}[ -]/.test(last) || last[3] === "-") return;
      socket.off("data", onData);
      socket.off("error", onError);
      const got = Number(last.slice(0, 3));
      if (got !== code) {
        reject(new Error(`SMTP expected ${code}, got ${got}: ${last.slice(0, 120)}`));
        return;
      }
      resolve(buf);
    };
    const onError = (error: Error) => {
      socket.off("data", onData);
      reject(error);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

function buildMime(config: SmtpConfig): string {
  const boundary = `sc${Date.now().toString(36)}`;
  const subject = `=?UTF-8?B?${Buffer.from(config.subject, "utf8").toString("base64")}?=`;
  return [
    `From: ${config.from}`,
    `To: ${config.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(config.text, "utf8").toString("base64"),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(config.html, "utf8").toString("base64"),
    `--${boundary}--`,
  ].join("\r\n");
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
