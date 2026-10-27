import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export async function resetPasswordWithCode(input: {
  email: string;
  otp: string;
  password: string;
}): Promise<void> {
  const { error } = await authClient.emailOtp.resetPassword({
    email: input.email.trim().toLowerCase(),
    otp: input.otp.trim(),
    password: input.password,
  });
  if (error) throw new Error(error.message || "改密码失败");
}
