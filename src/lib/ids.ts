import { randomBytes, randomUUID } from "node:crypto";

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

export function createId(): string {
  return randomUUID();
}

export function createInviteCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}
