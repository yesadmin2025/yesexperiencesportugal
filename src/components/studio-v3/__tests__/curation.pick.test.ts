// Curation-pick regression: a range of (feeling × interest) inputs must land
// on tours coherent with the picked feeling, and MUST NOT default to
// `arrabida-wine-allinclusive` unless the feeling or top interest is
// genuinely wine-led. Reproduces the "everything ends in Arrábida" bug the
// user reported and locks the fix in.

import { describe, it, expect } from "vitest";
import { pickPrimaryTour } from "../curation";
import type { Feeling } from "../curation";

type Interest =
  | "wine"
  | "gastronomy"
  | "heritage"
  | "coast"
  | "local-life"
  | "nature"
  | "art"
  | "family";

const cases: Array<{
  feeling: Feeling;
  interests: readonly Interest[];
  expectNotArrabidaWine?: boolean;
  expectOneOf?: string[];
}> = [
  // Coastal / adventure / hidden should never land on the wine day.
  { feeling: "coastal", interests: ["coast"], expectNotArrabidaWine: true, expectOneOf: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta", "southwest-vicentine-coast"] },
  { feeling: "coastal", interests: ["coast", "nature"], expectNotArrabidaWine: true },
  { feeling: "coastal", interests: ["coast", "gastronomy"], expectNotArrabidaWine: true }, // gastronomy secondary should NOT flip to wine
  { feeling: "adventure", interests: ["nature", "coast"], expectNotArrabidaWine: true },
  { feeling: "adventure", interests: ["coast"], expectNotArrabidaWine: true },
  { feeling: "hidden", interests: ["nature"], expectNotArrabidaWine: true, expectOneOf: ["southwest-vicentine-coast", "wild-beaches-picnic", "arrabida-boat", "troia-comporta"] },
  { feeling: "hidden", interests: ["local-life"], expectNotArrabidaWine: true },

  // Culture should lead with heritage tours, never wine.
  { feeling: "culture", interests: ["heritage"], expectNotArrabidaWine: true, expectOneOf: ["tomar-coimbra", "tiles-workshop", "fatima-nazare-obidos", "sintra-cascais"] },
  { feeling: "culture", interests: ["heritage", "art"], expectNotArrabidaWine: true },
  { feeling: "culture", interests: ["heritage", "local-life"], expectNotArrabidaWine: true },

  // Romance is not automatically wine anymore — Sintra leads by default.
  { feeling: "romance", interests: ["coast"], expectNotArrabidaWine: true },
  { feeling: "romance", interests: ["heritage"], expectNotArrabidaWine: true },

  // Slow-luxury with heritage/coast should land on Sintra / Troia, not wine.
  { feeling: "slow-luxury", interests: ["heritage"], expectNotArrabidaWine: true },
  { feeling: "slow-luxury", interests: ["coast"], expectNotArrabidaWine: true },

  // Wine-led inputs — the wine tour is a legitimate result here.
  { feeling: "wine-food", interests: ["wine"] },
  { feeling: "wine-food", interests: ["gastronomy"] },
  { feeling: "slow-luxury", interests: ["wine"] }, // wine as TOP interest -> wine boost allowed
  { feeling: "romance", interests: ["wine"] },
];

describe("pickPrimaryTour — no unwanted Arrábida-wine bias", () => {
  it.each(cases)(
    "feeling=$feeling interests=$interests",
    ({ feeling, interests, expectNotArrabidaWine, expectOneOf }) => {
      const { tour } = pickPrimaryTour(
        feeling,
        "couple", // Companions
        interests as never,
        null, // pickup — none, so pickup affinity doesn't tilt the pick
        null, // destinationIntent
        0,
      );
      if (expectNotArrabidaWine) {
        expect(tour.id, `feeling=${feeling} interests=${interests.join(",")} unexpectedly picked arrabida-wine-allinclusive`).not.toBe(
          "arrabida-wine-allinclusive",
        );
      }
      if (expectOneOf) {
        expect(expectOneOf).toContain(tour.id);
      }
    },
  );

  it("Reshape seed varies the pick across top-band tours (coastal)", () => {
    const ids = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const { tour } = pickPrimaryTour("coastal", "couple", ["coast"] as never, null, null, seed);
      ids.add(tour.id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });
});
