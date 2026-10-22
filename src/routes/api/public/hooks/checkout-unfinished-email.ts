import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import { resumePathFor, shouldSendUnfinishedReminder } from "@/lib/checkout/unfinished-reminder";

const payloadSchema = z.object({
  sessionId: z.string().startsWith("cs_live_").max(255),
});

const SITE = "https://yesexperiencesportugal.com";

/**
 * Called by the stripe-webhook function when a LIVE Checkout session expires
 * unpaid. Sends one notice per session to that guest (idempotent by session).
 */
export const Route = createFileRoute("/api/public/hooks/checkout-unfinished-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EMAIL_INTERNAL_SECRET"];
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!secret || provided.length !== secret.length || provided !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
        const { sessionId } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: snap } = await supabaseAdmin
          .from("booking_snapshots")
          .select("payload, created_at")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();
        if (!snap) return Response.json({ ok: true, skipped: "no_snapshot" });
        const p = (snap.payload ?? {}) as Record<string, unknown>;
        const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
        const mainContact = (p.mainContact ?? {}) as Record<string, unknown>;
        const email = str(mainContact.email) ?? str(p.customerEmail);
        const customerName = str(p.customerName);

        let alreadyPaid = false;
        if (email) {
          const { count } = await supabaseAdmin
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .ilike("customer_email", email)
            .gte("created_at", snap.created_at);
          alreadyPaid = (count ?? 0) > 0;
        }
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
        const dateExact = str(p.dateExact);
        if (!shouldSendUnfinishedReminder({ customerName, email, dateExact, today, alreadyPaid })) {
          return Response.json({ ok: true, skipped: "rules" });
        }
        const result = await sendTransactionalInternal({
          templateName: "checkout-unfinished",
          recipientEmail: email!,
          idempotencyKey: `checkout-unfinished-${sessionId}`,
          templateData: {
            customerName: customerName?.split(" ")[0] ?? null,
            experienceName: str(p.experienceName) ?? str(p.tourTitle),
            dateExact,
            resumeUrl: `${SITE}${resumePathFor(str(p.flow), str(p.tourId))}`,
          },
        });
        return Response.json(result, { status: result.ok ? 200 : 202 });
      },
    },
  },
});
