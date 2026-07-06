// Studio V3 — destination intent (soft additive scoring) tests.
//
// destinationIntent is an OPTIONAL signal captured between Feeling and
// Companions. It must be strong enough to overcome Lisbon-pickup bias for
// inland/central/spiritual/Comporta choices, AND it must not break:
//   - route containment (every routePoint exists in the resolved tour)
//   - "no-preference" behaviour (essentially unchanged vs. omitting it)
//   - the no-invention rule (skeletons must remain real)

import { describe, it, expect } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { findTour, signatureTours } from "@/data/signatureTours";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import type {
  Companions,
  DestinationIntent,
  Feeling,
  Interest,
  Pickup,
  Rhythm,
} from "@/components/studio-v3/types";

function resolve(opts: {
  feeling: Feeling;
  interests: Interest[];
  destinationIntent: DestinationIntent;
  pickup?: Pickup;
  companions?: Companions;
  rhythm?: Rhythm;
}) {
  return resolveStudioV3Route({
    feeling: opts.feeling,
    companions: opts.companions ?? "couple",
    rhythm: opts.rhythm ?? "balanced",
    interests: opts.interests,
    pickup: opts.pickup ?? "lisbon",
    destinationIntent: opts.destinationIntent,
  });
}

describe("destinationIntent — soft additive scoring", () => {
  it("no-preference leaves Lisbon-pickup behaviour essentially stable", () => {
    const withNone = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
      destinationIntent: "no-preference",
    });
    const without = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
    });
    expect(withNone.skeletonTourKey).toBe(without.skeletonTourKey);
  });

  it("Lisbon pickup + Alentejo intent + wine selects evora-alentejo", () => {
    const r = resolve({
      feeling: "wine-food",
      interests: ["wine", "heritage"],
      destinationIntent: "alentejo-evora-wine",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("evora-alentejo");
  });

  it("Lisbon pickup + Central Portugal intent + culture selects tomar-coimbra", () => {
    const r = resolve({
      feeling: "culture",
      interests: ["heritage"],
      destinationIntent: "central-portugal",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("tomar-coimbra");
  });

  it("Lisbon pickup + spiritual coast intent selects fatima-nazare-obidos", () => {
    const r = resolve({
      feeling: "culture",
      interests: ["heritage"],
      destinationIntent: "spiritual-coast",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("fatima-nazare-obidos");
  });

  it("Lisbon pickup + Comporta intent selects troia-comporta", () => {
    const r = resolve({
      feeling: "coastal",
      interests: ["coast"],
      destinationIntent: "comporta-troia",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("troia-comporta");
  });

  it("Lisbon pickup + Arrábida intent still resolves an Arrábida-cluster skeleton", () => {
    const r = resolve({
      feeling: "wine-food",
      interests: ["wine"],
      destinationIntent: "arrabida-setubal-azeitao",
      pickup: "lisbon",
    });
    expect([
      "arrabida-wine-allinclusive",
      "arrabida-boat",
      "wild-beaches-picnic",
      "azeitao-cheese",
      "tiles-workshop",
    ]).toContain(r.skeletonTourKey);
  });

  it("Lisbon pickup + talha intent selects the Roman Alentejo talha tour", () => {
    const r = resolve({
      feeling: "wine-food",
      interests: ["wine", "heritage"],
      destinationIntent: "alentejo-roman-talha",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("roman-heritage-alentejo");
  });

  it("Lisbon pickup + Vicentine intent selects the southwest Vicentine coast", () => {
    const r = resolve({
      feeling: "hidden",
      interests: ["coast", "nature"],
      destinationIntent: "vicentine-coast",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("southwest-vicentine-coast");
  });

  it("without a fixed destination, wine + heritage can discover talha instead of defaulting Arrábida", () => {
    const r = resolve({
      feeling: "hidden",
      interests: ["wine", "heritage"],
      destinationIntent: "no-preference",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("roman-heritage-alentejo");
  });

  it("without a fixed destination, coast + nature can discover the Vicentine coast instead of Sintra", () => {
    const r = resolve({
      feeling: "adventure",
      interests: ["coast", "nature"],
      destinationIntent: "no-preference",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("southwest-vicentine-coast");
  });

  it("without a fixed destination, slow coastal romance can discover Tróia and Comporta", () => {
    const r = resolve({
      feeling: "slow-luxury",
      interests: ["coast", "gastronomy"],
      destinationIntent: "no-preference",
      pickup: "lisbon",
    });
    expect(r.skeletonTourKey).toBe("troia-comporta");
  });

  it("route containment holds across all destination intents", () => {
    const intents: DestinationIntent[] = [
      "no-preference",
      "lisbon-sintra-cascais",
      "arrabida-setubal-azeitao",
      "alentejo-evora-wine",
      "alentejo-roman-talha",
      "vicentine-coast",
      "spiritual-coast",
      "central-portugal",
      "comporta-troia",
      "anywhere-special",
    ];
    const norm = (s: string) => s.trim().toLowerCase();
    const allowed = new Set<string>([
      ...signatureTours.flatMap((t) => t.stops.map((s) => norm(s.label))),
      ...REGION_STOP_POOL.filter((s) => s.active).map((s) => norm(s.name)),
    ]);
    for (const di of intents) {
      const r = resolve({
        feeling: "culture",
        interests: ["heritage"],
        destinationIntent: di,
        pickup: "lisbon",
      });
      if (!r.skeletonTourKey) continue;
      expect(findTour(r.skeletonTourKey)).toBeTruthy();
      for (const p of r.routePoints) {
        expect(allowed.has(norm(p.label))).toBe(true);
      }
    }
  });
});
