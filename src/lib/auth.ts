import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

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
  plugins: [nextCookies()],
});
