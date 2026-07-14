/**
 * Studio V3 — lead capture.
 *
 * Persists the full Studio V3 state + contact details when a user submits
 * the LeadCaptureSheet from the final Journey Card. No payments, no
 * pricing, no notifications. The YES team reads new rows via service role.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadSchema = z.object({
  intent: z.enum(["book", "refine"]),
  journeyTitle: z.string().trim().max(200).nullable().optional(),
  skeletonTourKey: z.string().trim().max(120).nullable().optional(),
  contactName: z.string().trim().min(1, "Name is required").max(120),
  contactEmail: z.string().trim().email("Please enter a valid email").max(255),
  contactPhone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  contactNote: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  // Full Studio V3 state snapshot as plain JSON.
  state: z.record(z.string(), z.unknown()).default({}),
});

export const createStudioV3Lead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("studio_v3_leads")
      .insert({
        intent: data.intent,
        journey_title: data.journeyTitle ?? null,
        skeleton_tour_key: data.skeletonTourKey ?? null,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone ?? null,
        contact_note: data.contactNote ?? null,
        state: data.state as never,
        status: "requested",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[studio-v3 lead] insert failed", error);
      throw new Error("Could not save your request. Please try again.");
    }

    // Fire-and-forget team notification — never block the lead on email.
    try {
      const [{ sendTransactionalInternal }, { TEAM_NOTIFICATION_RECIPIENTS }] = await Promise.all([
        import("@/lib/email/send-internal.server"),
        import("@/lib/email/team-recipients"),
      ]);
      const [firstName, ...rest] = (data.contactName ?? "").trim().split(/\s+/);
      const lastName = rest.join(" ");
      const messageParts = [
        data.intent === "book" ? "Intent: BOOK this journey" : "Intent: refine / talk to concierge",
        data.journeyTitle ? `Journey: ${data.journeyTitle}` : null,
        data.skeletonTourKey ? `Base tour: ${data.skeletonTourKey}` : null,
        data.contactNote ? `\nNote from guest:\n${data.contactNote}` : null,
      ].filter(Boolean);
      const templateData = {
        firstName: firstName || data.contactName,
        lastName,
        email: data.contactEmail,
        message: messageParts.join("\n"),
        source: "studio-v3",
        submittedAt: new Date().toISOString(),
      };
      await Promise.all(
        TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
          sendTransactionalInternal({
            templateName: "internal-lead",
            recipientEmail: recipient,
            idempotencyKey: `studio-v3-lead-${row.id}-${recipient}`,
            templateData,
          }),
        ),
      );
    } catch (e) {
      console.error("[studio-v3 lead] notification dispatch failed (non-fatal)", e);
    }

    return { id: row.id as string };
  });
