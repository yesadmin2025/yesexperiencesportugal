/**
 * Day-before guest email — runs daily, emails every paid booking whose tour is
 * tomorrow (Lisbon date) with itinerary, pickup time and inclusions from the
 * frozen booking snapshot. Idempotency key per booking prevents duplicates.
 * Caller verified with the internal secret or scheduler credential.
 */
import { createFileRoute } from "@tanstack/react-router";
import { normalizeSnapshotItinerary } from "@/lib/booking-snapshot-contract";

type AnyRec = Record<string, unknown>;
const str = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const strList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean).slice(0, 30)
    : [];

function lisbonTomorrow(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/hooks/tour-day-before")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EMAIL_INTERNAL_SECRET;
        const schedulerKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const auth = request.headers.get("authorization") || "";
        const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const ok = (e?: string) => !!e && provided.length === e.length && provided === e;
        if (!ok(secret) && !ok(schedulerKey)) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
        const tomorrow = lisbonTomorrow();

        const { data: rows, error } = await supabaseAdmin
          .from("bookings")
          .select("id, customer_email, customer_name, stripe_session_id, booking_details, preferred_date, start_time, pickup_location, guests")
          .is("cancelled_at", null)
          .eq("status", "paid")
          .eq("preferred_date", tomorrow)
          .limit(200);
        if (error) {
          console.error("[tour-day-before] query failed", { error });
          return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
        }

        let sent = 0, skipped = 0, failed = 0;
        for (const row of rows ?? []) {
          const email = str(row.customer_email, 320);
          if (!email) { skipped += 1; continue; }
          const snap = (((row.booking_details as AnyRec | null)?.snapshot ?? {}) as AnyRec);
          const guests = Number((snap.composition as AnyRec | undefined)?.guests) || row.guests || null;
          const name = str(snap.customerName, 160) ?? str(row.customer_name, 160);
          const sessionId = str(row.stripe_session_id, 300);
          try {
            await sendTransactionalInternal({
              templateName: "tour-day-before",
              recipientEmail: email,
              idempotencyKey: `tour-day-before-${row.id}-${tomorrow}`,
              templateData: {
                firstName: name ? name.split(" ")[0] : null,
                experienceName: str(snap.experienceName) ?? str(snap.tourTitle),
                dateLabel: str(snap.dateExact, 32) ?? tomorrow,
                startTime: str(snap.startTime, 40) ?? str(row.start_time, 40),
                pickup: str(snap.pickup) ?? str(row.pickup_location),
                durationLabel: str(snap.durationLabel, 120),
                guestsLabel: guests ? `${guests} guest${guests === 1 ? "" : "s"}` : null,
                itinerary: normalizeSnapshotItinerary(snap.itinerary),
                includedItems: strList(snap.includedItems),
                itineraryUrl: sessionId
                  ? `https://yesexperiencesportugal.com/itinerary?session_id=${encodeURIComponent(sessionId)}`
                  : null,
              },
            });
            sent += 1;
          } catch (e) {
            failed += 1;
            console.error("[tour-day-before] send failed", { id: row.id, error: e instanceof Error ? e.message : e });
          }
        }
        // Guest portal: attendance reminder for paid bookings two days out
        // that haven't confirmed yet. Same daily run; idempotent per booking.
        let reminders = 0;
        try {
          const d = new Date(`${tomorrow}T12:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 1);
          const inTwoDays = d.toISOString().slice(0, 10);
          const { data: upcoming } = await supabaseAdmin
            .from("bookings")
            .select("id, customer_email, customer_name, stripe_session_id, booking_details")
            .is("cancelled_at", null)
            .eq("status", "paid")
            .eq("preferred_date", inTwoDays)
            .limit(200);
          const ids = (upcoming ?? []).map((r) => r.id);
          const { data: responses } = ids.length
            ? await supabaseAdmin
                .from("guest_portal_responses")
                .select("booking_id, attendance_confirmed_at")
                .in("booking_id", ids)
            : { data: [] };
          const confirmed = new Set(
            (responses ?? []).filter((r) => r.attendance_confirmed_at).map((r) => r.booking_id),
          );
          for (const row of upcoming ?? []) {
            const email = str(row.customer_email, 320);
            const sessionId = str(row.stripe_session_id, 300);
            if (!email || !sessionId || confirmed.has(row.id)) continue;
            const snap = (((row.booking_details as AnyRec | null)?.snapshot ?? {}) as AnyRec);
            const name = str(snap.customerName, 160) ?? str(row.customer_name, 160);
            try {
              await sendTransactionalInternal({
                templateName: "attendance-reminder",
                recipientEmail: email,
                idempotencyKey: `attendance-reminder-${row.id}`,
                templateData: {
                  firstName: name ? name.split(" ")[0] : null,
                  experienceName: str(snap.experienceName) ?? str(snap.tourTitle),
                  dateLabel: str(snap.dateExact, 32) ?? inTwoDays,
                  portalUrl: `https://yesexperiencesportugal.com/itinerary?session_id=${encodeURIComponent(sessionId)}`,
                },
              });
              reminders += 1;
            } catch (e) {
              console.error("[attendance-reminder] send failed", { id: row.id, error: e instanceof Error ? e.message : e });
            }
          }
        } catch (e) {
          console.error("[attendance-reminder] run failed", e);
        }
        return Response.json({ ok: true, date: tomorrow, considered: rows?.length ?? 0, sent, skipped, failed, reminders });
      },
    },
  },
});
