import { randomBytes } from "crypto";

export function generateToken(expirySec = 3600000) {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + expirySec); // token valid for 1 hour

  return { token, expiry };
}
