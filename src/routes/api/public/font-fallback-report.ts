import { createFileRoute } from "@tanstack/react-router";

/**
 * Diagnostic endpoint — receives batches from the client-side
 * font-fallback detector when `?fontDebug=1`. Writes to worker logs
 * so the runtime output is retrievable via `stack_modern--server-function-logs`
 * search "font-fallback". No auth (public /api/public/*) and no PII.
 */
export const Route = createFileRoute("/api/public/font-fallback-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return new Response(null, { status: 204 });
          }
          const route = typeof body.route === "string" ? body.route : "(unknown)";
          const offenders = Array.isArray(body.offenders) ? body.offenders.slice(0, 20) : [];
          // eslint-disable-next-line no-console
          console.warn(
            `[font-fallback] route=${route} count=${offenders.length} ${JSON.stringify(offenders)}`,
          );
        } catch {
          /* noop */
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
