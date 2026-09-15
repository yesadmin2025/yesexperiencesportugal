import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import {
  isAutomatedContext,
  livePaymentsGuardViolation,
  resolvePaymentsEnvironment,
  type PaymentsEnvironment,
} from "@/lib/payments-environment";

type StripeEnv = PaymentsEnvironment;

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

function currentHostname(): string | null {
  return typeof window !== "undefined" ? window.location.hostname : null;
}

/**
 * P0: the environment is derived from the runtime host, not from the embedded
 * key. Live is reachable only from the canonical production hosts; previews,
 * localhost and automated QA always run in test mode. The server enforces the
 * same rule independently.
 */
export function getStripeEnvironment(): StripeEnv {
  return resolvePaymentsEnvironment({
    hostname: currentHostname(),
    publishableKey: clientToken,
    automated: isAutomatedContext(),
  });
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    }
    const violation = livePaymentsGuardViolation({
      hostname: currentHostname(),
      publishableKey: clientToken,
      automated: isAutomatedContext(),
    });
    if (violation) {
      // Never silently charge a real card from a preview/QA context.
      throw new Error(`Payments blocked: ${violation}`);
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function isStripeTestMode(): boolean {
  return getStripeEnvironment() === "sandbox";
}
