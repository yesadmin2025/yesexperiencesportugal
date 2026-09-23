/**
 * Bókun webhook receiver — the secondary ingestion path.
 *
 * Disabled until BOKUN_WEBHOOK_SECRET exists: without it the endpoint reports
 * a setup state and accepts nothing. When configured, the HMAC signature is
 * verified against the raw body before the payload is read, then the booking
 * flows through the same normalise + dedupe pipeline as email ingestion, so a
 * webhook and a Bókun email for the same reservation can never double-book.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/bokun-booking")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { bokunWebhookConfigured, verifyBokunSignature, mapBokunPayload } = await import(
          "@/lib/integrations/bokun.server"
        );
        if (!bokunWebhookConfigured()) {
          return Response.json({ ok: false, error: "bokun_not_configured" }, { status: 503 });
        }

        const rawBody = await request.text();
        const signature =
          request.headers.get("x-bokun-signature") ??
          request.headers.get("x-signature") ??
          null;
        if (!verifyBokunSignature(rawBody, signature)) {
          return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
        }

        const booking = mapBokunPayload(payload);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ingestParsedBooking } = await import("@/lib/ingestion/booking-ingest.server");

        const outcome = await ingestParsedBooking(supabaseAdmin, booking, {
          source: "BOKUN",
          subject: `Bókun webhook ${booking.intent}`,
          rawPayload: payload,
        });

        return Response.json({ ok: true, action: outcome.action });
      },
    },
  },
});
