import { createFileRoute } from "@tanstack/react-router";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";

/**
 * Internal endpoint invoked by the Supabase Stripe webhook (Deno) after a
 * successful checkout. Authenticated with a shared bearer secret since the
 * webhook has no end-user JWT.
 *
 * Idempotency is enforced via `idempotency_key = checkout-receipt-<session_id>`
 * — the shared queue dispatcher will not send twice for the same key.
 */
export const Route = createFileRoute("/api/public/hooks/checkout-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EMAIL_INTERNAL_SECRET;
        if (!secret) {
          return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
        }
        const auth = request.headers.get("authorization") || "";
        const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        // Timing-safe-ish compare
        if (provided.length !== secret.length || provided !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
        }

        const recipientEmail = String(body.recipientEmail || "").trim();
        const sessionId = String(body.sessionId || "").trim();
        if (!recipientEmail || !sessionId) {
          return Response.json(
            { ok: false, error: "missing_fields" },
            { status: 400 },
          );
        }

        const templateData = {
          customerName: body.customerName ?? null,
          tourTitle: body.tourTitle ?? null,
          bookingType: body.bookingType ?? null,
          dateExact: body.dateExact ?? null,
          guests: typeof body.guests === "number" ? body.guests : Number(body.guests) || null,
          amountFormatted: body.amountFormatted ?? null,
          bookingRef: body.bookingRef ?? sessionId,
          bokunConfirmation: body.bokunConfirmation ?? null,
          receiptUrl: body.receiptUrl ?? null,
          bookingStatusUrl: body.bookingStatusUrl ?? null,
          pickup: body.pickup ?? null,
        };

        const result = await sendTransactionalInternal({
          templateName: "checkout-receipt",
          recipientEmail,
          idempotencyKey: `checkout-receipt-${sessionId}`,
          templateData,
        });

        // Notify the YES team on every completed booking. Non-fatal — the
        // client receipt is the priority; internal alerts must never block it.
        try {
          await Promise.all(
            TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
              sendTransactionalInternal({
                templateName: "internal-booking",
                recipientEmail: recipient,
                idempotencyKey: `internal-booking-${sessionId}-${recipient}`,
                templateData: {
                  ...templateData,
                  customerEmail: recipientEmail,
                },
              }),
            ),
          );
        } catch (e) {
          console.error("[checkout-email] team notification failed", {
            error: e instanceof Error ? e.message : e,
          });
        }

        return Response.json(result, { status: result.ok ? 200 : 202 });
      },
    },
  },
});
