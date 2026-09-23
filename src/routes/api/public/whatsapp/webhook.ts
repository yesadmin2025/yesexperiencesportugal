/**
 * WhatsApp Business receiver — POST /api/public/whatsapp/webhook
 *
 * The Lovable connector gateway forwards every change Meta sends for the
 * connected number here. Each delivery is verified, stored in the
 * `whatsapp_webhook_events` inbox, then processed:
 *   whatsapp.message            → inbound guest messages
 *   whatsapp.smb_message_echoes → messages sent from the business phone
 *   whatsapp.history            → past chats replayed after a history sync
 *   whatsapp.smb_app_state_sync → the phone's contacts (identity only)
 *   whatsapp.status             → delivery states; never a booking event
 *
 * Processing is idempotent by provider message id, and a database failure
 * returns 5xx so the gateway retries with the same delivery id.
 */
import { createFileRoute } from "@tanstack/react-router";

type Change = { value?: Record<string, unknown> };

const asArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

const text = (entry: Record<string, unknown>): string | null => {
  const body = (entry["text"] as Record<string, unknown> | undefined)?.["body"];
  if (typeof body === "string") return body;
  for (const key of ["caption", "button", "interactive"]) {
    const nested = entry[key] as Record<string, unknown> | undefined;
    const candidate = nested?.["text"] ?? nested?.["body"] ?? nested?.["caption"];
    if (typeof candidate === "string") return candidate;
  }
  return null;
};

