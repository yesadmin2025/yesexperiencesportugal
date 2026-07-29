import { createFileRoute } from "@tanstack/react-router";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Periodic health check for the Stripe webhook.
 *
 * Called by pg_cron on a schedule. Sends a synthetic event to the deployed
 * `stripe-webhook` Edge Function with a valid HMAC (signed by
 * STRIPE_WEBHOOK_SECRET_LIVE) plus a forged one, and asserts:
 *   - valid signature   → HTTP 200 with body echoing "ping.selftest"
 *   - forged signature  → HTTP 400
 *
 * Result is logged to `stripe_webhook_health_checks`. On failure an alert
 * email is dispatched, throttled so we don't spam (only if the last stored
 * check succeeded OR the last alert was more than 6h ago).
 *
 * Auth: accepts either the Supabase anon `apikey` header (canonical pg_cron
 * pattern) or a bearer `EMAIL_INTERNAL_SECRET`. The endpoint is read-only
 * side-effect-wise (writes a health row + throttled alert) so anon key is safe.
 */
export const Route = createFileRoute("/api/public/hooks/stripe-webhook-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const internalSecret = process.env.EMAIL_INTERNAL_SECRET;
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
        const apikey = request.headers.get("apikey") || "";
        const authorized =
          (internalSecret && (bearer === internalSecret || apikey === internalSecret)) ||
          (anonKey && (bearer === anonKey || apikey === anonKey));
        if (!authorized) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const envParam = (url.searchParams.get("env") || "live").toLowerCase();
        const env: "live" | "sandbox" =
          envParam === "sandbox" || envParam === "test" ? "sandbox" : "live";

        const result = await runHealthCheck(env);

        // Persist result.
        await supabaseAdmin.from("stripe_webhook_health_checks").insert({
          status: result.ok ? "ok" : "fail",
          reason: `[${env}] ${result.reason}`,
          valid_status: result.validStatus,
          invalid_status: result.invalidStatus,
          secret_present: result.secretPresent,
          secret_prefix_ok: result.secretPrefixOk,
          endpoint: result.endpoint,
          alerted: false,
        });

        let alerted = false;
        if (!result.ok) {
          // Throttle alerts: only alert if the previous check was OK, or if
          // no alert has been sent in the last 6 hours.
          const { data: previous } = await supabaseAdmin
            .from("stripe_webhook_health_checks")
            .select("status, alerted, checked_at")
            .order("checked_at", { ascending: false })
            .limit(5);

          const rows = previous ?? [];
          const lastAlertedAt = rows.find((r) => r.alerted)?.checked_at;
          const hoursSinceAlert = lastAlertedAt
            ? (Date.now() - new Date(lastAlertedAt).getTime()) / 36e5
            : Infinity;
          // rows[0] is the row we just inserted (status=fail). Compare to rows[1].
          const previousStatus = rows[1]?.status ?? null;

          if (previousStatus === "ok" || hoursSinceAlert > 6) {
            const send = await sendTransactionalInternal({
              templateName: "stripe-webhook-alert",
              recipientEmail: "info@yesexperiencesportugal.com",
              idempotencyKey: `webhook-alert-${Math.floor(Date.now() / 3.6e6)}`,
              templateData: {
                reason: result.reason,
                endpoint: result.endpoint,
                validStatus: result.validStatus,
                invalidStatus: result.invalidStatus,
                secretPresent: result.secretPresent,
                secretPrefixOk: result.secretPrefixOk,
                checkedAt: new Date().toISOString(),
              },
            });
            alerted = send.ok;
            if (alerted) {
              await supabaseAdmin
                .from("stripe_webhook_health_checks")
                .update({ alerted: true })
                .eq("status", "fail")
                .order("checked_at", { ascending: false })
                .limit(1);
            }
          }
        }

        return Response.json({ ...result, alerted });
      },
    },
  },
});

interface HealthCheckResult {
  ok: boolean;
  reason: string;
  endpoint: string;
  secretPresent: boolean;
  secretPrefixOk: boolean;
  validStatus: number | null;
  invalidStatus: number | null;
}

async function runHealthCheck(env: "live" | "sandbox"): Promise<HealthCheckResult> {
  const secretName =
    env === "sandbox" ? "STRIPE_WEBHOOK_SECRET_SANDBOX" : "STRIPE_WEBHOOK_SECRET_LIVE";
  const supabaseUrl = process.env.SUPABASE_URL!;
  const endpoint = `${supabaseUrl}/functions/v1/stripe-webhook`;
  const internalSecret = process.env.EMAIL_INTERNAL_SECRET;

  const result: HealthCheckResult = {
    ok: false,
    reason: "",
    endpoint,
    secretPresent: false,
    secretPrefixOk: false,
    validStatus: null,
    invalidStatus: null,
  };

  if (!internalSecret) {
    result.reason = "EMAIL_INTERNAL_SECRET is not configured for the internal health check.";
    return result;
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalSecret}`,
        "x-yes-internal-action": "healthcheck",
      },
      body: JSON.stringify({ environment: env }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      reason?: string;
      secretPresent?: boolean;
      secretPrefixOk?: boolean;
      validStatus?: number | null;
      invalidStatus?: number | null;
    };
    result.ok = res.ok && body.ok === true;
    result.reason = body.reason ?? `${secretName} health check returned no reason.`;
    result.secretPresent = body.secretPresent === true;
    result.secretPrefixOk = body.secretPrefixOk === true;
    result.validStatus = body.validStatus ?? null;
    result.invalidStatus = body.invalidStatus ?? null;
    return result;
  } catch (e) {
    result.reason = `Internal webhook health request failed: ${(e as Error).message}`.slice(0, 300);
    return result;
  }
}
