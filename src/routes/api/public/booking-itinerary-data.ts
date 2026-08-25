/**
 * Guest-facing itinerary data (JSON).
 *
 * Serves exactly the same fields the itinerary PDF is built from, so the
 * online itinerary page at /itinerary mirrors the emailed PDF one-for-one.
 * Keyed by the guest's own Stripe checkout session id (long, unguessable).
 *
 * SECURITY: data is served only from the frozen snapshot copied into a paid
 * booking by the verified Stripe webhook. The response intentionally omits
 * email/phone/address, but it can include the guest's own name, pickup and
 * notes after the paid + frozen guard succeeds.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  normalizeSnapshotItinerary,
  ITINERARY_FLEXIBILITY_NOTE,
  CONFIRMATION_SUFFICIENCY_NOTE,
} from "@/lib/booking-snapshot-contract";
import { resolvePaidFrozenBookingSnapshot } from "@/lib/paid-booking-snapshot.server";

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

const privateHeaders = {
  "cache-control": "private, max-age=0, no-store",
  "x-robots-tag": "noindex, nofollow",
};

export const Route = createFileRoute("/api/public/booking-itinerary-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = (url.searchParams.get("session_id") || "").trim();
        if (!/^cs_[A-Za-z0-9_]{20,255}$/.test(sessionId)) {
          return Response.json(
            { ok: false, error: "invalid_reference" },
            { status: 400, headers: privateHeaders },
          );
        }

        let snapshot: AnyRec | null = null;
        try {
          snapshot = await resolvePaidFrozenBookingSnapshot(sessionId);
        } catch {
          return Response.json(
            { ok: false, error: "temporarily_unavailable" },
            { status: 503, headers: privateHeaders },
          );
        }

        if (!snapshot) {
          return Response.json(
            { ok: false, error: "not_ready" },
            { status: 404, headers: privateHeaders },
          );
        }

        const composition = (snapshot.composition ?? {}) as AnyRec;
        const pricing = (snapshot.pricing ?? {}) as AnyRec;
        const addOns = Array.isArray(snapshot.addOns) ? (snapshot.addOns as AnyRec[]) : [];
        const guests = Number(composition.guests) || null;
        const totalEur = Number(pricing.totalEur) || null;

        return Response.json(
          {
            ok: true,
            reference: sessionId,
            // Non-contact data: lets the itinerary map request the real
            // Signature driving route instead of a straight dashed connector.
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
          { headers: privateHeaders },
        );
      },
    },
  },
});
