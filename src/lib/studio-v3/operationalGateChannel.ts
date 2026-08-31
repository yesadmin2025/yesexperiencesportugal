/**
 * FINAL STUDIO CLOSURE — the operational approval channel.
 *
 * The Your Day surface (`StoryboardHandoff`) is the only place where the
 * operational gate can be derived: it owns the reveal route and its proven
 * road-leg minutes. The payment seam (`handleStripeCheckout`) lives in the
 * parent component and must fail closed on that SAME truth, independently of
 * the CTA.
 *
 * This module is a one-value channel between those two seams. It owns NO
 * rules: it stores facts already derived elsewhere and hands them back
 * unchanged. Default state is fail-closed — unproven, under review, and
 * bound to no route at all.
 */

import type { ValidationStatus } from "@/lib/studio-v3/itinerary-validation";

export interface PublishedOperationalGate {
  /** True only when the day was really scored on proven road data. */
  readonly proven: boolean;
  /** The validator's status for that scored day. */
  readonly status: ValidationStatus;
  /** `describeRouteIdentity` of the exact day this verdict describes. */
  readonly identity: string;
}

const FAIL_CLOSED: PublishedOperationalGate = {
  proven: false,
  status: "review",
  identity: "",
};

let current: PublishedOperationalGate = FAIL_CLOSED;

/** Publish the gate for the day currently on screen. */
export function publishOperationalGate(gate: PublishedOperationalGate): void {
  current = gate;
}

/** Read the last published gate. Never optimistic. */
export function readOperationalGate(): PublishedOperationalGate {
  return current;
}

/** Reset to the fail-closed default (tests, and Studio teardown). */
export function resetOperationalGate(): void {
  current = FAIL_CLOSED;
}

/**
 * The payment-seam question: may THIS exact day open a self-service checkout?
 * A day that was never scored, a HARD rejection, or a route that is not the
 * one the gate certified all answer `false`.
 */
export function isOperationallyBookable(routeIdentity: string): boolean {
  const gate = current;
  return (
    gate.proven &&
    gate.status !== "reject" &&
    gate.identity !== "" &&
    gate.identity === routeIdentity
  );
}
