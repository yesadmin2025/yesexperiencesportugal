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
