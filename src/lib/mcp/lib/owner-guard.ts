/**
 * Phase 0B three-factor owner guard.
 *
 * A caller passes ONLY if all three hold:
 *   1. Valid OAuth authentication (bearer token verified by mcp-js).
 *   2. `admin` role via public.has_role (caller-scoped RLS read).
 *   3. Exact membership in public.mcp_owner_allowlist (service-role read).
 *
 * The allow-list read uses supabaseAdmin because the table has RLS enabled
 * with NO user-facing policies — service_role is the only path. supabaseAdmin
 * is imported lazily inside this module and MUST NOT be re-exported to tool
 * handlers; tool code receives only the `{ ok, uid, email }` result.
 */

import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export type OwnerOk = { ok: true; uid: string; email: string | null };
export type OwnerDeny = {
  ok: false;
  code: "unauthenticated" | "forbidden" | "error";
  message: string;
};

export async function requireOwner(ctx: ToolContext): Promise<OwnerOk | OwnerDeny> {
  if (!ctx.isAuthenticated()) {
    return { ok: false, code: "unauthenticated", message: "Not authenticated." };
  }
  const uid = ctx.getUserId();
  if (!uid) {
    return { ok: false, code: "unauthenticated", message: "Token has no subject." };
  }

  // Factor 2 — admin role, evaluated as the caller (RLS on user_roles applies).
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const roleRes = await userClient.rpc("has_role", {
    _user_id: uid,
    _role: "admin",
  });
  if (roleRes.error) {
    return { ok: false, code: "error", message: "Role check failed." };
  }
  if (roleRes.data !== true) {
    return { ok: false, code: "forbidden", message: "Admin role required." };
  }

  // Factor 3 — allow-list membership. Table has RLS + no policies; only
  // service_role can read it. Lazy import so no client bundle graph pulls it in.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const allowRes = await supabaseAdmin
    .from("mcp_owner_allowlist")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (allowRes.error) {
    return { ok: false, code: "error", message: "Allow-list check failed." };
  }
  if (!allowRes.data) {
    return { ok: false, code: "forbidden", message: "Not authorised." };
  }

  return { ok: true, uid, email: ctx.getUserEmail() ?? null };
}
