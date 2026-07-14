import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importAllTours } from "@/lib/tourImporter.server";

/**
 * Admin-gated server function: kicks off a fresh tour import run.
 * Verifies the caller has the `admin` role via the user_roles table
 * before doing any scraping or AI calls.
 */
export const runTourImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr) throw new Error(`Role check failed: ${roleErr.message}`);
    if (!roleRow) throw new Error("Forbidden: admin role required");

    return importAllTours({ ranBy: userId });
  });
