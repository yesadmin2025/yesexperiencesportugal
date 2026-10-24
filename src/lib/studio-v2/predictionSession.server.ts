/**
 * Signed anonymous ids for Studio v2 prediction state.
 * Format: <32 hex random>-<32 hex HMAC>. Only the server can mint a valid id,
 * so a caller cannot read or overwrite another visitor's taste signals.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.BUILDER_SESSION_SIGNING_SECRET;
  if (!s) throw new Error("Session signing is not configured.");
  return s;
}

function sign(raw: string): string {
  return createHmac("sha256", secret()).update(`pred:${raw}`).digest("hex").slice(0, 32);
}

export function mintPredictionSessionId(): string {
  const raw = randomBytes(16).toString("hex");
  return `${raw}-${sign(raw)}`;
}

export function isValidPredictionSessionId(id: string): boolean {
  const m = /^([0-9a-f]{32})-([0-9a-f]{32})$/.exec(id);
  if (!m) return false;
  const a = Buffer.from(m[2], "hex");
  const b = Buffer.from(sign(m[1]), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
