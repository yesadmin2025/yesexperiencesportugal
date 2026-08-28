import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADD_ON_CATALOG,
  addOnEurFor,
  roundEur5,
  isAddOnStructurallyEligible,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import { signatureTours } from "@/data/signatureTours";
import {
  SIGNATURE_ADD_ON_CATALOG,
  SIGNATURE_ADD_ON_ALLOWED_TOURS,
  serverAddOnAllowedForTour,
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

describe("server add-on structural eligibility", () => {
  it("mirrors the client structural rules for every add-on and Signature", () => {
    for (const addOn of Object.values(ADD_ON_CATALOG).flat()) {
      const clientAllowed = signatureTours
        .filter((t) => isAddOnStructurallyEligible(addOn, t))
        .map((t) => t.id)
        .sort();
      const serverAllowed = [...(SIGNATURE_ADD_ON_ALLOWED_TOURS[addOn.id] ?? [])].sort();
      expect(serverAllowed, `whitelist drift for ${addOn.id}`).toEqual(clientAllowed);
      for (const tour of signatureTours) {
        expect(
          serverAddOnAllowedForTour(addOn.id, tour.id),
          `${addOn.id} @ ${tour.id}`,
        ).toBe(isAddOnStructurallyEligible(addOn, tour));
      }
    }
  });

  it("rejects a known add-on from the wrong region bucket", () => {
    // Centro add-on offered on an Arrábida Signature.
    expect(serverAddOnAllowedForTour("obidos-walls", "arrabida-wine-allinclusive")).toBe(false);
  });

  it("rejects a known add-on from the wrong Lisbon sub-region", () => {
    // Arrábida (south of the Tejo) add-on on the Sintra/Cascais Signature.
    expect(serverAddOnAllowedForTour("coastal-boat-ride", "sintra-cascais")).toBe(false);
    expect(serverAddOnAllowedForTour("azulejo-workshop", "sintra-cascais")).toBe(false);
  });

  it("rejects an add-on whose sourceTourId is the base Signature itself", () => {
    expect(serverAddOnAllowedForTour("azeitao-cheese", "azeitao-cheese")).toBe(false);
    expect(serverAddOnAllowedForTour("roman-troia", "troia-comporta")).toBe(false);
  });

  it("rejects an add-on conflicting with a product the Signature already includes", () => {
    // The Arrábida wine Signature already delivers wine tasting + lunch.
    expect(serverAddOnAllowedForTour("hidden-cove-picnic", "arrabida-wine-allinclusive")).toBe(
      false,
    );
    const talha = Object.values(ADD_ON_CATALOG)
      .flat()
      .find((a) => a.id === "talha-amphora")!;
    expect(talha.conflictsWith).toContain("wine-tasting");
    expect(serverAddOnAllowedForTour("talha-amphora", "evora-alentejo")).toBe(false);
  });

  it("keeps at least one genuine cross-Signature add-on allowed and priced unchanged", () => {
    expect(serverAddOnAllowedForTour("coastal-boat-ride", "arrabida-wine-allinclusive")).toBe(true);
    const line = serverAddOnLine("coastal-boat-ride", 135, 3)!;
    expect(line.perUnitEur).toBe(roundEur5(135 * 0.22));
    expect(line.quantity).toBe(3);
    expect(line.label).toBe("Coastal boat ride from Sesimbra");
  });

  it("exposes currently dormant add-ons rather than inventing eligibility", () => {
    for (const id of ["hidden-cove-picnic", "sintra-detour", "roman-troia", "herdade-tasting"]) {
      expect(SIGNATURE_ADD_ON_ALLOWED_TOURS[id]).toEqual([]);
      for (const tour of signatureTours) {
        expect(serverAddOnAllowedForTour(id, tour.id)).toBe(false);
      }
    }
  });

  it("rejects unknown ids structurally too", () => {
    expect(serverAddOnAllowedForTour("free-private-yacht", "arrabida-wine-allinclusive")).toBe(
      false,
    );
  });

  it("fails the checkout request before Stripe for a structurally invalid add-on", () => {
    expect(CHECKOUT_FN).toContain("serverAddOnAllowedForTour(a.id, body.tourId)");
    expect(CHECKOUT_FN).toContain("invalid_add_on_for_tour:");
    const gateIdx = CHECKOUT_FN.indexOf("invalid_add_on_for_tour:");
    const stripeIdx = CHECKOUT_FN.indexOf("line_items: [...tourLineItems");
    expect(gateIdx).toBeGreaterThan(0);
    expect(gateIdx).toBeLessThan(stripeIdx);
  });
});

describe("winery add-on customer copy stays generic", () => {
  const NAMED_SUPPLIERS =
    /herdade da comporta|jos[eé] maria da fonseca|quinta do piloto|catralvos|bacalh[oô]a|cartuxa|ervideira|mestre daniel/i;

  it("never names a winery supplier in client add-on labels or blurbs", () => {
    for (const addOn of Object.values(ADD_ON_CATALOG).flat()) {
      expect(`${addOn.label} ${addOn.blurb}`).not.toMatch(NAMED_SUPPLIERS);
    }
  });

  it("never names a winery supplier in server add-on labels", () => {
    for (const entry of Object.values(SIGNATURE_ADD_ON_CATALOG)) {
      expect(entry.label).not.toMatch(NAMED_SUPPLIERS);
    }
  });

  it("keeps the winery add-on id, unit, percentage and duration unchanged", () => {
    const client = Object.values(ADD_ON_CATALOG)
      .flat()
      .find((a) => a.id === "herdade-tasting")!;
    expect(client.sourceTourId).toBe("troia-comporta");
    expect(client.pricePctOfBase).toBe(0.2);
    expect(client.pricingUnit).toBe("per_person");
    expect(client.durationMinutes).toBe(75);
    expect(SIGNATURE_ADD_ON_CATALOG["herdade-tasting"].pricePctOfBase).toBe(0.2);
    expect(SIGNATURE_ADD_ON_CATALOG["herdade-tasting"].durationMinutes).toBe(75);
  });
});
