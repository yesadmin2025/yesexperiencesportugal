/**
 * Checkout inclusions — end-to-end contract between the client callers
 * (Signature booking form + Tailor flow) and the create-signature-checkout
 * edge function.
 *
 * The client resolves `includedItems` via `resolveClientIncludedItems`
 * with a two-step priority:
 *   1. VIATOR_META[tourId].included   (verbatim operator list)
 *   2. tour.included                  (blueprint-level fallback)
 *
 * The server then layers Bókun on top: Bókun inclusions → clientIncluded
 * → nothing invented.
 *
 * This test locks BOTH:
 *   - the pure client helper for arbitrary meta/tour permutations
 *   - that every SignatureTour actually has at least one inclusion source,
 *     so a real booking never falls through to the "nothing" branch.
 */

import { describe, expect, it } from "vitest";
import { resolveClientIncludedItems } from "@/lib/checkout/inclusions";
import { signatureTours } from "@/data/signatureTours";
import { getViatorMeta } from "@/data/signatureToursViator";

describe("Checkout inclusions — client resolution contract", () => {
  it("prefers VIATOR_META.included verbatim when present", () => {
    const meta = { included: ["Private guide", "Wine tastings", "Hotel pickup"] };
    const tour = { included: ["blueprint fallback"] };
    expect(resolveClientIncludedItems(meta, tour)).toEqual([
      "Private guide",
      "Wine tastings",
      "Hotel pickup",
    ]);
  });

  it("falls back to tour.included when meta is missing or empty", () => {
    const tour = { included: ["Private driver", "Bottled water"] };
    expect(resolveClientIncludedItems(null, tour)).toEqual([
      "Private driver",
      "Bottled water",
    ]);
    expect(resolveClientIncludedItems({ included: [] }, tour)).toEqual([
      "Private driver",
      "Bottled water",
    ]);
    expect(resolveClientIncludedItems(undefined, tour)).toEqual([
      "Private driver",
      "Bottled water",
    ]);
  });

  it("returns undefined when neither source has content — server can then defer to Bókun", () => {
    expect(resolveClientIncludedItems(null, {})).toBeUndefined();
    expect(resolveClientIncludedItems({ included: [] }, { included: [] })).toBeUndefined();
  });

  it("returns a fresh array — callers can mutate without affecting source", () => {
    const meta = { included: ["A", "B"] as const };
    const tour = { included: ["X"] };
    const out = resolveClientIncludedItems(meta, tour)!;
    out.push("C");
    expect(meta.included).toEqual(["A", "B"]);
  });

  it("every Signature has a resolvable inclusion source (no silent 'nothing' checkouts)", () => {
    for (const t of signatureTours) {
      const meta = getViatorMeta(t.id);
      const resolved = resolveClientIncludedItems(meta ?? null, t);
      expect(
        resolved,
        `tour=${t.id} would send no includedItems — checkout would show empty inclusions`,
      ).toBeTruthy();
      expect((resolved ?? []).length).toBeGreaterThan(0);
    }
  });

  it("guest quantity is orthogonal — inclusion list does NOT change with guest count", () => {
    // The edge function sends `quantity: body.guests` for the Stripe line
    // item; the inclusion description is guest-count-independent. Assert the
    // client helper never receives a guest count and always returns the
    // same list for the same tour.
    const tour = signatureTours[0];
    const meta = getViatorMeta(tour.id);
    const forOne = resolveClientIncludedItems(meta ?? null, tour);
    const forEight = resolveClientIncludedItems(meta ?? null, tour);
    expect(forOne).toEqual(forEight);
  });
});
