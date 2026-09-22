import { createHash } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { rateLimit } from "./rateLimit.server";

/**
 * Network-level abuse guard for anonymous server functions that spend money
 * (paid AI gateway calls).
 *
 * The existing per-session rate limit is bypassable because `sessionId` is
 * chosen by the caller. This guard hashes the caller's network address so a
 * single client can't unlock more quota by rotating session ids.
 */
export function callerFingerprint(): string {
  let ip = "unknown";
  try {
    const headers = getRequest()?.headers;
    ip =
      headers?.get("cf-connecting-ip") ??
      headers?.get("x-real-ip") ??
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
  } catch {
    // Not in a request context (SSR prerender, tests) — fall through.
  }
  return `ip-${createHash("sha256").update(ip).digest("hex").slice(0, 40)}`;
}

/** Returns { ok: false } when this network address exceeded its AI quota. */
export async function guardAiCaller(opts: {
  bucket: string;
  limit: number;
  windowSec: number;
}): Promise<{ ok: boolean; remaining: number; resetInSec: number }> {
  return rateLimit({
    sessionId: callerFingerprint(),
    bucket: `ip:${opts.bucket}`,
    limit: opts.limit,
    windowSec: opts.windowSec,
  });
}
