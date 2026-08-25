/**
 * Guest-facing itinerary download.
 *
 * Returns the exact same PDF that is attached to the confirmation emails,
 * rebuilt from the frozen booking snapshot for a given Stripe checkout
 * session id (the guest's booking reference).
 *
 * SECURITY: the PDF is available only after a verified Stripe payment has
 * produced a paid booking with a frozen snapshot. Draft booking_snapshots are
 * never used as a public source of truth.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  buildItineraryPdfBase64,
  itineraryPdfFilename,
  type ItineraryPdfInput,
} from "@/lib/booking-itinerary-pdf";
import { normalizeSnapshotItinerary } from "@/lib/booking-snapshot-contract";
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

function bytesFromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const Route = createFileRoute("/api/public/booking-itinerary")({
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

        const input: ItineraryPdfInput = {
          experienceName: str(snapshot.experienceName) ?? str(snapshot.tourTitle),
          customerName: str(snapshot.customerName, 160),
          dateLabel: str(snapshot.dateExact, 32),
          guestsLabel: guests ? `${guests} guests` : null,
          pickup: str(snapshot.pickup),
          durationLabel: str(snapshot.durationLabel, 120),
          bookingRef: sessionId,
          amountFormatted: totalEur ? `EUR ${totalEur}` : null,
          itinerary: normalizeSnapshotItinerary(snapshot.itinerary),
          includedItems: strList(snapshot.includedItems),
          addOnLabels: addOns
            .map((a) => {
              const label = str(a?.label, 160);
              if (!label) return "";
              const price = Number(a?.priceEur);
              return price ? `${label} - EUR ${price} pp` : label;
            })
            .filter(Boolean),
          removedOptions: strList(snapshot.removedOptions),
          customerNotes: strList(snapshot.notes),
        };

        const pdf = bytesFromBase64(buildItineraryPdfBase64(input));
        return new Response(pdf.buffer as ArrayBuffer, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="${itineraryPdfFilename(sessionId)}"`,
            ...privateHeaders,
          },
        });
      },
    },
  },
});
