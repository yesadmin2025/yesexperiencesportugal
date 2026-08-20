import { createFileRoute } from "@tanstack/react-router";
import { flushDeferredSends } from "@/lib/email/send-internal.server";

/**
 * Drains guest confirmations that the provider previously refused (unverified
 * sender domain, sandbox restriction, transient 4xx). Safe to call repeatedly —
 * each parked message is keyed by its idempotency key and marked delivered on
 * success, so nothing is ever sent twice.
 *
 * Authenticated with the same shared bearer secret as the checkout hook so it
 * can be driven from a scheduler or replayed manually.
 */
export const Route = createFileRoute("/api/public/hooks/email-flush")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EMAIL_INTERNAL_SECRET;
        if (!secret) {
          return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
        }
        const auth = request.headers.get("authorization") || "";
        const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (provided.length !== secret.length || provided !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const result = await flushDeferredSends(25);
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
