/**
 * P0-A — the Your Day gate is no longer circular.
 *
 * "Make it real" asks only whether the visible day is structurally honest.
 * Door-to-door certification depends on pickup, date and party size — facts
 * collected AFTER this CTA — so it may never gate progression. Booking truth
 * (`canReserve`) and the Stripe fail-closed seam stay exactly as strict.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const STUDIO = fs.readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

describe("Your Day progression gate", () => {
  it("separates progression truth from booking truth", () => {
    expect(STUDIO).toContain("const canProceedToLogistics =");
    expect(STUDIO).toContain("const dayHardRejected =");
    expect(STUDIO).toContain(
      "canProceedToLogistics && operationalGate.proven && finalDayGate.bookable",
    );
  });

  it("does not require operational/time certification to reach logistics", () => {
    const start = STUDIO.indexOf("const canProceedToLogistics =");
    const gate = STUDIO.slice(start, STUDIO.indexOf(";", start));
    expect(gate).not.toContain("operationalGate.proven");
    expect(gate).not.toContain("finalDayGate.bookable");
  });

  it("blocks progression only on a true hard rejection", () => {
    const start = STUDIO.indexOf("const dayHardRejected =");
    const rule = STUDIO.slice(start, STUDIO.indexOf(";", start));
    expect(rule).toContain('approvalStatus === "reject"');
    expect(rule).toContain('finalDayGate.fit.verdict === "over-day-budget"');
  });

  it("labels the primary CTA as the reward hand-off, not a booking verb", () => {
    expect(STUDIO).toContain("CTA_MAKE_IT_REAL");
    expect(STUDIO).toContain("disabled={!canProceedToLogistics}");
    expect(STUDIO).not.toContain("disabled={!canReserve}");
  });

  it("never reports a missing practical fact as needing a human", () => {
    const start = STUDIO.indexOf("const reserveBlockedReason: string | null =");
    const reasons = STUDIO.slice(start, STUDIO.indexOf(";", start));
    expect(reasons).not.toContain("human check");
  });
});

describe("booking truth is unweakened", () => {
  it("still fails closed at the Stripe seam", () => {
    expect(STUDIO).toContain("if (!checkoutTimeGate.bookable) {");
    expect(STUDIO).toContain("isOperationallyBookable");
  });
});

describe("P0-E — exact price only after the party is confirmed", () => {
  it("passes an explicit party-confirmed signal to the price surface", () => {
    expect(STUDIO).toContain("partyConfirmed={state.guests != null}");
  });

  it("labels the total as indicative until then", () => {
    const card = fs.readFileSync("src/components/studio-v3/SignaturePriceCard.tsx", "utf8");
    expect(card).toContain('partyConfirmed ? "Your day, resolved" : "Indicative, from"');
    expect(card).toContain("confirmed once you tell us your party size");
  });
});
