import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Records each Studio proposal reveal for the owner's admin panel.
 * Public (guests use Studio); title/duration come from verified tour data
 * server-side, never from the client. Duplicate visit keys are ignored.
 */
export const logStudioProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        visitKey: z.string().regex(/^[a-z0-9-]{16,64}$/),
        tourId: z.string().max(64).nullable(),
        perPaxEur: z.number().int().min(1).max(100000).nullable(),
        guests: z.number().int().min(1).max(200).nullable(),
        dateLabel: z.string().max(60).nullable(),
        pickup: z.string().max(120).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { findTour } = await import("@/data/signatureTours");
    const tour = data.tourId ? findTour(data.tourId) : null;
    if (!tour) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("studio_proposals").upsert(
      {
        visit_key: data.visitKey,
        tour_id: data.tourId,
        title: tour.title,
        duration: tour.durationHours ?? null,
        per_pax_eur: data.perPaxEur,
        guests: data.guests,
        date_label: data.dateLabel,
        pickup: data.pickup,
      },
      { onConflict: "visit_key", ignoreDuplicates: true },
    );
    return { ok: true as const };
  });
