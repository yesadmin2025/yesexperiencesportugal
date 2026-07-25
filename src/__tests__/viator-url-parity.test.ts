/**
 * Viator URL parity guardrail.
 *
 * Every place that stores a per-tour Viator URL must agree with
 * `CANONICAL_VIATOR_URLS`. This prevents drift between:
 *   - `CANONICAL_VIATOR_URLS[id]`                       (registry)
 *   - `SIGNATURE_SOURCE_OF_TRUTH[id].viatorUrl`         (SoT payload)
 *   - `VIATOR_META[id].viatorUrl`                       (legacy meta)
 *   - `signatureTours.find(t => t.id === id).bookingUrl` (blueprint)
 *
 * If a URL needs to change, edit `CANONICAL_VIATOR_URLS` + SoT together
 * and let this test push the update through every other surface.
 */
import { describe, it, expect } from "vitest";
import {
  CANONICAL_VIATOR_URLS,
  SIGNATURE_SOURCE_OF_TRUTH,
  canonicalViatorUrl,
} from "@/data/signatureToursSourceOfTruth";
import { VIATOR_META } from "@/data/signatureToursViator";
import { signatureTours } from "@/data/signatureTours";

const canonicalIds = Object.keys(CANONICAL_VIATOR_URLS);

describe("Viator URL parity across surfaces", () => {
  it("has a canonical URL for every SoT entry", () => {
    for (const id of Object.keys(SIGNATURE_SOURCE_OF_TRUTH)) {
      expect(CANONICAL_VIATOR_URLS[id], `missing canonical URL for "${id}"`)
        .toBeDefined();
    }
  });

  it("SoT.viatorUrl matches CANONICAL_VIATOR_URLS", () => {
    for (const id of canonicalIds) {
      const sot = SIGNATURE_SOURCE_OF_TRUTH[id];
      if (!sot) continue;
      expect(sot.viatorUrl, `SoT "${id}"`).toBe(CANONICAL_VIATOR_URLS[id]);
    }
  });

  it("VIATOR_META.viatorUrl matches CANONICAL_VIATOR_URLS", () => {
    for (const id of canonicalIds) {
      const meta = VIATOR_META[id];
      expect(meta, `VIATOR_META missing for "${id}"`).toBeDefined();
      expect(meta!.viatorUrl, `VIATOR_META "${id}"`).toBe(
        CANONICAL_VIATOR_URLS[id],
      );
    }
  });

  it("any viator.com bookingUrl in signatureTours matches CANONICAL_VIATOR_URLS", () => {
    // `bookingUrl` is polymorphic — some tours link to our own /tour/…
    // landing, others deep-link to Viator. When it IS a viator.com URL,
    // it must equal the canonical one for that tour id.
    for (const id of canonicalIds) {
      const t = signatureTours.find((row) => row.id === id) as
        | { id: string; bookingUrl?: string }
        | undefined;
      if (!t?.bookingUrl) continue;
      if (!/^https?:\/\/(www\.)?viator\.com\//i.test(t.bookingUrl)) continue;
      expect(t.bookingUrl, `signatureTours "${id}".bookingUrl`).toBe(
        CANONICAL_VIATOR_URLS[id],
      );
    }
  });

  it("canonicalViatorUrl() returns the same URL for every id", () => {
    for (const id of canonicalIds) {
      expect(canonicalViatorUrl(id), `resolver "${id}"`).toBe(
        CANONICAL_VIATOR_URLS[id],
      );
    }
    expect(canonicalViatorUrl("does-not-exist")).toBeUndefined();
  });
});
