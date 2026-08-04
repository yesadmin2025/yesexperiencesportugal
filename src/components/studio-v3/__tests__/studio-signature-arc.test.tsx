import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FinalRevealStory } from "../FinalRevealStory";
import { StudioV3Intro } from "../StudioV3Intro";
import { INITIAL_STATE } from "../types";

describe("Studio V3 Signature arc", () => {
  it("opens with the agreed emotional invitation", () => {
    render(<StudioV3Intro onComplete={() => {}} />);

    expect(screen.getByRole("heading", { name: "Portugal is waiting…" })).toBeVisible();
    expect(
      screen.getByText("A few quiet choices, and Portugal begins to take your shape."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /begin/i })).toBeVisible();
  });

  it("closes with the Signature reveal and grounded multi-answer intelligence", () => {
    render(
      <FinalRevealStory
        state={{
          ...INITIAL_STATE,
          phase: "confirmation",
          feeling: "wine-food",
          interests: ["wine", "heritage"],
          rhythm: "slow",
          guests: 2,
          adults: 2,
        }}
        selectedAddOns={[]}
        perPaxEur={210}
        totalEur={420}
        onContinue={() => {}}
        onSaveSignature={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your Portugal is ready." })).toBeVisible();
    expect(screen.getByText("Your Signature")).toBeVisible();
    expect(screen.getByText("A private day shaped from what matters to you.")).toBeVisible();

    const reasons = screen.getAllByTestId("studio-v3-final-reveal-reason");
    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons.some((node) => node.textContent?.includes("wine"))).toBe(true);
    expect(reasons.some((node) => node.textContent?.includes("Fewer moments"))).toBe(true);

    expect(screen.getByText("€420")).toBeVisible();
    expect(screen.getByRole("button", { name: /confirm & reserve/i })).toBeVisible();
  });
});
