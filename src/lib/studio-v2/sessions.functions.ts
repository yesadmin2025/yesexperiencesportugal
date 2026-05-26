import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Studio v2 — share / resume sessions.
 *
 * Persists the traveller profile under a short public token. Anyone with
 * the token can resume the experience at /s/$token. No PII required.
 */

// Loose schema — the profile shape evolves; we validate shape, not internals.
const profileSchema = z
  .object({
    name: z.string().max(80).optional(),
    intent: z.string().max(40).optional(),
    pace: z.string().max(20).optional(),
    duration: z.string().max(20).optional(),
    durationDays: z.number().int().min(1).max(30).optional(),
    socialEnergy: z.number().min(0).max(100),
    cultureInterest: z.number().min(0).max(100),
    foodInterest: z.number().min(0).max(100),
    coastalAffinity: z.number().min(0).max(100),
    wellnessAffinity: z.number().min(0).max(100),
    driveToleranceMin: z.number().min(0).max(240),
    stopDensityTarget: z.number().min(1).max(10),
    group: z.record(z.string(), z.any()).optional(),
    priorityWeights: z.record(z.string(), z.number()).default({}),
    enhancements: z.array(z.string()).max(20).default([]),
    ops: z.record(z.string(), z.any()).default({}),
    archetype: z.string().max(40).optional(),
    confidence: z.record(z.string(), z.number()).default({}),
  })
  .passthrough();

function makeToken(bytes = 9): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export const createStudioSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      profile: profileSchema,
      region: z.string().max(40).optional(),
      archetype: z.string().max(40).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const shareToken = makeToken(9);
    const { error } = await supabaseAdmin
      .from("studio_v2_sessions")
      .insert({
        share_token: shareToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: data.profile as any,
        region: data.region ?? null,
        archetype: data.archetype ?? null,
      });
    if (error) throw new Error(error.message);
    return { shareToken };
  });


export const loadStudioSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ shareToken: z.string().min(6).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("studio_v2_sessions")
      .select("profile, region, archetype, updated_at, revoked_at")
      .eq("share_token", data.shareToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    if (row.revoked_at) return { found: false as const, revoked: true as const };
    return {
      found: true as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile: row.profile as any,
      region: (row.region as string | null) ?? null,
      archetype: (row.archetype as string | null) ?? null,
      updatedAt: row.updated_at as string,
    };
  });

