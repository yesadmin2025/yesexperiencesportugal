/**
 * Single entry point for creating a Stripe Checkout session (P0).
 *
 * Why this exists:
 *   • the payments environment is resolved in ONE place (host-derived), so no
 *     surface can accidentally ask for live mode from a preview;
 *   • a module-level in-flight lock prevents double-submit / duplicate
 *     sessions when a guest taps twice or retries quickly;
 *   • identical concurrent requests share one promise instead of creating two
 *     Stripe sessions.
 *
 * Terminology: `uiMode: "embedded"` is the only embedded-checkout name used
 * across frontend and backend. "drawer", "sheet" and "inline" describe UI
 * containers, never the Stripe mode.
 */

import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export type CheckoutFunctionName = "create-signature-checkout" | "create-builder-checkout";

export interface CheckoutSessionResponse {
  clientSecret?: string;
  publishableKey?: string;
  [key: string]: unknown;
}

interface InvokeResult {
  data: CheckoutSessionResponse | null;
  error: unknown;
}

const inFlight = new Map<string, Promise<InvokeResult>>();

function signatureOf(fn: string, body: Record<string, unknown>): string {
  try {
    return `${fn}:${JSON.stringify(body)}`;
  } catch {
    return `${fn}:unserializable:${Date.now()}`;
  }
}

/** True while a checkout session request is already outstanding. */
export function hasPendingCheckoutSession(): boolean {
  return inFlight.size > 0;
}

/**
 * Create a checkout session. The environment field is always overwritten
 * server-visibly with the host-derived value — call sites must not pass one.
 */
export async function invokeCheckoutSession(
  fn: CheckoutFunctionName,
  body: Record<string, unknown>,
): Promise<InvokeResult> {
  const payload = { ...body, environment: getStripeEnvironment() };
  const key = signatureOf(fn, payload);

  const existing = inFlight.get(key);
  if (existing) return existing;

  // A different request while one is outstanding must NOT silently reuse the
  // other session (it belongs to a different itinerary) and must not create a
  // duplicate Stripe session either. Surface it as a retryable state.
  if (inFlight.size > 0) {
    return {
      data: null,
      error: new Error("A payment is already being prepared. Please wait a moment and try again."),
    };
  }

  const promise = (async (): Promise<InvokeResult> => {
    const { data, error } = await supabase.functions.invoke(fn, { body: payload });
    return { data: (data ?? null) as CheckoutSessionResponse | null, error };
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

/** Convenience wrapper for the Signature/Tailor/Studio surfaces. */
export function invokeSignatureCheckout(body: Record<string, unknown>): Promise<InvokeResult> {
  return invokeCheckoutSession("create-signature-checkout", body);
}
