import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { RESET_OTP_LENGTH, RESET_OTP_SECONDS } from "@/lib/otp-mail";
import { sendPasswordResetOtp } from "@/lib/send-reset-mail";

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      "localhost:3000",
      "127.0.0.1:3000",
      "www.schedule.diyforvisa.com",
      "schedule.diyforvisa.com",
      "*.vercel.app",
    ],
    fallback: "https://www.schedule.diyforvisa.com",
    protocol: "auto",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://www.schedule.diyforvisa.com",
    "https://schedule.diyforvisa.com",
    "https://schedule-blush-nine.vercel.app",
    "https://schedule-yyj510119-1020s-projects.vercel.app",
  ],
  advanced: {
    trustedProxyHeaders: true,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
  },
  plugins: [
    emailOTP({
      otpLength: RESET_OTP_LENGTH,
      expiresIn: RESET_OTP_SECONDS,
      allowedAttempts: 5,
      storeOTP: "hashed",
      disableSignUp: true,
      sendVerificationOnSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "forget-password") {
          throw new Error("Unsupported OTP type");
        }
        await sendPasswordResetOtp({ email, otp });
      },
    }),
    nextCookies(),
  ],
});
