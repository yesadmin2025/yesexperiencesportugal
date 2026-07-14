/**
 * Studio V3 — saveable Signature (Phase 7A).
 *
 * Persists a composed Studio V3 draft as a "saved" signature with a short
 * share token so the user can reopen it later. No PII required — name and
 * email are optional. Reuses the existing studio_v3_leads table with
 * status='saved' (see migration adding share_token + saved_at).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  journeyTitle: z.string().trim().max(200).nullable().optional(),
  skeletonTourKey: z.string().trim().max(120).nullable().optional(),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  state: z.record(z.string(), z.unknown()).default({}),
});

function makeToken(): string {
  // 26-char url-safe token from a 32-char alphabet = 130 bits of entropy
  // (>=128-bit), making enumeration of share tokens infeasible. The DB has a
  // unique index that surfaces the (vanishingly small) collision case as a
  // retry.
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint8Array(26);
  crypto.getRandomValues(arr);
  for (const n of arr) out += alphabet[n % alphabet.length];
  return out;
}

export const saveStudioV3Signature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try up to 3 times to avoid the (extremely unlikely) token collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = makeToken();
      const { data: row, error } = await supabaseAdmin
        .from("studio_v3_leads")
        .insert({
          intent: "refine",
          journey_title: data.journeyTitle ?? null,
          skeleton_tour_key: data.skeletonTourKey ?? null,
          contact_name: data.contactName ?? "Anonymous traveller",
          contact_email: data.contactEmail || "anonymous@studio-v3.local",
          contact_phone: null,
          contact_note: null,
          state: data.state as never,
          status: "saved",
          share_token: token,
          saved_at: new Date().toISOString(),
        })
        .select("id, share_token")
        .single();

      if (!error && row) {
        return { id: row.id as string, token: row.share_token as string };
      }

      // 23505 = unique violation. Retry with new token.
      if (error && (error as { code?: string }).code !== "23505") {
        console.error("[studio-v3 save] insert failed", error);
        throw new Error("Could not save your Signature. Please try again.");
      }
    }

    throw new Error("Could not save your Signature. Please try again.");
  });
