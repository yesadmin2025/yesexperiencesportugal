/**
 * Public booking-enquiry endpoint.
 *
 * Anonymous (no JWT) — safe because it:
 *   1. Validates every field server-side with Zod
 *   2. Persists to public.booking_requests through the admin client
 *   3. Sends one confirmation email to the guest
 *   4. Notifies every YES team recipient so enquiries reach a real inbox
 *
 * Emails ride the same internal transactional pipeline as the contact form.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";
import { findTour } from "@/data/signatureTours";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  tourId: z.string().trim().max(80).optional().nullable(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  preferences: z.string().trim().max(1000).optional().nullable(),
  source: z.string().trim().max(80).optional(),
  attribution: z.record(z.string(), z.unknown()).nullable().optional(),
  userAgent: z.string().trim().max(500).nullable().optional(),
});

export const Route = createFileRoute("/api/public/booking-request")({
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
        const tour = data.tourId ? findTour(data.tourId) : undefined;
        const tourId = tour ? tour.id : null;
        const preferredDate = data.date && data.date.length === 10 ? data.date : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");

        const submittedAt = new Date().toISOString();
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("booking_requests")
          .insert({
            name: data.name,
            email: data.email,
            tour_id: tourId,
            preferred_date: preferredDate,
            adults: data.adults,
            children: data.children,
            preferences: data.preferences || null,
            source: data.source ?? "book-page",
            attribution: (data.attribution ?? null) as never,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.error("[booking-request] insert failed", { error: insertError });
          return Response.json({ ok: false, error: "persist_failed" }, { status: 500 });
        }

        const leadId = inserted?.id ?? crypto.randomUUID();
        const partyLine =
          `${data.adults} adult${data.adults === 1 ? "" : "s"}` +
          (data.children > 0 ? ` · ${data.children} child${data.children === 1 ? "" : "ren"}` : "");
        const message = [
          `Day requested: ${tour ? tour.title : "Not sure yet — help me choose"}`,
          `Preferred date: ${preferredDate ?? "Flexible"}`,
          `Party: ${partyLine}`,
          data.preferences ? `Notes: ${data.preferences}` : "Notes: —",
        ].join("\n");

        const [firstName, ...restName] = data.name.split(" ");
        const templateData = {
          firstName: firstName || data.name,
          lastName: restName.join(" "),
          email: data.email,
          message,
          source: data.source ?? "book-page",
          locale: null,
          userAgent: data.userAgent ?? null,
          requestType: "private_day",
          travelDate: preferredDate,
          place: tour ? tour.title : null,
          submittedAt,
        };

        try {
          await sendTransactionalInternal({
            templateName: "contact-received",
            recipientEmail: data.email,
            idempotencyKey: `booking-request-guest-${leadId}`,
            templateData,
          });
          await Promise.all(
            TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
              sendTransactionalInternal({
                templateName: "internal-lead",
                recipientEmail: recipient,
                idempotencyKey: `booking-request-team-${leadId}-${recipient}`,
                templateData,
              }),
            ),
          );
        } catch (e) {
          console.error("[booking-request] email dispatch failed (non-fatal)", {
            error: e instanceof Error ? e.message : e,
          });
        }

        return Response.json({ ok: true, id: leadId });
      },
    },
  },
});
