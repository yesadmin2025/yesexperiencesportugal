import { describe, expect, it } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

import { FinalRevealStory } from "../FinalRevealStory";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { buildRevealNarrative } from "@/lib/studio-v3/revealNarrative";
import { regionLabelFor } from "../FinalRevealStory";

const ADD_ONS = [
  {
    id: "wine",
    label: "Private wine tasting",
    priceEur: 40,
    durationMinutes: 30,
    pricePctOfBase: 0.2,
    perUnit: 40,
    amount: 80,
    unit: "per_person" as const,
    unitLabel: "per guest",
  },
];

type Answers = Omit<
  Pick<StudioV3State, "feeling" | "interests" | "rhythm" | "destinationIntent" | "refinement">,
  "destinationIntent"
> & { destinationIntent: StudioV3State["destinationIntent"] | null };

const CASES: ReadonlyArray<{ name: string; answers: Answers }> = [
  {
    name: "wine-led Alentejo day",
    answers: {
      feeling: "wine-food",
      interests: ["wine", "heritage", "nature"],
      rhythm: "balanced",
      destinationIntent: "alentejo-evora-wine",
      refinement: null,
    },
  },
  {
    name: "coastal Arrábida day",
    answers: {
      feeling: "coastal",
      interests: ["coast", "nature"],
      rhythm: "slow",
      destinationIntent: "arrabida-setubal-azeitao",
      refinement: null,
    },
  },
];

function renderReveal(answers: Answers) {
  return render(
    <FinalRevealStory
      state={
        {
          ...INITIAL_STATE,
          ...answers,
          phase: "confirmation",
          guests: 2,
        } as StudioV3State
      }
      selectedAddOns={ADD_ONS}
      perPaxEur={207}
      totalEur={414}
      onContinue={() => {}}
      onSaveSignature={() => {}}
      onBack={() => {}}
    />,
  );
}

import { filterRevealSignals } from "../studioAcknowledgement";

function renderedSignals(): string[] {
  const list = screen.queryByTestId("studio-v3-final-reveal-signals");
  if (!list) return [];
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent?.trim() ?? "");
}

describe("FinalRevealStory — rendered signals match the reveal narrative module", () => {
  for (const testCase of CASES) {
    it(`renders exactly the genuinely new signals for the ${testCase.name}`, () => {
      const expected = buildRevealNarrative({
        ...testCase.answers,
        region: regionLabelFor(testCase.answers.destinationIntent),
        addOnLabels: ADD_ONS.map((a) => a.label),
      });

      renderReveal(testCase.answers);
      const rendered = renderedSignals();

      // P6 "acknowledge once": the reveal renders the narrative signals minus
      // every semantic theme the traveller already heard earlier in the flow.
      // Zero is valid: the editorial intro, facts and route already carry the
      // payoff, so repeated reasons are never restored merely to fill a list.
      const expectedShown = filterRevealSignals([...expected.signals], {
        state: {
          feeling: testCase.answers.feeling,
          interests: [...testCase.answers.interests],
          rhythm: testCase.answers.rhythm,
        },
        refinementShown: testCase.answers.refinement != null,
      });
      expect(rendered).toEqual(expectedShown);
      expect(rendered.length).toBeLessThanOrEqual(3);
      expect(new Set(rendered).size).toBe(rendered.length);
    });
  }

  it("still mirrors the module exactly when the traveller answered nothing", () => {
    const expected = buildRevealNarrative({
      feeling: null,
      interests: [],
      rhythm: null,
      destinationIntent: null,
      refinement: null,
      region: regionLabelFor(null),
      addOnLabels: ADD_ONS.map((a) => a.label),
    });

    renderReveal({
      feeling: null,
      interests: [],
      rhythm: null,
      destinationIntent: null,
      refinement: null,
    });

    if (expected.signals.length === 0) {
      expect(screen.queryByTestId("studio-v3-final-reveal-signals")).toBeNull();
    } else {
      expect(renderedSignals()).toEqual([...expected.signals]);
    }
  });

  it("keeps the rendered signals stable across repeated mounts of the same answers", () => {
    const read = () => {
      renderReveal(CASES[0].answers);
      const rendered = renderedSignals();
      cleanup();
      return rendered;
    };

    const first = read();
    expect(read()).toEqual(first);
    expect(read()).toEqual(first);
  });
});
