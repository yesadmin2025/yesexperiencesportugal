/**
 * Guest portal — attendance confirmation + pickup / guest-name updates.
 *
 * Same access contract as the Travel File: the opaque Stripe session id is the
 * private link, and only PAID bookings with a frozen snapshot are served.
 * Guest edits live in guest_portal_responses; the booking row and its frozen
 * snapshot are never modified, so prices and booking logic stay untouched.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const headers = {
  "cache-control": "private, max-age=0, no-store",
  "x-robots-tag": "noindex, nofollow",
};

const saveSchema = z.object({
  session_id: z.string(),
  attending: z.literal(true),
  pickup: z.string().trim().max(200).optional().default(""),
  guestNames: z.array(z.string().trim().max(120)).max(20).default([]),
  note: z.string().trim().max(1000).optional().default(""),
});

async function resolve(sessionId: string) {
  const access = await import("@/lib/public-booking-access.server");
  if (!access.isValidBookingReference(sessionId)) {
    return { error: Response.json({ ok: false, error: "invalid_reference" }, { status: 400, headers }) };
  }
  const result = await access.loadPublicBookingAccess(sessionId);
  if (result.kind !== "granted") return { error: access.publicBookingDenialResponse(result) };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (!row) return { error: Response.json({ ok: false, error: "not_found" }, { status: 404, headers }) };
  return { bookingId: row.id as string, supabaseAdmin };
}

function shape(r: Record<string, unknown> | null) {
  return {
    confirmedAt: (r?.attendance_confirmed_at as string | null) ?? null,
    pickup: (r?.pickup_update as string | null) ?? "",
    guestNames: (r?.guest_names as string[] | null) ?? [],
    note: (r?.guest_note as string | null) ?? "",
  };
}

export const Route = createFileRoute("/api/public/guest-portal")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const sessionId = (new URL(request.url).searchParams.get("session_id") || "").trim();
        const r = await resolve(sessionId);
        if ("error" in r) return r.error;
        const { data } = await r.supabaseAdmin
          .from("guest_portal_responses")
          .select("attendance_confirmed_at, pickup_update, guest_names, guest_note")
          .eq("booking_id", r.bookingId)
          .maybeSingle();
        return Response.json({ ok: true, ...shape(data) }, { headers });
      },
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = saveSchema.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "invalid_input" }, { status: 400, headers });
        }
        const r = await resolve(parsed.session_id.trim());
        if ("error" in r) return r.error;
        const now = new Date().toISOString();
        const { data: existing } = await r.supabaseAdmin
          .from("guest_portal_responses")
          .select("attendance_confirmed_at")
          .eq("booking_id", r.bookingId)
          .maybeSingle();
        const { data, error } = await r.supabaseAdmin
          .from("guest_portal_responses")
          .upsert(
            {
              booking_id: r.bookingId,
              attendance_confirmed_at: existing?.attendance_confirmed_at ?? now,
              pickup_update: parsed.pickup || null,
              guest_names: parsed.guestNames.filter(Boolean),
              guest_note: parsed.note || null,
              updated_at: now,
            },
            { onConflict: "booking_id" },
          )
          .select("attendance_confirmed_at, pickup_update, guest_names, guest_note")
          .single();
        if (error) {
          console.error("[guest-portal] save failed", error);
          return Response.json({ ok: false, error: "save_failed" }, { status: 500, headers });
        }
        return Response.json({ ok: true, ...shape(data) }, { headers });
      },
    },
  },
});
