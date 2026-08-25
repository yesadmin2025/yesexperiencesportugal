/**
 * Guest-facing itinerary data (JSON).
 *
 * Serves exactly the same fields the itinerary PDF is built from, so the
 * online itinerary page at /itinerary mirrors the emailed PDF one-for-one.
 *
 * This IS guest-facing booking data — it may include the guest's own name,
 * pickup point and notes. It is protected by two layers: the opaque,
 * unguessable Stripe checkout session id used as the booking reference, and
 * paid-and-frozen authorization (see public-booking-access.server). Nothing
 * is served before payment is confirmed.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  normalizeSnapshotItinerary,
  ITINERARY_FLEXIBILITY_NOTE,
  CONFIRMATION_SUFFICIENCY_NOTE,
} from "@/lib/booking-snapshot-contract";

type AnyRec = Record<string, unknown>;

const str = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const strList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0)
        .slice(0, 20)
    : [];

export const Route = createFileRoute("/api/public/booking-itinerary-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = (url.searchParams.get("session_id") || "").trim();
        const access = await import("@/lib/public-booking-access.server");
        if (!access.isValidBookingReference(sessionId)) {
          return Response.json({ ok: false, error: "invalid_reference" }, { status: 400 });
        }

        const result = await access.loadPublicBookingAccess(sessionId);
        if (result.kind !== "granted") {
          return access.publicBookingDenialResponse(result);
        }
        const snapshot = result.snapshot as AnyRec;

        const composition = (snapshot.composition ?? {}) as AnyRec;
        const pricing = (snapshot.pricing ?? {}) as AnyRec;
        const addOns = Array.isArray(snapshot.addOns) ? (snapshot.addOns as AnyRec[]) : [];
        const guests = Number(composition.guests) || null;
        const totalEur = Number(pricing.totalEur) || null;


        return Response.json(
          {
            ok: true,
            reference: sessionId,
            // Lets the itinerary map request the real Signature driving
            // route instead of a straight dashed connector.

            tourId: str(snapshot.tourId, 80),
            experienceName: str(snapshot.experienceName) ?? str(snapshot.tourTitle),
            customerName: str(snapshot.customerName, 160),
            dateLabel: str(snapshot.dateExact, 32),
            guestsLabel: guests ? `${guests} guests` : null,
            pickup: str(snapshot.pickup),
            durationLabel: str(snapshot.durationLabel, 120),
            amountFormatted: totalEur ? `EUR ${totalEur}` : null,
            itinerary: normalizeSnapshotItinerary(snapshot.itinerary),
            includedItems: strList(snapshot.includedItems),
            addOnLabels: addOns
              .map((a) => {
                const label = str(a?.label, 160);
                if (!label) return "";
                const price = Number(a?.priceEur);
                return price ? `${label} — EUR ${price} pp` : label;
              })
              .filter(Boolean),
            removedOptions: strList(snapshot.removedOptions),
            customerNotes: strList(snapshot.notes),
            flexibilityNote: ITINERARY_FLEXIBILITY_NOTE,
            sufficiencyNote: CONFIRMATION_SUFFICIENCY_NOTE,
          },
          {
            headers: {
              "cache-control": "private, max-age=0, no-store",
              "x-robots-tag": "noindex, nofollow",
            },
          },
        );
      },
    },
  },
});