const stamp = (entry: Record<string, unknown>): string | null => {
  const raw = entry["timestamp"];
  const seconds = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : null;
  return seconds && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
};

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const connectionKey = process.env["WHATSAPP_API_KEY"];
        if (!connectionKey) {
          return Response.json({ ok: false, error: "whatsapp_not_configured" }, { status: 503 });
        }

        const deliveryId = request.headers.get("x-lovable-delivery") ?? "";
        const event = request.headers.get("x-lovable-event") ?? "";
        if (!deliveryId.trim() || !event.trim()) {
          return Response.json({ ok: false, error: "missing_delivery_headers" }, { status: 400 });
        }

        const { verifyWebhookRequest } = await import("@lovable.dev/webhooks-js");
        let rawBody: string;
        try {
          const verified = await verifyWebhookRequest(request, {
            secret: connectionKey,
            // WhatsApp Business history chunks reach ~3 MB.
            maxBodyBytes: 4 * 1024 * 1024,
          });
          rawBody = typeof verified === "string" ? verified : ((verified as { body?: string }).body ?? "");
          if (!rawBody) rawBody = await request.clone().text();
        } catch (error) {
          console.error("whatsapp_webhook_unverified", error instanceof Error ? error.message : error);
          return Response.json({ ok: false, error: "unverified" }, { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Durable receipt first, deduplicated on the delivery id.
        const { data: existing, error: readError } = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .select("id, processed_at, attempts")
          .eq("delivery_id", deliveryId)
          .maybeSingle();
        if (readError) {
          return Response.json({ ok: false, error: "inbox_unavailable" }, { status: 503 });
        }

        let eventRowId = existing?.id ?? null;
        if (existing?.processed_at) {
          return Response.json({ ok: true, duplicate: true });
        }
        if (!existing) {
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from("whatsapp_webhook_events")
            .insert({
              delivery_id: deliveryId,
              event,
              payload: payload as never,
              received_at: new Date().toISOString(),
            })
            .select("id")
            .maybeSingle();
          if (insertError || !inserted) {
            return Response.json({ ok: false, error: "inbox_write_failed" }, { status: 503 });
          }
          eventRowId = inserted.id;
        }

        // 2. Process the stored row.
        const {
          recordWhatsAppMessage,
          recordWhatsAppStatus,
          recordWhatsAppContact,
          reconcileWhatsAppMessage,
        } = await import("@/lib/whatsapp/reconcile.server");

        const summary: Record<string, number> = {};
        const bump = (key: string) => {
          summary[key] = (summary[key] ?? 0) + 1;
        };

        try {
          const changes = asArray((payload["entry"] as Array<Record<string, unknown>> | undefined)?.[0]?.["changes"]);
          for (const change of changes as Change[]) {
            const value = change.value ?? {};

            for (const entry of asArray(value["messages"])) {
              const from = typeof entry["from"] === "string" ? entry["from"] : null;
              const id = typeof entry["id"] === "string" ? entry["id"] : null;
              if (!from || !id) continue;
              const { duplicate, row } = await recordWhatsAppMessage(supabaseAdmin, {
                providerMessageId: id,
                phone: from,
                direction: "inbound",
                sentAt: stamp(entry),
                body: text(entry),
                ingestSource: "webhook",
              });
              bump(duplicate ? "message_duplicate" : "message_stored");
              if (!duplicate && row) {
                const outcome = await reconcileWhatsAppMessage(supabaseAdmin, row);
                bump(`reconcile_${outcome.action}`);
              }
            }

            for (const entry of asArray(value["message_echoes"])) {
              const to = typeof entry["to"] === "string" ? entry["to"] : null;
              const id = typeof entry["id"] === "string" ? entry["id"] : null;
              if (!to || !id) continue;
              const { duplicate, row } = await recordWhatsAppMessage(supabaseAdmin, {
                providerMessageId: id,
                phone: to,
                direction: "outbound",
                sentAt: stamp(entry),
                body: text(entry),
                ingestSource: "webhook",
              });
              bump(duplicate ? "echo_duplicate" : "echo_stored");
              if (!duplicate && row) {
                const outcome = await reconcileWhatsAppMessage(supabaseAdmin, row);
                bump(`reconcile_${outcome.action}`);
              }
            }

            for (const thread of asArray(value["history"])) {
              for (const conversation of asArray(thread["threads"])) {
                const contact = typeof conversation["id"] === "string" ? conversation["id"] : null;
                for (const entry of asArray(conversation["messages"])) {
                  const id = typeof entry["id"] === "string" ? entry["id"] : null;
                  const from = typeof entry["from"] === "string" ? entry["from"] : null;
                  const to = typeof entry["to"] === "string" ? entry["to"] : null;
                  const phone = from ?? to ?? contact;
                  if (!id || !phone) continue;
                  const { duplicate, row } = await recordWhatsAppMessage(supabaseAdmin, {
                    providerMessageId: id,
                    phone,
                    direction: to && !from ? "outbound" : "inbound",
                    sentAt: stamp(entry),
                    body: text(entry),
                    ingestSource: "history",
                  });
                  bump(duplicate ? "history_duplicate" : "history_stored");
                  if (!duplicate && row) {
                    const outcome = await reconcileWhatsAppMessage(supabaseAdmin, row);
                    bump(`reconcile_${outcome.action}`);
                  }
                }
              }
            }

            for (const entry of asArray(value["state_sync"])) {
              const contact = (entry["contact"] ?? {}) as Record<string, unknown>;
              const phone = typeof contact["phone_number"] === "string" ? contact["phone_number"] : null;
              if (!phone) continue;
              await recordWhatsAppContact(supabaseAdmin, {
                phone,
                name: typeof contact["full_name"] === "string" ? contact["full_name"] : null,
                action: entry["action"] === "remove" ? "remove" : "add",
              });
              bump("contact_synced");
            }

            // Delivery states annotate the message only — never a booking event.
            for (const entry of asArray(value["statuses"])) {
              const id = typeof entry["id"] === "string" ? entry["id"] : null;
              const status = typeof entry["status"] === "string" ? entry["status"] : null;
              if (!id || !status) continue;
              await recordWhatsAppStatus(supabaseAdmin, {
                providerMessageId: id,
                status,
                timestamp: stamp(entry),
              });
              bump("status_recorded");
            }

            for (const entry of asArray(value["errors"])) {
              console.error("whatsapp_provider_error", JSON.stringify(entry).slice(0, 500));
              bump("provider_error");
            }
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : "unknown_error";
          if (eventRowId) {
            await supabaseAdmin
              .from("whatsapp_webhook_events")
              .update({ processing_error: detail.slice(0, 500), attempts: (existing?.attempts ?? 0) + 1 })
              .eq("id", eventRowId);
          }
          console.error("whatsapp_webhook_processing_failed", detail);
          return Response.json({ ok: false, error: "processing_failed" }, { status: 503 });
        }

        if (eventRowId) {
          await supabaseAdmin
            .from("whatsapp_webhook_events")
            .update({
              processed_at: new Date().toISOString(),
              processing_error: null,
              attempts: (existing?.attempts ?? 0) + 1,
            })
            .eq("id", eventRowId);
        }

        await supabaseAdmin.from("integration_state").upsert({
          id: "whatsapp_inbound",
          enabled: true,
          last_run_at: new Date().toISOString(),
          last_status: "ok",
          last_error: null,
          detail: { last_event: event, summary } as never,
        });

        return Response.json({ ok: true, summary });
      },
    },
  },
});
