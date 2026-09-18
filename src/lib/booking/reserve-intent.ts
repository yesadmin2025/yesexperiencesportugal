/**
 * Signature reserve intent — bridges the page-level "Reserve this day" CTAs
 * (hero + final conversion band) with the real booking form at `#book`.
 *
 * Why an event instead of a prop: the CTAs live in the route component while
 * the availability form owns date/party/price state. The event lets the CTA
 * mean "start reserving" (scroll + continue into the real Stripe checkout when
 * the form is already valid) without duplicating any booking or pricing logic.
 *
 * The `#book` anchor stays the no-JS fallback.
 */
export const SIGNATURE_RESERVE_INTENT_EVENT = "yes:signature-reserve-intent";

export interface SignatureReserveIntentDetail {
  tourId: string;
  placement: string;
}

export function dispatchSignatureReserveIntent(detail: SignatureReserveIntentDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SignatureReserveIntentDetail>(SIGNATURE_RESERVE_INTENT_EVENT, { detail }),
  );
}
