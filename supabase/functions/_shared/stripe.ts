import Stripe from "https://esm.sh/stripe@22.0.2";

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

export function getStripeApiKey(env: StripeEnv): string {
  if (env === "sandbox") return getEnv("STRIPE_SANDBOX_API_KEY");
  // Prefer restricted key when configured (rk_live_…); fall back to full secret key.
  const restricted = Deno.env.get("STRIPE_RESTRICTED_API_KEY");
  if (restricted && restricted.startsWith("rk_")) return restricted;
  return getEnv("STRIPE_LIVE_API_KEY");
}

// BYOK: calls api.stripe.com directly with the user's own secret key.
export function createStripeClient(env: StripeEnv): Stripe {
  const apiKey = getStripeApiKey(env);
  return new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}
