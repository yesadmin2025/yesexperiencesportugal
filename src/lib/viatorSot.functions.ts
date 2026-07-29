import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractSignatureSot, formatSotEntry, type SotExtraction } from "@/lib/viatorSot.server";
import { canonicalViatorUrl } from "@/data/signatureToursSourceOfTruth";

/**
 * Admin-only: extract the Source of Truth for a single Signature tour.
 * Returns both the raw extraction and a ready-to-paste TS block for
 * `SIGNATURE_SOURCE_OF_TRUTH` in signatureToursSourceOfTruth.ts.
 * Does NOT write anything — human review is required.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: { from: (t: string) => any }, userId: string): Promise<void> {
  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!roleRow) throw new Error("Forbidden: admin role required");
}

function parseProductCode(url: string): string {
  const m = url.match(/d\d+P(\d+)/i);
  return m ? `P${m[1]}` : "";
}

export const extractSignatureSotFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      tourId: z.string().min(1).max(64),
      /** Optional — defaults to the canonical URL registered for this tour. */
      viatorUrl: z
        .string()
        .url()
        .refine((u) => /^https?:\/\/(www\.)?viator\.com\//i.test(u), {
          message: "Must be a viator.com URL",
        })
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const url = data.viatorUrl ?? canonicalViatorUrl(data.tourId);
    if (!url) {
      throw new Error(`No canonical Viator URL registered for tourId="${data.tourId}"`);
    }
    const productCode = parseProductCode(url);
    const extraction: SotExtraction = await extractSignatureSot(url);
    const tsSnippet = formatSotEntry(data.tourId, url, productCode, extraction);
    return {
      tourId: data.tourId,
      viatorUrl: url,
      productCode,
      extraction,
      tsSnippet,
    };
  });
