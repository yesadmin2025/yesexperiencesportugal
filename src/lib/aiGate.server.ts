import { getRequest } from "@tanstack/react-start/server";
import { rateLimit } from "@/lib/rateLimit.server";
import { getVerifiedUserId } from "@/lib/verifiedCaller.server";

/**
 * Server-side gate for metered AI calls on public surfaces (Studio/Builder).
 *
 * Guests are allowed, but only within caps the client cannot influence:
 *  - per network address: GUEST_IP_LIMIT calls per 10-minute slot per bucket;
 *  - site-wide: GLOBAL_DAILY_LIMIT calls per UTC day per bucket.
 * Signed-in callers skip the IP cap but still count toward the daily cap.
 * Any cap reached → false, and the caller uses its deterministic fallback.
 */
export const GUEST_IP_LIMIT = 60;
export const GLOBAL_DAILY_LIMIT = 10000;
const IP_SLOT_SEC = 600;

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(): string | null {
  const h = getRequest()?.headers;
  if (!h) return null;
  const ip =
    h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip");
  return ip?.trim() || null;
}

export async function aiCallAllowed(bucket: string): Promise<boolean> {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
  const verified = await getVerifiedUserId();

  if (!verified) {
    const ip = clientIp();
    if (!ip) return false;
    // Slot-stamped key so the window truly resets (rateLimit extends on each call).
    const slot = Math.floor(now / 1000 / IP_SLOT_SEC);
    const ipRl = await rateLimit({
      sessionId: `ip${await sha(`${ip}|${slot}`)}`,
      bucket: `ai_ip_${bucket}`,
      limit: GUEST_IP_LIMIT,
      windowSec: IP_SLOT_SEC,
    });
    if (!ipRl.ok) return false;
  }

  const globalRl = await rateLimit({
    sessionId: `global-day-${day}`,
    bucket: `ai_day_${bucket}`,
    limit: GLOBAL_DAILY_LIMIT,
    windowSec: 86400,
  });
  return globalRl.ok;
}

/** Returns LOVABLE_API_KEY when the call is allowed, otherwise undefined. */
export async function allowAiCall(bucket: string): Promise<string | undefined> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return undefined;
  return (await aiCallAllowed(bucket)) ? key : undefined;
}
