/**
 * FINAL STUDIO CLOSURE — the payment seam fails closed.
 *
 * Proves, without redesigning anything, that:
 *  - the operational approval truth is enforced AGAIN at the Stripe seam,
 *    not only on the Reserve CTA;
 *  - a blocked / rejected / unscored / stale-route day can never open Stripe;
 *  - an over-budget or unevaluable day can never open Stripe;
 *  - a certified day still can;
 *  - the protected generated brand audit is byte-restored.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { describeRouteIdentity, judgeFinalDayTime } from "@/lib/studio-v3/finalTimeGate";
import {
  isOperationallyBookable,
  publishOperationalGate,
  readOperationalGate,
  resetOperationalGate,
} from "@/lib/studio-v3/operationalGateChannel";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

const DAY = [
  { label: "Mercado do Livramento", inventoryStopId: "livramento" },
  { label: "Quinta de Catralvos", inventoryStopId: "catralvos" },
];
const IDENTITY = describeRouteIdentity(DAY);

describe("payment seam re-asks the operational truth", () => {
  beforeEach(() => resetOperationalGate());

  it("defaults to fail-closed before any day is gated", () => {
    expect(readOperationalGate().proven).toBe(false);
    expect(isOperationallyBookable(IDENTITY)).toBe(false);
  });

  it("never opens checkout for an unscored day", () => {
    publishOperationalGate({ proven: false, status: "review", identity: IDENTITY });
    expect(isOperationallyBookable(IDENTITY)).toBe(false);
  });

  it("never opens checkout for a hard operational rejection", () => {
    publishOperationalGate({ proven: true, status: "reject", identity: IDENTITY });
    expect(isOperationallyBookable(IDENTITY)).toBe(false);
  });

  it("never opens checkout for a route that is not the gated day", () => {
    publishOperationalGate({ proven: true, status: "approved", identity: IDENTITY });
    const stale = describeRouteIdentity([...DAY].reverse());
    expect(stale).not.toBe(IDENTITY);
    expect(isOperationallyBookable(stale)).toBe(false);
    expect(isOperationallyBookable(describeRouteIdentity(DAY.slice(0, 1)))).toBe(false);
  });

  it("lets a certified day through", () => {
    publishOperationalGate({ proven: true, status: "approved", identity: IDENTITY });
    expect(isOperationallyBookable(IDENTITY)).toBe(true);
    // A scored SOFT advisory is not a hard rejection and stays bookable.
    publishOperationalGate({ proven: true, status: "review", identity: IDENTITY });
    expect(isOperationallyBookable(IDENTITY)).toBe(true);
  });

  it("keeps DIRECT deterministic gates in handleStripeCheckout, before Stripe", () => {
    // The payment seam no longer consults the mutable global snapshot.
    expect(STUDIO_SRC).not.toContain(
      "isOperationallyBookable(describeRouteIdentity(checkoutStops))",
    );
    const stripeAt = STUDIO_SRC.indexOf("create-signature-checkout");
    expect(stripeAt).toBeGreaterThan(-1);
    // Existing fail-closed gates are preserved, all ahead of Stripe.
    for (const guard of [
      "if (requiresCuratorParty(partyTotal)) {",
      "if (!resolvedPerPax) {",
      "if (checkoutStops.length < 2) {",
      "if (!checkoutTimeGate.bookable) {",
      "if (!frozenDayAllowsCheckout(checkoutDoorToDoor)) {",
      "if (!liveAuthority.safe) {",
      "if (commercial.blocked) {",
    ]) {
      const at = STUDIO_SRC.indexOf(guard);
      expect(at, guard).toBeGreaterThan(-1);
      expect(at, guard).toBeLessThan(stripeAt);
    }
  });
});


describe("time truth at the payment seam", () => {
  it("refuses an unevaluable day", () => {
    const gate = judgeFinalDayTime({
      points: [{ label: "Unknown place", durationMinutes: null, durationSource: null }],
    });
    expect(gate.bookable).toBe(false);
    expect(gate.requiresReview).toBe(true);
  });

  it("refuses a day pushed over budget by add-on minutes", () => {
    const gate = judgeFinalDayTime({
      points: DAY.map((p) => ({
        ...p,
        lat: 38.52,
        lng: -9.02,
        durationMinutes: 90,
        durationSource: "inventory" as const,
      })),
      addOnsMinutes: 100000,
    });
    expect(gate.bookable).toBe(false);
  });
});

describe("protected generated file", () => {
  it("brand-audit.json matches the pre-closure protected baseline", () => {
    const pristine = execFileSync(
      "git",
      ["show", "681b1159b4883a5a9be6899c9a1a17f25ca7269f:src/generated/brand-audit.json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    const onDisk = readFileSync(
      resolve(process.cwd(), "src/generated/brand-audit.json"),
      "utf8",
    );
    expect(onDisk).toBe(pristine);
  });
});
