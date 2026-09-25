import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns the verified user id from the request's bearer token, or null.
 * Used to gate metered/paid work without throwing (callers fall back).
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const auth = getRequest()?.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const sb = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  if ((data.claims as { is_anonymous?: boolean }).is_anonymous) return null;
  return data.claims.sub as string;
}
