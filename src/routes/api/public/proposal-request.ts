/**
 * Public proposals / celebrations / private-group request endpoint.
 *
 * Anonymous (no JWT) — safe because it:
 *   1. Validates every field server-side with Zod
 *   2. Persists to public.booking_requests through the admin client,
 *      tagged `source: "homepage-proposals"` so the enquiries inbox can
 *      filter these apart from ordinary day bookings
 *   3. Confirms to the sender and notifies every YES team recipient
 *
 * Emails ride the same internal transactional pipeline as the booking
 * enquiry form — one recipient per send, no lists.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";

export const OCCASIONS = [
  "proposal",
  "celebration",
  "corporate",
  "private_group",
] as const;

const OCCASION_LABEL: Record<(typeof OCCASIONS)[number], string> = {
  proposal: "Marriage proposal",
  celebration: "Celebration (anniversary, birthday, honeymoon)",
  corporate: "Corporate day or off-site",
  private_group: "Private group",
};

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  email: z.string().trim().toLowerCase().email("Please use a valid email").max(254),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(120).optional().nullable(),
  occasion: z.enum(OCCASIONS),
  dates: z.string().trim().max(120).optional().nullable(),
  preferredDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  groupSize: z.number().int().min(1).max(200),
  message: z.string().trim().min(10, "Tell us a little about the plan").max(1500),
  userAgent: z.string().trim().max(500).nullable().optional(),
});

export const Route = createFileRoute("/api/public/proposal-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
        }

        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            {
              ok: false,
              error: "validation_failed",
              issues: parsed.error.issues.map((i) => i.message),
            },
            { status: 400 },
          );
        }
        const data = parsed.data;
        const preferredDate =
          data.preferredDate && data.preferredDate.length === 10 ? data.preferredDate : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");

        const submittedAt = new Date().toISOString();
        const detailLines = [
          `Occasion: ${OCCASION_LABEL[data.occasion]}`,
          `Party size: ${data.groupSize}`,
          `Dates: ${preferredDate ?? data.dates ?? "Flexible"}`,
          data.company ? `Company: ${data.company}` : null,
          data.phone ? `Phone: ${data.phone}` : null,
          `Brief: ${data.message}`,
        ]
          .filter(Boolean)
          .join("\n");

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("booking_requests")
          .insert({
            name: data.name,
            email: data.email,
            tour_id: null,
            preferred_date: preferredDate,
            adults: Math.min(data.groupSize, 20),
            children: 0,
            preferences: detailLines,
            source: `homepage-proposals:${data.occasion}`,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.error("[proposal-request] insert failed", { error: insertError });
          return Response.json({ ok: false, error: "persist_failed" }, { status: 500 });
        }

        const leadId = inserted?.id ?? crypto.randomUUID();
        const [firstName, ...restName] = data.name.split(" ");
        const templateData = {
          firstName: firstName || data.name,
          lastName: restName.join(" "),
          email: data.email,
          message: detailLines,
          source: `homepage-proposals:${data.occasion}`,
          locale: null,
          userAgent: data.userAgent ?? null,
          requestType: data.occasion,
          travelDate: preferredDate,
          place: null,
          submittedAt,
        };

        try {
          await sendTransactionalInternal({
            templateName: "contact-received",
            recipientEmail: data.email,
            idempotencyKey: `proposal-request-guest-${leadId}`,
            templateData,
          });
          await Promise.all(
            TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
              sendTransactionalInternal({
                templateName: "internal-lead",
                recipientEmail: recipient,
                idempotencyKey: `proposal-request-team-${leadId}-${recipient}`,
                templateData,
              }),
            ),
          );
        } catch (e) {
          console.error("[proposal-request] email dispatch failed (non-fatal)", {
            error: e instanceof Error ? e.message : e,
          });
        }

        return Response.json({ ok: true, id: leadId });
      },
    },
  },
});
