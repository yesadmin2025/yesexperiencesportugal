/**
 * Studio V3 — load a saved Signature by share token (Phase 7A hydration).
 *
 * Public server fn (no auth) — relies on supabaseAdmin to filter strictly
 * by status='saved' + token match. Returns the persisted Studio V3 state
 * snapshot so the client can rehydrate the reveal.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  token: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[a-z0-9]+$/i),
});

export const loadStudioV3Signature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("studio_v3_leads")
      .select("id, journey_title, skeleton_tour_key, state, saved_at")
      .eq("share_token", data.token)
      .eq("status", "saved")
      .maybeSingle();

    if (error) {
      console.error("[studio-v3 load] select failed", error);
      throw new Error("Could not load this Signature.");
    }

    if (!row) return { found: false as const };

    return {
      found: true as const,
      id: row.id as string,
      journeyTitle: (row.journey_title as string | null) ?? null,
      skeletonTourKey: (row.skeleton_tour_key as string | null) ?? null,
      savedAt: (row.saved_at as string | null) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: (row.state ?? {}) as any,
    };
  });
