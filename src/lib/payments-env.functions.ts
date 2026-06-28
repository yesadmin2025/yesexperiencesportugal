import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentsEnvStatus = {
  server: {
    hasLiveKey: boolean;
    hasSandboxKey: boolean;
    hasLiveWebhook: boolean;
    hasSandboxWebhook: boolean;
    liveKeyPrefix: string | null;
    sandboxKeyPrefix: string | null;
  };
  stripePing: {
    ok: boolean;
    livemode: boolean | null;
    accountId: string | null;
    country: string | null;
    chargesEnabled: boolean | null;
    payoutsEnabled: boolean | null;
    detailsSubmitted: boolean | null;
    defaultCurrency: string | null;
    businessProfileName: string | null;
    error: string | null;
  };
  verdict: {
    ready: boolean;
    reason: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

function prefixOf(key: string | undefined): string | null {
  if (!key) return null;
  // Reveal only the safe identifying prefix, never the secret tail.
  // Stripe secret keys look like sk_live_XXXX… — show up to 12 chars.
  return key.slice(0, 12);
}

export const getPaymentsEnvStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentsEnvStatus> => {
    await assertAdmin(context);

    const liveKey = process.env.STRIPE_LIVE_API_KEY;
    const sandboxKey = process.env.STRIPE_SANDBOX_API_KEY;
    const liveWebhook = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    const sandboxWebhook = process.env.STRIPE_WEBHOOK_SECRET_SANDBOX;

    const server = {
      hasLiveKey: Boolean(liveKey && liveKey.startsWith("sk_live_")),
      hasSandboxKey: Boolean(sandboxKey && sandboxKey.startsWith("sk_test_")),
      hasLiveWebhook: Boolean(liveWebhook),
      hasSandboxWebhook: Boolean(sandboxWebhook),
      liveKeyPrefix: prefixOf(liveKey),
      sandboxKeyPrefix: prefixOf(sandboxKey),
    };

    const ping: PaymentsEnvStatus["stripePing"] = {
      ok: false,
      livemode: null,
      accountId: null,
      country: null,
      chargesEnabled: null,
      payoutsEnabled: null,
      detailsSubmitted: null,
      defaultCurrency: null,
      businessProfileName: null,
      error: null,
    };

    if (server.hasLiveKey && liveKey) {
      try {
        const res = await fetch("https://api.stripe.com/v1/account", {
          headers: { Authorization: `Bearer ${liveKey}` },
        });
        if (!res.ok) {
          ping.error = `Stripe API ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 300);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const acc = (await res.json()) as any;
          ping.ok = true;
          ping.accountId = acc.id ?? null;
          ping.country = acc.country ?? null;
          ping.chargesEnabled = acc.charges_enabled ?? null;
          ping.payoutsEnabled = acc.payouts_enabled ?? null;
          ping.detailsSubmitted = acc.details_submitted ?? null;
          ping.defaultCurrency = acc.default_currency ?? null;
          ping.businessProfileName = acc.business_profile?.name ?? null;
          // The /v1/account endpoint itself doesn't return livemode; infer from key.
          ping.livemode = true;
        }
      } catch (e) {
        ping.error = (e as Error).message?.slice(0, 300) ?? "Stripe ping failed";
      }
    } else {
      ping.error = "STRIPE_LIVE_API_KEY is missing or not a live key";
    }

    let ready = false;
    let reason = "";
    if (!server.hasLiveKey) {
      reason = "Server STRIPE_LIVE_API_KEY is missing or not a sk_live_ key.";
    } else if (!server.hasLiveWebhook) {
      reason = "STRIPE_WEBHOOK_SECRET_LIVE is missing — webhooks will fail.";
    } else if (!ping.ok) {
      reason = ping.error ?? "Stripe live ping failed.";
    } else if (!ping.chargesEnabled) {
      reason = "Stripe account cannot accept charges yet (charges_enabled = false).";
    } else if (!ping.detailsSubmitted) {
      reason = "Stripe account onboarding not finished (details_submitted = false).";
    } else {
      ready = true;
      reason = "Server live key valid, charges enabled, webhook secret present.";
    }

    return { server, stripePing: ping, verdict: { ready, reason } };
  });

export type WebhookSignatureTestResult = {
  ok: boolean;
  steps: {
    secretPresent: boolean;
    secretPrefixOk: boolean; // starts with "whsec_"
    validSignatureAccepted: { ok: boolean; status: number | null; body: string | null };
    invalidSignatureRejected: { ok: boolean; status: number | null; body: string | null };
  };
  endpoint: string;
  reason: string;
};

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

export const testStripeWebhookSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WebhookSignatureTestResult> => {
    await assertAdmin(context);

    const secret = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    const supabaseUrl = process.env.SUPABASE_URL!;
    const endpoint = `${supabaseUrl}/functions/v1/stripe-webhook`;

    const result: WebhookSignatureTestResult = {
      ok: false,
      steps: {
        secretPresent: Boolean(secret),
        secretPrefixOk: Boolean(secret && secret.startsWith("whsec_")),
        validSignatureAccepted: { ok: false, status: null, body: null },
        invalidSignatureRejected: { ok: false, status: null, body: null },
      },
      endpoint,
      reason: "",
    };

    if (!secret) {
      result.reason = "STRIPE_WEBHOOK_SECRET_LIVE is not configured.";
      return result;
    }
    if (!result.steps.secretPrefixOk) {
      result.reason = "STRIPE_WEBHOOK_SECRET_LIVE does not start with whsec_ — likely wrong value.";
      return result;
    }

    // Build a benign synthetic Stripe event the webhook will accept-then-ignore
    // (the handler short-circuits any event type other than checkout.session.*).
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: `evt_selftest_${timestamp}`,
      object: "event",
      type: "ping.selftest",
      livemode: true,
      created: timestamp,
      data: { object: { id: "selftest" } },
    });

    const signedPayload = `${timestamp}.${payload}`;
    const v1 = await hmacSha256Hex(secret, signedPayload);
    const validHeader = `t=${timestamp},v1=${v1}`;
    const invalidHeader = `t=${timestamp},v1=${"0".repeat(64)}`;

    // 1) Valid signature → should verify and return 200 with ignored:"ping.selftest"
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": validHeader },
        body: payload,
      });
      const body = (await res.text()).slice(0, 300);
      result.steps.validSignatureAccepted = {
        ok: res.status === 200 && body.includes("ping.selftest"),
        status: res.status,
        body,
      };
    } catch (e) {
      result.steps.validSignatureAccepted.body = (e as Error).message.slice(0, 300);
    }

    // 2) Invalid signature → must be rejected with 400
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": invalidHeader },
        body: payload,
      });
      const body = (await res.text()).slice(0, 300);
      result.steps.invalidSignatureRejected = {
        ok: res.status === 400,
        status: res.status,
        body,
      };
    } catch (e) {
      result.steps.invalidSignatureRejected.body = (e as Error).message.slice(0, 300);
    }

    result.ok =
      result.steps.validSignatureAccepted.ok && result.steps.invalidSignatureRejected.ok;
    result.reason = result.ok
      ? "Webhook secret verified end-to-end: live signature accepted, forged signature rejected."
      : !result.steps.validSignatureAccepted.ok
        ? "Live-signed payload was NOT accepted by the webhook — secret mismatch between this env and the deployed function."
        : "Webhook accepted a forged signature — this is a critical security failure.";

    return result;
  });
