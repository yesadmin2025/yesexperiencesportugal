/**
 * Phase 0A guard — OAuth + admin role. No allow-list, no service-role.
 * DELETED in Phase 0B once the three-factor requireOwner ships.
 */

import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export type AdminOk = { ok: true; uid: string; email: string | null };
export type AdminDeny = { ok: false; code: "unauthenticated" | "forbidden" | "error"; message: string };

export async function requireAdmin(ctx: ToolContext): Promise<AdminOk | AdminDeny> {
  if (!ctx.isAuthenticated()) {
    return { ok: false, code: "unauthenticated", message: "Not authenticated." };
  }
  const uid = ctx.getUserId();
  if (!uid) {
    return { ok: false, code: "unauthenticated", message: "Token has no subject." };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data, error } = await supabase.rpc("has_role", {
    _user_id: uid,
    _role: "admin",
  });

  if (error) {
    return { ok: false, code: "error", message: "Role check failed." };
  }
  if (data !== true) {
    return { ok: false, code: "forbidden", message: "Admin role required." };
  }
  return { ok: true, uid, email: ctx.getUserEmail() ?? null };
}
