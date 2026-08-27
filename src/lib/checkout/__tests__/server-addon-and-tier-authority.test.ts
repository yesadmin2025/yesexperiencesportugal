import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADD_ON_CATALOG,
  addOnEurFor,
  roundEur5,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import {
  SIGNATURE_ADD_ON_CATALOG,
  serverAddOnLine,
  serverRoundEur5,
} from "../../../../supabase/functions/_shared/pricing";

const CHECKOUT_FN = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-signature-checkout/index.ts"),
  "utf8",
);

describe("server add-on catalog parity", () => {
  const clientAddOns: SignatureAddOn[] = Object.values(ADD_ON_CATALOG).flat();

  it("mirrors every client add-on id, percentage and pricing unit", () => {
    for (const addOn of clientAddOns) {
      const server = SIGNATURE_ADD_ON_CATALOG[addOn.id];
      expect(server, `missing server entry for ${addOn.id}`).toBeTruthy();
      expect(server.pricePctOfBase).toBe(addOn.pricePctOfBase);
      expect(server.pricingUnit).toBe(addOn.pricingUnit);
    }
  });

  it("does not contain server-only add-ons the client never offers", () => {
    const clientIds = new Set(clientAddOns.map((a) => a.id));
    for (const id of Object.keys(SIGNATURE_ADD_ON_CATALOG)) {
      expect(clientIds.has(id), `server add-on ${id} has no client counterpart`).toBe(true);
    }
  });

  it("derives the same euro amount as the client price card", () => {
    const baseEur = 135;
    const guests = 3;
    for (const addOn of clientAddOns) {
      const client = addOnEurFor({ addOn, baseEur, guests });
      const server = serverAddOnLine(addOn.id, baseEur, guests);
      expect(server).toBeTruthy();
      expect(server!.perUnitEur).toBe(client.perUnit);
      expect(server!.perUnitEur * server!.quantity).toBe(client.amount);
    }
  });

  it("uses the same €5 rounding rule", () => {
    for (const eur of [1, 7, 12.4, 23.9, 137]) {
      expect(serverRoundEur5(eur)).toBe(roundEur5(eur));
    }
  });
});

describe("server add-on tamper resistance", () => {
  it("rejects add-on ids that are not in the approved catalog", () => {
    expect(serverAddOnLine("free-private-yacht", 135, 2)).toBeNull();
  });

  it("ignores any client-declared euro amount", () => {
    // Only id + anchor drive the price; there is no price input at all.
    expect(serverAddOnLine("coastal-boat-ride", 135, 2)!.perUnitEur).toBe(roundEur5(135 * 0.22));
  });

  it("never derives an add-on price from client input in the edge function", () => {
    expect(CHECKOUT_FN).not.toMatch(/unit_amount:\s*a\.priceEur\s*\*\s*100[\s\S]{0,120}body\.guests/);
    expect(CHECKOUT_FN).toContain("serverAddOnLine(a.id, approvedAnchorEur, body.guests)");
    expect(CHECKOUT_FN).toContain('tiers["8"]');
  });
});

describe("tier authority — no anchor fallback", () => {
  it("refuses checkout when no approved tier exists for the party size", () => {
    expect(CHECKOUT_FN).toContain("if (real == null) {");
    expect(CHECKOUT_FN).toContain("const resolvedPerPax = real;");
    expect(CHECKOUT_FN).not.toContain("real ?? body.priceFromEur");
  });
});
