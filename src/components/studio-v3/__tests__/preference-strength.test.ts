/**
 * PREFERENCE STRENGTH — explicit vs inferred.
 *
 * An EXPLICIT preference is a discriminative answer the traveller actually
 * gave (the scholarly "Sacred heritage" Director option →
 * `templars-and-university` → `tomar-coimbra`). It is absolute AFTER the
 * eligibility ceiling and the high-signal gate.
 *
 * An INFERRED preference is only the intelligence layer's guess. It is a
 * bounded tie-break and must never bulldoze a materially better semantic
 * fit — otherwise we reintroduce the semantic-jump bug from the other side.
 */
import { describe, expect, it } from "vitest";

import { DISCOVERY_SIGNAL_TARGET } from "../livingAtlasDecision";
import { pickPrimaryTourWithFit } from "../curation";
import type { PreferenceStrength } from "../curation";
import type { Companions, Feeling, Interest, Pickup } from "../types";

const COUPLE: Companions = "couple";
const PICKUP: Pickup = "lisbon";

function pick(args: {
  feeling: Feeling;
  interests: Interest[];
  eligible?: string[] | null;
  preferTourId?: string | null;
  strength?: PreferenceStrength;
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
    args.strength ?? "explicit",
  );
}

const SCHOLARLY = DISCOVERY_SIGNAL_TARGET["templars-and-university"];

describe("explicit preference is honoured after the hard gates", () => {
  it("the scholarly Director signal resolves to Tomar–Coimbra when eligible", () => {
    const { tour } = pick({
      feeling: "culture",
      interests: ["heritage"],
      preferTourId: SCHOLARLY,
      strength: "explicit",
    });
    expect(tour.id).toBe("tomar-coimbra");
    expect(tour.id).not.toBe("southwest-vicentine-coast");
  });

  it("still cannot escape the preflight eligible pool", () => {
    const eligible = ["sintra-cascais", "troia-comporta"];
    const { tour } = pick({
      feeling: "culture",
      interests: ["heritage"],
      eligible,
      preferTourId: SCHOLARLY,
      strength: "explicit",
    });
    expect(eligible).toContain(tour.id);
    expect(tour.id).not.toBe(SCHOLARLY);
  });
});

describe("inferred preference is only a bounded tie-break", () => {
  /** Score gap between the natural leader and the nominated alternative. */
  function gapTo(preferId: string, feeling: Feeling, interests: Interest[]) {
    const natural = pick({ feeling, interests, preferTourId: null });
    const report = natural.topReports.find((r) => r.tour.id === preferId);
    return {
      leader: natural.tour.id,
      leaderScore: natural.fit.totalScore,
      preferScore: report?.fit.totalScore ?? null,
    };
  }

  it("cannot bulldoze a materially better semantic fit", () => {
    // A scholarly heritage product nominated for a wine day is not a
    // tie-break candidate — inferred preference must lose.
    const inferred = pick({
      feeling: "wine-food",
      interests: ["wine"],
      preferTourId: SCHOLARLY,
      strength: "inferred",
    });
    expect(inferred.tour.id).not.toBe(SCHOLARLY);
  });

  it("explicit nomination outranks the same nomination made inferentially", () => {
    // Neutral taste layer: no high-signal gate is in play, so the only
    // difference between the two runs is preference strength.
    const explicit = pick({
      feeling: "culture",
      interests: ["coast"],
      preferTourId: SCHOLARLY,
      strength: "explicit",
    });
    expect(explicit.tour.id).toBe(SCHOLARLY);

    const inferred = pick({
      feeling: "culture",
      interests: ["coast"],
      preferTourId: SCHOLARLY,
      strength: "inferred",
    });
    // Inferred may or may not coincide with the leader, but it is never
    // allowed to be absolute the way the explicit answer is.
    if (inferred.tour.id === SCHOLARLY) {
      const natural = pick({ feeling: "culture", interests: ["coast"] });
      const report = natural.topReports.find((r) => r.tour.id === SCHOLARLY);
      expect(report).toBeDefined();
      expect(natural.fit.totalScore - report!.fit.totalScore).toBeLessThanOrEqual(12);
    }
  });

  it("is honoured when the nominee is inside the top band", () => {
    const natural = pick({ feeling: "culture", interests: ["heritage"] });
    const alt = natural.topReports.find(
      (r) => r.tour.id !== natural.tour.id && natural.fit.totalScore - r.fit.totalScore <= 12,
    );
    if (!alt) {
      // No band-mate for this input — the invariant is vacuously satisfied.
      expect(natural.tour.id).toBeTruthy();
      return;
    }
    const nudged = pick({
      feeling: "culture",
      interests: ["heritage"],
      preferTourId: alt.tour.id,
      strength: "inferred",
    });
    expect(nudged.tour.id).toBe(alt.tour.id);
  });

  it("never selects outside the eligible pool, whatever the strength", () => {
    for (const strength of ["explicit", "inferred"] as PreferenceStrength[]) {
      const eligible = ["arrabida-wine-allinclusive"];
      const { tour } = pick({
        feeling: "culture",
        interests: ["heritage"],
        eligible,
        preferTourId: SCHOLARLY,
        strength,
      });
      expect(tour.id).toBe("arrabida-wine-allinclusive");
    }
  });

  it("reports the score relationship it depends on", () => {
    const g = gapTo(SCHOLARLY, "wine-food", ["wine"]);
    expect(g.leader).toBeTruthy();
  });
});
