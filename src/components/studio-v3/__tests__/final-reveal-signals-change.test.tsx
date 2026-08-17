import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { FinalRevealStory, regionLabelFor } from "../FinalRevealStory";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { buildRevealNarrative } from "@/lib/studio-v3/revealNarrative";
import { EXPERIENCE_DIMENSIONS } from "../livingAtlasTaxonomy";

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

type Answers = Pick<StudioV3State, "feeling" | "interests" | "rhythm" | "refinement"> & {
  destinationIntent: StudioV3State["destinationIntent"] | null;
};

const SEQUENCE: ReadonlyArray<{ name: string; answers: Answers }> = [
  {
    name: "wine-led Alentejo",
    answers: {
      feeling: "wine-food",
      interests: ["wine", "heritage", "nature"],
      rhythm: "balanced",
      destinationIntent: "alentejo-evora-wine",
      refinement: null,
    },
  },
  {
    name: "coastal Arrábida",
    answers: {
      feeling: "coastal",
      interests: ["coast", "nature"],
      rhythm: "slow",
      destinationIntent: "arrabida-setubal-azeitao",
      refinement: null,
    },
  },
  {
    name: "culture-led, fuller day",
    answers: {
      feeling: "culture",
      interests: ["heritage", "local-life"],
      rhythm: "immersive",
      destinationIntent: null,
      refinement: null,
    },
  },
];

function element(answers: Answers) {
  return (
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
    />
  );
}

function readSignals(): string[] {
  const list = screen.queryByTestId("studio-v3-final-reveal-signals");
  if (!list) return [];
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent?.trim() ?? "");
}

function expected(answers: Answers): string[] {
  return [
    ...buildRevealNarrative({
      ...answers,
      region: regionLabelFor(answers.destinationIntent),
      addOnLabels: ADD_ONS.map((a) => a.label),
    }).signals,
  ];
}

describe("FinalRevealStory — signals update when the traveller's answers change", () => {
  it("re-renders the exact narrative signals for each new answer set", () => {
    const { rerender } = render(element(SEQUENCE[0].answers));
    expect(readSignals()).toEqual(expected(SEQUENCE[0].answers));

    for (const step of SEQUENCE.slice(1)) {
      rerender(element(step.answers));
      expect(readSignals(), step.name).toEqual(expected(step.answers));
    }

    // Going back to the first answer set restores the first output exactly.
    rerender(element(SEQUENCE[0].answers));
    expect(readSignals()).toEqual(expected(SEQUENCE[0].answers));
  });

  it("never duplicates an experience dimension after any change", () => {
    const { rerender } = render(element(SEQUENCE[0].answers));

    for (const step of SEQUENCE) {
      rerender(element(step.answers));
      const signals = readSignals();
      expect(new Set(signals).size, step.name).toBe(signals.length);
      expect(signals.length).toBeLessThanOrEqual(3);

      for (const dimension of EXPERIENCE_DIMENSIONS) {
        const needle = dimension.label.toLowerCase();
        const hits = signals.filter((s) => s.toLowerCase().includes(needle));
        expect(hits.length, `${step.name}: ${dimension.id} in ${hits.join(" / ")}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("produces different signals for materially different answers", () => {
    const { rerender } = render(element(SEQUENCE[0].answers));
    const first = readSignals();
    rerender(element(SEQUENCE[1].answers));
    expect(readSignals()).not.toEqual(first);
  });
});
