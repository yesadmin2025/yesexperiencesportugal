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
        const anonKey = process.env.SUPABASE_ANON_KEY;
        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
        const apikey = request.headers.get("apikey") || "";
        const authorized =
          (internalSecret && (bearer === internalSecret || apikey === internalSecret)) ||
          (anonKey && (bearer === anonKey || apikey === anonKey));
        if (!authorized) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const result = await runHealthCheck();

        // Persist result.
        await supabaseAdmin.from("stripe_webhook_health_checks").insert({
          status: result.ok ? "ok" : "fail",
          reason: result.reason,
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

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface HealthCheckResult {
  ok: boolean;
  reason: string;
  endpoint: string;
  secretPresent: boolean;
  secretPrefixOk: boolean;
  validStatus: number | null;
  invalidStatus: number | null;
}

async function runHealthCheck(): Promise<HealthCheckResult> {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  const supabaseUrl = process.env.SUPABASE_URL!;
  const endpoint = `${supabaseUrl}/functions/v1/stripe-webhook`;

  const result: HealthCheckResult = {
    ok: false,
    reason: "",
    endpoint,
    secretPresent: Boolean(whsec),
    secretPrefixOk: Boolean(whsec && whsec.startsWith("whsec_")),
    validStatus: null,
    invalidStatus: null,
  };

  if (!whsec) {
    result.reason = "STRIPE_WEBHOOK_SECRET_LIVE is not configured.";
    return result;
  }
  if (!result.secretPrefixOk) {
    result.reason = "STRIPE_WEBHOOK_SECRET_LIVE does not start with whsec_.";
    return result;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_healthcheck_${timestamp}`,
    object: "event",
    type: "ping.selftest",
    livemode: true,
    created: timestamp,
    data: { object: { id: "healthcheck" } },
  });

  const signedPayload = `${timestamp}.${payload}`;
  const v1 = await hmacSha256Hex(whsec, signedPayload);
  const validHeader = `t=${timestamp},v1=${v1}`;
  const invalidHeader = `t=${timestamp},v1=${"0".repeat(64)}`;

  let validOk = false;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": validHeader },
      body: payload,
    });
    result.validStatus = res.status;
    const body = (await res.text()).slice(0, 300);
    validOk = res.status === 200 && body.includes("ping.selftest");
  } catch (e) {
    result.reason = `Valid-signature request failed: ${(e as Error).message}`.slice(0, 300);
    return result;
  }

  let invalidOk = false;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": invalidHeader },
      body: payload,
    });
    result.invalidStatus = res.status;
    invalidOk = res.status === 400;
  } catch (e) {
    result.reason = `Forged-signature request failed: ${(e as Error).message}`.slice(0, 300);
    return result;
  }

  result.ok = validOk && invalidOk;
  result.reason = result.ok
    ? "Live signature accepted, forged signature rejected."
    : !validOk
      ? "Live-signed payload was NOT accepted by the webhook — signing-secret mismatch between env and deployed function."
      : "Forged signature was accepted — critical signature-verification failure.";
  return result;
}
