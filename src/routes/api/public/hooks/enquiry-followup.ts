/**
 * Enquiry follow-up hook — sends the review request once per enquiry.
 *
 * Picks up proposals / celebrations / corporate / private-group requests that
 * are older than `afterDays` (default 7) and have never been followed up, then
 * sends the `review-request` template through the same internal transactional
 * pipeline as every other guest email. `followup_sent_at` is stamped on the row
 * so a repeat call — scheduler retry or manual replay — never emails twice.
 *
 * Public path, so the caller is verified inside the handler with the shared
 * internal secret (or the scheduler credential), exactly like the email-flush
 * hook. No guest data is ever returned in the response.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const OCCASION_LABEL: Record<string, string> = {
  proposal: "a marriage proposal",
  celebration: "a celebration",
  corporate: "a corporate day",
  private_group: "a private group day",
};

const bodySchema = z
  .object({
    afterDays: z.number().int().min(0).max(365).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .partial();

export const Route = createFileRoute("/api/public/hooks/enquiry-followup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EMAIL_INTERNAL_SECRET;
        const schedulerKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!secret && !schedulerKey) {
          return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
        }
        const auth = request.headers.get("authorization") || "";
        const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const matches = (expected?: string) =>
          !!expected && provided.length === expected.length && provided === expected;
        if (!matches(secret) && !matches(schedulerKey)) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        let parsedBody: z.infer<typeof bodySchema> = {};
        try {
          parsedBody = bodySchema.parse((await request.json()) ?? {});
        } catch {
          parsedBody = {};
        }
        const afterDays = parsedBody.afterDays ?? 7;
        const limit = parsedBody.limit ?? 25;
        const cutoff = new Date(Date.now() - afterDays * 86_400_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");

        const { data: rows, error } = await supabaseAdmin
          .from("booking_requests")
          .select("id, name, email, source, created_at")
          .is("followup_sent_at", null)
          .like("source", "homepage-proposals%")
          .lte("created_at", cutoff)
          .order("created_at", { ascending: true })
          .limit(limit);

        if (error) {
          console.error("[enquiry-followup] query failed", { error });
          return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
        }

        let sent = 0;
        let failed = 0;
        for (const row of rows ?? []) {
          const occasion = (row.source ?? "").split(":")[1] ?? "";
          const [firstName] = (row.name ?? "").split(" ");
          try {
            await sendTransactionalInternal({
              templateName: "review-request",
              recipientEmail: row.email,
              idempotencyKey: `enquiry-followup-${row.id}`,
              templateData: {
                firstName: firstName || null,
                occasionLabel: OCCASION_LABEL[occasion] ?? null,
                reviewUrl: "https://yesexperiencesportugal.com/reviews#leave-a-review",
              },
            });
            await supabaseAdmin
              .from("booking_requests")
              .update({ followup_sent_at: new Date().toISOString() })
              .eq("id", row.id);
            sent += 1;
          } catch (e) {
            failed += 1;
            console.error("[enquiry-followup] send failed", {
              id: row.id,
              error: e instanceof Error ? e.message : e,
            });
          }
        }

        return Response.json({ ok: true, considered: rows?.length ?? 0, sent, failed });
      },
    },
  },
});
