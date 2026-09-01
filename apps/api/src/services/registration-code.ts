import crypto from "node:crypto";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 60 * 1000;

export function hashRegistrationCode(email: string, code: string): string {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export function generateRegistrationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function formatRegistrationCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function maskRegistrationEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
