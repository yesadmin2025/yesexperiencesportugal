import { createFileRoute } from "@tanstack/react-router";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";
import { buildItineraryPdfBase64, itineraryPdfFilename } from "@/lib/booking-itinerary-pdf";

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
          return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
        }

        const strList = (v: unknown) =>
          Array.isArray(v)
            ? (v as unknown[])
                .map((s) => String(s ?? "").trim())
                .filter((s) => s.length > 0)
                .slice(0, 20)
            : [];

        const normalizeItinerary = (v: unknown) =>
          Array.isArray(v)
            ? (v as Array<Record<string, unknown>>)
                .filter((s) => s && typeof s.label === "string" && s.label.trim())
                .slice(0, 20)
                .map((s, i) => ({
                  order: Number(s.order) || i + 1,
                  label: String(s.label).trim().slice(0, 160),
                  durationMinutes: Number(s.durationMinutes) || null,
                  note: typeof s.note === "string" && s.note.trim() ? s.note.trim().slice(0, 240) : null,
                }))
            : [];

        const templateData = {
          customerName: body.customerName ?? null,
          tourTitle: body.tourTitle ?? null,
          bookingType: body.bookingType ?? null,
          dateExact: body.dateExact ?? null,
          guests: typeof body.guests === "number" ? body.guests : Number(body.guests) || null,
          adults:
            typeof body.adults === "number"
              ? body.adults
              : body.adults != null
                ? Number(body.adults) || null
                : null,
          minorAges: Array.isArray(body.minorAges)
            ? (body.minorAges as unknown[])
                .map((n) => Number(n))
                .filter((n) => Number.isInteger(n) && n >= 0 && n <= 17)
            : null,
          perPaxAdultEur:
            typeof body.perPaxAdultEur === "number"
              ? body.perPaxAdultEur
              : body.perPaxAdultEur != null
                ? Number(body.perPaxAdultEur) || null
                : null,
          amountFormatted: body.amountFormatted ?? null,
          bookingRef: body.bookingRef ?? sessionId,

          receiptUrl: body.receiptUrl ?? null,
          bookingStatusUrl: body.bookingStatusUrl ?? null,
          pickup: body.pickup ?? null,
          startTime: body.startTime ?? null,
          durationLabel: body.durationLabel ?? null,
          itinerary: normalizeItinerary(body.itinerary),
          includedItems: strList(body.includedItems),
          addOnLabels: strList(body.addOnLabels),
          removedOptions: strList(body.removedOptions),
          customerNotes: strList(body.customerNotes),
          itineraryUrl: `https://yesexperiencesportugal.com/itinerary?session_id=${encodeURIComponent(
            String(body.bookingRef ?? sessionId),
          )}`,
        };

        // Downloadable itinerary attached to BOTH confirmation emails.
        let attachments: Array<{ filename: string; content: string; contentType?: string }> = [];
        try {
          if (templateData.itinerary.length > 0) {
            attachments = [
              {
                filename: itineraryPdfFilename(String(templateData.bookingRef ?? "")),
                contentType: "application/pdf",
                content: buildItineraryPdfBase64({
                  experienceName:
                    (body.experienceName as string | null) ??
                    (templateData.tourTitle as string | null),
                  customerName: templateData.customerName as string | null,
                  dateLabel: templateData.dateExact as string | null,
                  guestsLabel: templateData.guests ? `${templateData.guests} guests` : null,
                  pickup: templateData.pickup as string | null,
                  durationLabel: templateData.durationLabel as string | null,
                  bookingRef: templateData.bookingRef as string | null,
                  amountFormatted: templateData.amountFormatted as string | null,
                  itinerary: templateData.itinerary,
                  includedItems: templateData.includedItems,
                  addOnLabels: templateData.addOnLabels,
                  removedOptions: templateData.removedOptions,
                  customerNotes: templateData.customerNotes,
                }),
              },
            ];
          }
        } catch (e) {
          console.error("[checkout-email] itinerary pdf failed", {
            error: e instanceof Error ? e.message : e,
          });
        }

        const result = await sendTransactionalInternal({
          templateName: "checkout-receipt",
          attachments,
          recipientEmail,
          idempotencyKey: `checkout-receipt-${sessionId}`,
          templateData,
        });

        // First-time welcome to the customer, deduped by email via idempotency key.
        try {
          await sendTransactionalInternal({
            templateName: "welcome",
            recipientEmail,
            idempotencyKey: `welcome-${recipientEmail.toLowerCase()}`,
            templateData: { contactName: templateData.customerName ?? null },
          });
        } catch (e) {
          console.error("[checkout-email] welcome send failed", {
            error: e instanceof Error ? e.message : e,
          });
        }

        // Notify the YES team on every completed booking. Non-fatal — the
        // client receipt is the priority; internal alerts must never block it.
        try {
          await Promise.all(
            TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
              sendTransactionalInternal({
                templateName: "internal-booking",
                recipientEmail: recipient,
                idempotencyKey: `internal-booking-${sessionId}-${recipient}`,
                attachments,
                templateData: {
                  ...templateData,
                  customerEmail: recipientEmail,
                  bookingId: body.bookingId ?? null,
                  adminUrl: body.adminUrl ?? null,
                  experienceName: body.experienceName ?? templateData.tourTitle ?? null,
                  customerPhone: body.customerPhone ?? null,
                  language: body.language ?? null,
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
