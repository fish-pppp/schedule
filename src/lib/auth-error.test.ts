import assert from "node:assert/strict";
import test from "node:test";

import { friendlyAuthError, passwordResetSendResult } from "./auth-error.ts";

test("friendlyAuthError maps sign-in and reset failures", () => {
  assert.equal(friendlyAuthError("Invalid email or password", "没有完成，请再试一次"), "邮箱或密码不对");
  assert.equal(
    friendlyAuthError("User already exists. Use another email.", "没有完成，请再试一次"),
    "这个邮箱已经注册过了",
  );
  assert.equal(friendlyAuthError("Invalid email", "没有完成，请再试一次"), "请填写有效的邮箱");
  assert.equal(friendlyAuthError("Password too short", "没有完成，请再试一次"), "密码至少 8 位");
  assert.equal(friendlyAuthError("OTP expired", "改密码失败"), "验证码过期了，请重新发送");
  assert.equal(friendlyAuthError("Invalid OTP", "改密码失败"), "验证码不对");
  assert.equal(friendlyAuthError("Too many attempts", "改密码失败"), "验证码试太多次了，请重新发送");
  assert.equal(
    friendlyAuthError("Too many requests. Please try again later.", "验证码发送失败，请稍后再试"),
    "操作太频繁，稍等一下再试",
  );
  assert.equal(friendlyAuthError("relation verification does not exist", "验证码发送失败，请稍后再试"), "验证码发送失败，请稍后再试");
  assert.equal(friendlyAuthError("", "改密码失败"), "改密码失败");
});

test("friendlyAuthError keeps a Chinese mailer reason and shortens a missing config", () => {
  assert.equal(
    friendlyAuthError("发件域名还没在 Resend 验证通过。diyforvisa.com", "验证码发送失败，请稍后再试"),
    "发件域名还没在 Resend 验证通过。diyforvisa.com",
  );
  assert.equal(
    friendlyAuthError("邮件服务还没配好：EMAIL_FROM 请写成 搭子日程 <noreply@diyforvisa.com>", "验证码发送失败，请稍后再试"),
    "邮件服务还没配好，暂时发不了验证码",
  );
});

test("passwordResetSendResult distinguishes delivery from an unknown email", () => {
  assert.deepEqual(passwordResetSendResult({ delivered: true, error: null, channel: "mail" }), {
    sent: true,
    delivery: "mail",
  });
  assert.deepEqual(passwordResetSendResult({ delivered: true, error: null, channel: "log" }), {
    sent: true,
    delivery: "log",
  });
  assert.deepEqual(passwordResetSendResult({ delivered: false, error: null, channel: null }), {
    error: "验证码没有发出去：这个邮箱还没注册",
  });
  assert.deepEqual(
    passwordResetSendResult({
      delivered: false,
      error: "验证码发送失败：domain is not verified",
      channel: null,
    }),
    { error: "验证码发送失败：domain is not verified" },
  );
});
