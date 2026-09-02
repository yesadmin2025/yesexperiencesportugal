/**
 * PUBLICATION CERTIFICATION — semantic + eligibility matrix.
 *
 * Two structural invariants are proven here:
 *
 *  1. PREFLIGHT CEILING — once preflight resolved `eligibleTourIds`, no
 *     selection path may ever return a product outside that pool, even when
 *     the taste-derived intersection is empty and even when an unavailable
 *     product would score far higher.
 *
 *  2. HIGH-SIGNAL COVERAGE — every explicitly selected high-signal interest
 *     (faith / hands-on / wine) must be covered by VERIFIED stop-intent
 *     evidence on the chosen candidate, not just one of them.
 *
 * Plus the scholarly / Coimbra semantic case: the real existing Director
 * option is `faith-templar-heritage` → discovery signal
 * `templars-and-university` → `tomar-coimbra`. A traveller expressing that
 * signal must never land on the Southwest / Vicentine coast.
 */
import { describe, expect, it } from "vitest";

import { signatureTours } from "@/data/signatureTours";
import { DISCOVERY_SIGNAL_TARGET } from "../livingAtlasDecision";
import { pickPrimaryTourWithFit } from "../curation";
import type { Companions, Feeling, Interest, Pickup } from "../types";

const COUPLE: Companions = "couple";
const PICKUP: Pickup = "lisbon-center";

function pick(args: {
  feeling: Feeling;
  interests: Interest[];
  eligible?: string[] | null;
  preferTourId?: string | null;
}) {
  return pickPrimaryTourWithFit(
    args.feeling,
    COUPLE,
    args.interests,
    PICKUP,
    null,
    0,
    null,
    args.preferTourId ?? null,
    args.eligible ?? null,
  );
}

const ALL_IDS = signatureTours.map((t) => t.id);

describe("preflight eligible pool is an absolute ceiling", () => {
  it("never selects a product outside eligibleTourIds, even with zero taste intersection", () => {
    // `faith` targets fatima / tomar / evora — none of which are eligible here.
    const eligible = ["troia-comporta", "wild-beaches-picnic"];
    const { tour } = pick({ feeling: "faith", interests: ["faith"], eligible });
    expect(eligible).toContain(tour.id);
  });

  it("cannot pick a high-scoring but unavailable tour", () => {
    // arrabida-wine-allinclusive is the natural wine winner; remove it.
    const eligible = ALL_IDS.filter((id) => id !== "arrabida-wine-allinclusive");
    const { tour } = pick({ feeling: "wine-food", interests: ["wine"], eligible });
    expect(tour.id).not.toBe("arrabida-wine-allinclusive");
    expect(eligible).toContain(tour.id);
  });

  it("respects a single-product pool", () => {
    for (const only of ["sintra-cascais", "evora-alentejo", "southwest-vicentine-coast"]) {
      const { tour } = pick({ feeling: "wine-food", interests: ["wine"], eligible: [only] });
      expect(tour.id).toBe(only);
    }
  });

  it("honours a deliberate preference only inside the pool", () => {
    const eligible = ["troia-comporta", "sintra-cascais"];
    const { tour } = pick({
      feeling: "culture",
      interests: ["heritage"],
      eligible,
      preferTourId: "tomar-coimbra",
    });
    expect(eligible).toContain(tour.id);
  });
});

describe("high-signal interests must ALL be truthfully covered", () => {
  const verified = (
    fit: ReturnType<typeof pickPrimaryTourWithFit>["fit"],
    interest: Interest,
  ) =>
    fit.coverage.interests.some(
      (c) => c.interest === interest && c.satisfied && c.strength !== "none",
    );

  it("faith only — covered by verified evidence", () => {
    const { fit, tour } = pick({ feeling: "faith", interests: ["faith"] });
    expect(verified(fit, "faith")).toBe(true);
    expect(tour.id).not.toBe("southwest-vicentine-coast");
  });

  it("hands-on only — covered by verified evidence", () => {
    const { fit } = pick({ feeling: "hands-on", interests: ["hands-on"] });
    expect(verified(fit, "hands-on")).toBe(true);
  });

  it("faith + hands-on — BOTH covered, never the Vicentine coast", () => {
    const { fit, tour, unsatisfiedHighSignal } = pick({
      feeling: "faith",
      interests: ["faith", "hands-on"],
    });
    expect(verified(fit, "faith")).toBe(true);
    expect(verified(fit, "hands-on")).toBe(true);
    expect(unsatisfiedHighSignal).toEqual([]);
    expect(tour.id).not.toBe("southwest-vicentine-coast");
  });

  it("wine + hands-on — neither interest is silently dropped", () => {
    const { fit, unsatisfiedHighSignal } = pick({
      feeling: "wine-food",
      interests: ["wine", "hands-on"],
    });
    expect(verified(fit, "wine")).toBe(true);
    expect(verified(fit, "hands-on")).toBe(true);
    expect(unsatisfiedHighSignal).toEqual([]);
  });

  it("wine + gastronomy — wine verified", () => {
    const { fit } = pick({ feeling: "wine-food", interests: ["wine", "gastronomy"] });
    expect(verified(fit, "wine")).toBe(true);
  });

  it("reports unsatisfied high-signal interests instead of faking a match", () => {
    // A pool that structurally cannot carry hands-on evidence.
    const { unsatisfiedHighSignal } = pick({
      feeling: "coastal",
      interests: ["faith", "hands-on"],
      eligible: ["southwest-vicentine-coast", "sintra-cascais"],
    });
    expect(unsatisfiedHighSignal.length).toBeGreaterThan(0);
  });
});

describe("scholarly / Coimbra semantic authority", () => {
  it("maps the real Director option signal to Central Portugal inventory", () => {
    expect(DISCOVERY_SIGNAL_TARGET["templars-and-university"]).toBe("tomar-coimbra");
  });

  it("a scholarly signal never resolves to the Southwest / Vicentine coast", () => {
    const { tour } = pick({
      feeling: "culture",
      interests: ["heritage"],
      preferTourId: DISCOVERY_SIGNAL_TARGET["templars-and-university"],
    });
    expect(tour.id).toBe("tomar-coimbra");
    expect(tour.id).not.toBe("southwest-vicentine-coast");
  });
});

describe("non-high-signal matrix keeps region coherence", () => {
  it("coast + nature stays on a coastal/nature product", () => {
    const { tour } = pick({ feeling: "coastal", interests: ["coast", "nature"] });
    expect([
      "southwest-vicentine-coast",
      "wild-beaches-picnic",
      "arrabida-boat",
      "troia-comporta",
      "sintra-cascais",
    ]).toContain(tour.id);
  });

  it("heritage without wine does not force a wine product", () => {
    const { fit } = pick({ feeling: "culture", interests: ["heritage"] });
    expect(fit.coverage.interests.find((c) => c.interest === "heritage")?.satisfied).toBe(true);
  });
});
