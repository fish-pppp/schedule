import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_NAME,
  EMAIL_FROM_EXAMPLE,
  RESET_OTP_LENGTH,
  RESET_OTP_MINUTES,
  RESET_OTP_SECONDS,
  allowOtpLog,
  extractEmailAddress,
  formatMailerError,
  isMailbox,
  mailerNotReadyMessage,
  maskEmail,
  normalizeEmailFrom,
  passwordResetEmail,
  resolveMailer,
} from "./otp-mail.ts";

test("reset OTP timing matches the copy", () => {
  assert.equal(RESET_OTP_LENGTH, 6);
  assert.equal(RESET_OTP_MINUTES, 10);
  assert.equal(RESET_OTP_SECONDS, 600);
});

test("isMailbox accepts a normal address", () => {
  assert.equal(isMailbox("you@email.com"), true);
  assert.equal(isMailbox("not-an-email"), false);
  assert.equal(isMailbox("you@email"), false);
});

test("resolveMailer prefers Resend when both providers are set", () => {
  const mailer = resolveMailer({
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: `${APP_NAME} <noreply@example.com>`,
    SMTP_HOST: "smtp.qq.com",
    SMTP_USER: "a@qq.com",
    SMTP_PASS: "secret",
  });
  assert.deepEqual(mailer, {
    kind: "resend",
    apiKey: "re_test",
    from: `${APP_NAME} <noreply@example.com>`,
  });
});

test("resolveMailer reads SMTP and defaults 465 to implicit TLS", () => {
  const mailer = resolveMailer({
    SMTP_HOST: "smtp.qq.com",
    SMTP_PORT: "465",
    SMTP_USER: "a@qq.com",
    SMTP_PASS: "auth-code",
    EMAIL_FROM: "a@qq.com",
  });
  assert.equal(mailer.kind, "smtp");
  if (mailer.kind !== "smtp") return;
  assert.equal(mailer.port, 465);
  assert.equal(mailer.secure, true);
  assert.equal(mailer.user, "a@qq.com");
});

test("resolveMailer treats 587 as STARTTLS unless SMTP_SECURE=true", () => {
  const mailer = resolveMailer({
    SMTP_HOST: "smtp.example.com",
    EMAIL_FROM: "noreply@example.com",
  });
  assert.equal(mailer.kind, "smtp");
  if (mailer.kind !== "smtp") return;
  assert.equal(mailer.port, 587);
  assert.equal(mailer.secure, false);
});

test("envTrim strips wrapping quotes on EMAIL_FROM", () => {
  const mailer = resolveMailer({
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: `"${EMAIL_FROM_EXAMPLE}"`,
  });
  assert.equal(mailer.kind, "resend");
  if (mailer.kind !== "resend") return;
  assert.equal(mailer.from, EMAIL_FROM_EXAMPLE);
});

test("normalizeEmailFrom restores a display name that lost its angle brackets", () => {
  assert.equal(
    normalizeEmailFrom(APP_NAME, { BETTER_AUTH_URL: "https://www.schedule.diyforvisa.com" }),
    `${APP_NAME} <noreply@schedule.diyforvisa.com>`,
  );
  assert.equal(
    normalizeEmailFrom(`${APP_NAME} noreply@diyforvisa.com`),
    `${APP_NAME} <noreply@diyforvisa.com>`,
  );
  assert.equal(
    normalizeEmailFrom(`${APP_NAME} &lt;noreply@diyforvisa.com&gt;`),
    EMAIL_FROM_EXAMPLE,
  );
  assert.equal(
    normalizeEmailFrom(`${APP_NAME} ＜noreply@diyforvisa.com＞`),
    EMAIL_FROM_EXAMPLE,
  );
});

test("resolveMailer rejects a display name with no mailbox", () => {
  assert.deepEqual(resolveMailer({ RESEND_API_KEY: "re_test", EMAIL_FROM: APP_NAME }), {
    kind: "invalid",
    reason: "EMAIL_FROM is malformed",
  });
});

test("mailerNotReadyMessage names the example sender", () => {
  const message = mailerNotReadyMessage({ kind: "invalid", reason: "EMAIL_FROM is malformed" });
  assert.match(message, /邮件服务还没配好/);
  assert.match(message, new RegExp(EMAIL_FROM_EXAMPLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("formatMailerError explains a Resend unverified domain", () => {
  const message = formatMailerError(
    'Resend 403: {"statusCode":403,"message":"The diyforvisa.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"}',
  );
  assert.match(message, /发件域名还没在 Resend 验证通过/);
  assert.match(message, /diyforvisa.com/);
});

test("formatMailerError explains a bad API key and a timeout", () => {
  assert.match(formatMailerError('Resend 401: {"message":"Invalid API key"}'), /API Key 无效/);
  assert.equal(formatMailerError("SMTP timed out"), "验证码发送超时，请稍后再试");
});

test("resolveMailer rejects a half-configured provider", () => {
  assert.deepEqual(resolveMailer({ RESEND_API_KEY: "re_test" }), {
    kind: "invalid",
    reason: "EMAIL_FROM is required",
  });
});

test("allowOtpLog is off on Vercel unless explicitly enabled", () => {
  assert.equal(allowOtpLog({ VERCEL: "1" }), false);
  assert.equal(allowOtpLog({ VERCEL: "1", EMAIL_OTP_ALLOW_LOG: "true" }), true);
  assert.equal(allowOtpLog({ NODE_ENV: "production" }), false);
  assert.equal(allowOtpLog({ NODE_ENV: "development" }), true);
  assert.equal(allowOtpLog({}), true);
});

test("resolveMailer logs locally and refuses production without a provider", () => {
  assert.deepEqual(resolveMailer({ NODE_ENV: "development" }), { kind: "log" });
  assert.deepEqual(resolveMailer({ NODE_ENV: "production" }), { kind: "none" });
});

test("extractEmailAddress and maskEmail", () => {
  assert.equal(extractEmailAddress(`${APP_NAME} <noreply@example.com>`), "noreply@example.com");
  assert.equal(extractEmailAddress("you@email.com"), "you@email.com");
  assert.equal(maskEmail("you@email.com"), "yo***@email.com");
  assert.equal(maskEmail("a@x.io"), "a*@x.io");
  assert.equal(maskEmail("not-an-email"), "***");
});

test("password reset email includes the OTP and the app name", () => {
  const mail = passwordResetEmail("483920");
  assert.match(mail.subject, /483920/);
  assert.match(mail.subject, new RegExp(APP_NAME));
  assert.match(mail.text, /483920/);
  assert.match(mail.html, /483920/);
  assert.match(mail.text, /10 分钟/);
});
