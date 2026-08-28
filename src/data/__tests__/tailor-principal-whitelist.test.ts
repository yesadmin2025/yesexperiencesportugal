import { describe, expect, it } from "vitest";

import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import {
  dedicatedLunchStopId,
  principalEligibleStopIds,
  principalRemovalCount,
} from "@/data/tailorRules";
import {
  TAILOR_CORE_STOP_PRICING,
  classEarnsPrincipalCredit,
  classifyTailorCoreStop,
  tailorStopsPendingOwnerReview,
} from "@/data/tailorStopPricing";
import {
  TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS,
  serverPrincipalRemovalCount,
} from "../../../supabase/functions/_shared/pricing";

describe("Tailor principal-removal whitelist", () => {
  it("client and server whitelists are byte-identical per Signature", () => {
    for (const tourId of Object.keys(TAILOR_BLUEPRINTS)) {
      const client = [...principalEligibleStopIds(tourId)].sort();
      const server = [...(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS[tourId] ?? [])].sort();
      expect(server, `server whitelist for ${tourId}`).toEqual(client);
    }
  });

  it("excludes locked anchors and the dedicated included lunch", () => {
    for (const [tourId, bp] of Object.entries(TAILOR_BLUEPRINTS)) {
      const eligible = principalEligibleStopIds(tourId);
      for (const stop of bp.core) {
        if (stop.lock) expect(eligible.has(stop.id)).toBe(false);
      }
      const lunchId = dedicatedLunchStopId(tourId);
      if (lunchId) expect(eligible.has(lunchId)).toBe(false);
    }
  });

  it("ignores invented ids (client + server)", () => {
    const ids = ["not-a-stop", "livramento", "🙂"];
    expect(principalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
    expect(serverPrincipalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
  });

  it("ignores duplicated ids (client + server)", () => {
    const ids = ["livramento", "livramento", "livramento"];
    expect(principalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
    expect(serverPrincipalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
  });

  it("locked anchors earn nothing", () => {
    expect(principalRemovalCount("arrabida-boat", ["boat-arrabida"])).toBe(0);
    expect(serverPrincipalRemovalCount("arrabida-boat", ["boat-arrabida"])).toBe(0);
    expect(principalRemovalCount("wild-beaches-picnic", ["hidden-cove"])).toBe(0);
    expect(serverPrincipalRemovalCount("wild-beaches-picnic", ["hidden-cove"])).toBe(0);
    expect(principalRemovalCount("troia-comporta", ["sado-ferry"])).toBe(0);
    expect(serverPrincipalRemovalCount("troia-comporta", ["sado-ferry"])).toBe(0);
  });

  it("counts genuine principal removals", () => {
    const ids = ["livramento", "azeitao-tiles"];
    expect(principalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(2);
    expect(serverPrincipalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(2);
  });

  it("descriptive / free viewpoints are removable for time but earn nothing", () => {
    for (const [tourId, stopId] of [
      ["arrabida-wine-allinclusive", "arrabida-park"],
      ["wild-beaches-picnic", "arrabida-drive"],
      ["arrabida-boat", "arrabida-drive"],
      ["sintra-cascais", "cabo-da-roca"],
      ["fatima-nazare-obidos", "nazare-beach"],
      ["roman-heritage-alentejo", "vila-alva"],
    ] as const) {
      expect(classifyTailorCoreStop(tourId, stopId)).toBe("descriptive");
      expect(principalEligibleStopIds(tourId).has(stopId)).toBe(false);
      expect(principalRemovalCount(tourId, [stopId]), `${tourId}/${stopId}`).toBe(0);
      expect(serverPrincipalRemovalCount(tourId, [stopId]), `${tourId}/${stopId}`).toBe(0);
      // still a real, removable stop in the blueprint (time only)
      const stop = TAILOR_BLUEPRINTS[tourId].core.find((s) => s.id === stopId);
      expect(stop?.lock).toBeUndefined();
    }
  });

  it("eligibility is the explicit classification, never merely `!lock`", () => {
    for (const [tourId, bp] of Object.entries(TAILOR_BLUEPRINTS)) {
      const eligible = principalEligibleStopIds(tourId);
      for (const stop of bp.core) {
        const pricing = classifyTailorCoreStop(tourId, stop.id, {
          dedicatedCreditStopId: dedicatedLunchStopId(tourId),
        });
        expect(pricing, `${tourId}/${stop.id} must be classified`).not.toBeNull();
        expect(eligible.has(stop.id)).toBe(classEarnsPrincipalCredit(pricing!));
      }
    }
  });

  it("every classified stop carries evidence", () => {
    for (const stops of Object.values(TAILOR_CORE_STOP_PRICING)) {
      for (const entry of Object.values(stops)) {
        expect(entry.evidence.length).toBeGreaterThan(10);
      }
    }
  });

  it("weak-evidence stops are reported for owner review, not silently repriced", () => {
    const pending = tailorStopsPendingOwnerReview();
    expect(pending.length).toBeGreaterThan(0);
    for (const item of pending) {
      // FAIL-CLOSED: removable for time, but earns nothing until classified
      // `principal` by the owner.
      expect(principalEligibleStopIds(item.tourId).has(item.stopId)).toBe(false);
    }
  });

  it("dedicated Arrábida lunch never counts as a principal removal", () => {
    const ids = ["lunch-azeitao", "livramento"];
    expect(principalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
    expect(serverPrincipalRemovalCount("arrabida-wine-allinclusive", ids)).toBe(1);
  });

  it("unknown tour earns no reduction", () => {
    expect(serverPrincipalRemovalCount("not-a-tour", ["livramento"])).toBe(0);
    expect(principalRemovalCount("not-a-tour", ["livramento"])).toBe(0);
  });
});

describe("winery choice pools without an approved supplement ladder", () => {
  it("only Arrábida Wine may scale wineries above its baseline", () => {
    for (const [tourId, bp] of Object.entries(TAILOR_BLUEPRINTS)) {
      if (!bp.choice) continue;
      const hasWinery = bp.choice.options.some((o) => o.category === "winery");
      if (!hasWinery) continue;
      if (tourId === "arrabida-wine-allinclusive") {
        expect(bp.choice.pickMin).toBe(2);
        expect(bp.choice.pickMax).toBe(4);
      } else {
        expect(bp.choice.pickMax, `${tourId} must be swap-only`).toBe(bp.choice.pickMin);
      }
    }
  });
});
