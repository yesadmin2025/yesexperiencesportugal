import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Best-effort, server-side rate limit for anonymous endpoints.
 * - Keyed by sessionId + bucket.
 * - Returns { ok: false } when caller exceeds `limit` calls in `windowSec`.
 *
 * Uses service-role to upsert into public.builder_rate_limits (RLS bypassed).
 * Storage is intentionally tiny: one row per (sessionId, bucket).
 */
export async function rateLimit(opts: {
  sessionId: string;
  bucket: string;
  limit: number;
  windowSec: number;
}): Promise<{ ok: boolean; remaining: number; resetInSec: number }> {
  const sid = (opts.sessionId || "").trim();
  if (sid.length < 8 || sid.length > 64) {
    return { ok: false, remaining: 0, resetInSec: opts.windowSec };
  }
  const now = Date.now();

  try {
    const { data: row } = await supabaseAdmin
      .from("builder_rate_limits")
      .select("call_count,last_call_at")
      .eq("session_id", sid)
      .eq("bucket", opts.bucket)
      .maybeSingle();

    if (!row) {
      await supabaseAdmin
        .from("builder_rate_limits")
        .insert({ session_id: sid, bucket: opts.bucket, call_count: 1 });
      return { ok: true, remaining: opts.limit - 1, resetInSec: opts.windowSec };
    }

    const last = new Date(row.last_call_at).getTime();
    const elapsed = (now - last) / 1000;

    if (elapsed >= opts.windowSec) {
      await supabaseAdmin
        .from("builder_rate_limits")
        .update({ call_count: 1, last_call_at: new Date(now).toISOString() })
        .eq("session_id", sid)
        .eq("bucket", opts.bucket);
      return { ok: true, remaining: opts.limit - 1, resetInSec: opts.windowSec };
    }

    if (row.call_count >= opts.limit) {
      return {
        ok: false,
        remaining: 0,
        resetInSec: Math.max(1, Math.ceil(opts.windowSec - elapsed)),
      };
    }

    await supabaseAdmin
      .from("builder_rate_limits")
      .update({
        call_count: row.call_count + 1,
        last_call_at: new Date(now).toISOString(),
      })
      .eq("session_id", sid)
      .eq("bucket", opts.bucket);

    return {
      ok: true,
      remaining: opts.limit - row.call_count - 1,
      resetInSec: Math.max(1, Math.ceil(opts.windowSec - elapsed)),
    };
  } catch {
    // Fail-open so a transient DB blip doesn't break the UX, but log nothing
    // sensitive. The DB-level abuse cap (UNIQUE row + service role) still applies.
    return { ok: true, remaining: opts.limit, resetInSec: opts.windowSec };
  }
}
