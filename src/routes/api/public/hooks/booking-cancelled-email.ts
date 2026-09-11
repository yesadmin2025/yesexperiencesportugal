import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";

const payloadSchema = z.object({
  bookingId: z.string().uuid(),
  recipientEmail: z.string().email(),
  customerName: z.string().nullable().optional(),
  experienceName: z.string().nullable().optional(),
  dateExact: z.string().nullable().optional(),
  amountFormatted: z.string().nullable().optional(),
  bookingRef: z.string().min(8).max(255),
  refundStatus: z.string().max(80).optional(),
});

export const Route = createFileRoute("/api/public/hooks/booking-cancelled-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['EMAIL_INTERNAL_SECRET'];
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!secret || provided.length !== secret.length || provided !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
        }
        const { bookingId, recipientEmail, ...templateData } = parsed.data;
        const guest = await sendTransactionalInternal({
          templateName: "booking-cancelled",
          recipientEmail,
          idempotencyKey: `booking-cancelled-${bookingId}`,
          templateData,
        });
        await Promise.all(
          TEAM_NOTIFICATION_RECIPIENTS.map((teamEmail) =>
            sendTransactionalInternal({
              templateName: "booking-cancelled",
              recipientEmail: teamEmail,
              idempotencyKey: `booking-cancelled-team-${bookingId}-${teamEmail}`,
              templateData,
            }),
          ),
        );
        return Response.json(guest, { status: guest.ok ? 200 : 202 });
      },
    },
  },
});