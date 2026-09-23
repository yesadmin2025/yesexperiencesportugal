/**
 * Scheduled Gmail booking scan.
 *
 * Reads Bókun notifications from the inbox and YES vouchers from the sent
 * mailbox, then runs them through the shared normalise + dedupe pipeline.
 * Public path, so the caller is verified inside the handler with the internal
 * secret (or the scheduler credential). Nothing about a guest is returned —
 * only counts — and Gmail access happens exclusively server-side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({
    days: z.number().int().min(1).max(365).optional(),
    maxMessages: z.number().int().min(1).max(200).optional(),
    dryRun: z.boolean().optional(),
    futureOnly: z.boolean().optional(),
  })
  .partial();

export const Route = createFileRoute("/api/public/hooks/gmail-booking-scan")({
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

        let body: z.infer<typeof bodySchema> = {};
        try {
          body = bodySchema.parse((await request.json()) ?? {});
        } catch {
          body = {};
        }

        const { gmailConfigured, buildQueries, listMessageIds, getMessage } = await import(
          "@/lib/ingestion/gmail.server"
        );
        if (!gmailConfigured()) {
          return Response.json({ ok: false, error: "gmail_not_connected" }, { status: 503 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ingestEmailMessage } = await import("@/lib/ingestion/booking-ingest.server");

        const days = body.days ?? 7;
        const maxMessages = body.maxMessages ?? 40;
        const trigger = (request.headers.get("lovable-context") || "manual").slice(0, 32);
        const summary: Record<string, number> = {};
        let scanned = 0;

        const { data: existing } = await supabaseAdmin
          .from("integration_state")
          .select("detail")
          .eq("id", "gmail_bookings")
          .maybeSingle();
        const previous = (existing?.detail ?? {}) as Record<string, unknown>;

        try {
          for (const { query, mailbox } of buildQueries(days)) {
            const ids = await listMessageIds(query, Math.ceil(maxMessages / 2));
            for (const { id } of ids) {
              const message = await getMessage(id, mailbox);
              scanned += 1;
              const outcomes = await ingestEmailMessage(
                supabaseAdmin,
                {
                  gmailMessageId: message.id,
                  gmailThreadId: message.threadId,
                  subject: message.subject,
                  from: message.from,
                  body: message.body,
                  receivedAt: message.receivedAt,
                  mailbox: message.mailbox,
                },
                { dryRun: body.dryRun === true, futureOnly: body.futureOnly !== false },
              );
              for (const outcome of outcomes) {
                summary[outcome.action] = (summary[outcome.action] ?? 0) + 1;
              }
            }
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : "unknown_error";
          await supabaseAdmin.from("integration_state").upsert({
            id: "gmail_bookings",
            enabled: true,
            last_run_at: new Date().toISOString(),
            last_status: "error",
            last_error: detail.slice(0, 500),
            detail: {
              ...previous,
              last_error_at: new Date().toISOString(),
              last_trigger: trigger,
            } as never,
          });
          return Response.json({ ok: false, error: "scan_failed", scanned }, { status: 502 });
        }

        const finishedAt = new Date().toISOString();
        await supabaseAdmin.from("integration_state").upsert({
          id: "gmail_bookings",
          enabled: true,
          last_run_at: finishedAt,
          last_status: "ok",
          last_error: null,
          detail: {
            ...previous,
            scanned,
            summary,
            days,
            last_trigger: trigger,
            last_success_at: finishedAt,
            cadence_minutes: 15,
          } as never,
        });

        return Response.json({ ok: true, scanned, summary });
      },
    },
  },
});
