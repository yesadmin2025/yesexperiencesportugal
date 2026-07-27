/**
 * Tailor rules — canonical entitlements (Signature Bible v1.1).
 *
 * Locks the two authorized levers: "add lunch" (+€35 pp, only where lunch
 * is genuinely excluded) and the Setúbal & Arrábida winery ladder
 * (+€20 pp, max 4, the 4th requiring a stop removal).
 */

import { describe, expect, it } from "vitest";
import { tailorFinalPerPax } from "@/config/pricing";
import {
  canSelectWineries,
  lunchSupplementEur,
  tailorRules,
  tailorSupplementsEur,
  winerySupplementEur,
} from "@/data/tailorRules";

describe("tailor rules", () => {
  it("offers lunch only where the canonical product excludes it", () => {
    expect(lunchSupplementEur("troia-comporta")).toBe(35);
    expect(lunchSupplementEur("sintra-cascais")).toBe(35);
    // Picnic IS the lunch; the Roman tour includes a winery lunch; the
    // Setúbal & Arrábida wine day already includes lunch.
    expect(lunchSupplementEur("wild-beaches-picnic")).toBe(0);
    expect(lunchSupplementEur("roman-heritage-alentejo")).toBe(0);
    expect(lunchSupplementEur("arrabida-wine-allinclusive")).toBe(0);
  });

  it("prices extra wineries at €20 pp above the 2 included, capped at 4", () => {
    expect(winerySupplementEur("arrabida-wine-allinclusive", 2)).toBe(0);
    expect(winerySupplementEur("arrabida-wine-allinclusive", 3)).toBe(20);
    expect(winerySupplementEur("arrabida-wine-allinclusive", 4)).toBe(40);
    expect(winerySupplementEur("arrabida-wine-allinclusive", 9)).toBe(40);
    // No winery ladder on other Signatures.
    expect(winerySupplementEur("evora-alentejo", 4)).toBe(0);
  });

  it("gates the 4th winery behind removing another stop", () => {
    expect(canSelectWineries("arrabida-wine-allinclusive", 3, 0).allowed).toBe(true);
    const gated = canSelectWineries("arrabida-wine-allinclusive", 4, 0);
    expect(gated.allowed).toBe(false);
    expect(gated.allowed === false && gated.code).toBe("needs-removal");
    expect(canSelectWineries("arrabida-wine-allinclusive", 4, 1).allowed).toBe(true);
    const over = canSelectWineries("arrabida-wine-allinclusive", 5, 2);
    expect(over.allowed === false && over.code).toBe("max-reached");
  });

  it("supplements are flat and never scaled by the removal reduction", () => {
    const direct = 200;
    const supplements = tailorSupplementsEur("arrabida-wine-allinclusive", {
      wineriesSelected: 4,
    });
    expect(supplements).toBe(40);
    // 1 stop removed → −5% on the base only, then +€40 flat.
    expect(tailorFinalPerPax(direct, 1, supplements)).toBe(Math.round(direct * 0.95) + 40);
  });

  it("every Signature allows stop removal", () => {
    for (const id of [
      "troia-comporta",
      "roman-heritage-alentejo",
      "wild-beaches-picnic",
      "arrabida-wine-allinclusive",
    ]) {
      expect(tailorRules(id).allowRemoveStop).toBe(true);
    }
  });
});
