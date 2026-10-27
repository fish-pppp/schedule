import assert from "node:assert/strict";
import test from "node:test";

import { isPublicPath } from "./public-paths.ts";

test("forgot password and auth endpoints stay public", () => {
  assert.equal(isPublicPath("/forgot-password"), true);
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/register"), true);
  assert.equal(isPublicPath("/join/abc"), true);
  assert.equal(isPublicPath("/api/auth/email-otp/reset-password"), true);
  assert.equal(isPublicPath("/"), false);
  assert.equal(isPublicPath("/account"), false);
  assert.equal(isPublicPath("/forgot-password-other"), false);
});