// Shared admin auth check for edge functions.
// Verifies the caller's JWT and confirms they have the 'admin' role in user_roles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AdminCheckResult {
  ok: boolean;
  status: number;
  userId?: string;
  error?: string;
}

export async function requireAdmin(req: Request): Promise<AdminCheckResult> {
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return { ok: false, status: 401, error: "Empty bearer token" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, status: 500, error: "Server not configured" };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  const userId = userData.user.id;

  // Reject anonymous (is_anonymous) JWTs.
  // @ts-ignore: is_anonymous is on supabase user metadata
  if (userData.user.is_anonymous) {
    return { ok: false, status: 403, error: "Anonymous users not allowed" };
  }

  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr) return { ok: false, status: 500, error: roleErr.message };
  if (!roleRow) return { ok: false, status: 403, error: "Admin role required" };

  return { ok: true, status: 200, userId };
}
