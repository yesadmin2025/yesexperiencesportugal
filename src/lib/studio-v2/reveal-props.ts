import { z } from "zod";
import type { RefineStop } from "@/components/studio-v2/RefineStage";

/**
 * Runtime validation for the props that feed the Studio v2 "Reveal" surface
 * (DraftMapPreview · LivingItinerary · FinalBookingPanel).
 *
 * The Reveal trusts that `stops` are real, geocoded RefineStop rows and that
 * `pax` / `pickup` are normalised before render. A bad shape here causes
 * silent NaN coordinates on the map, broken WhatsApp drafts and crashes in
 * the booking panel. This module is the single guard for that contract.
 *
 * Use `validateRevealProps()` once, gate the Reveal section on `ok`, and let
 * `issues` surface in the console during dev so regressions are visible.
 */

const FINITE_NUMBER = z.number().refine((n) => Number.isFinite(n), {
  message: "must be a finite number",
});

export const RefineStopSchema = z.object({
  key: z.string().trim().min(1).max(120),
  region_key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(200),
  blurb: z.string().max(2000).nullable(),
  tag: z.string().max(120).nullable(),
  lat: FINITE_NUMBER.min(-90).max(90),
  lng: FINITE_NUMBER.min(-180).max(180),
  duration_minutes: z.number().int().min(0).max(24 * 60),
  source_tour_keys: z.array(z.string().min(1).max(120)).max(50),
});

export const RevealPropsSchema = z.object({
  // Reveal needs at least 2 stops to draw a route; cap at 12 to stop runaway
  // edits from breaking the map projection.
  stops: z.array(RefineStopSchema).min(2).max(12),
  pax: z.number().int().min(1).max(40),
  pickup: z
    .string()
    .trim()
    .min(1, "pickup is required")
    .max(200, "pickup must be ≤ 200 chars"),
});

export type RevealProps = z.infer<typeof RevealPropsSchema>;

export type RevealValidation =
  | { ok: true; data: RevealProps }
  | { ok: false; issues: string[] };

/**
 * Validate the Reveal props at runtime. In dev, logs a structured warning so
 * the offending caller is visible in the console. In prod, fails closed so
 * the consumer can render a safe fallback instead of crashing.
 */
export function validateRevealProps(input: {
  stops: RefineStop[] | null | undefined;
  pax: number | null | undefined;
  pickup: string | null | undefined;
}): RevealValidation {
  const parsed = RevealPropsSchema.safeParse({
    stops: input.stops ?? [],
    pax: input.pax ?? 0,
    pickup: input.pickup ?? "",
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  const issues = parsed.error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
  );

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[studio-v2] Reveal props failed validation", { issues, input });
  }

  return { ok: false, issues };
}
