import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FinalRevealStory } from "../FinalRevealStory";
import { INITIAL_STATE } from "../types";

describe("FinalRevealStory pricing visibility", () => {
  it("shows the effective per-person price and party total without opening inclusions", () => {
    render(
      <FinalRevealStory
        state={{ ...INITIAL_STATE, phase: "confirmation", guests: 3 }}
        selectedAddOns={[
          {
            id: "wine",
            label: "Private wine tasting",
            priceEur: 40,
            durationMinutes: 30,
            pricePctOfBase: 0.2,
            perUnit: 40,
            amount: 120,
            unit: "per_person",
            unitLabel: "per guest",
          },
        ]}
        perPaxEur={207}
        totalEur={620}
        onContinue={() => {}}
        onSaveSignature={() => {}}
        onBack={() => {}}
      />,
    );

    const investment = screen.getByTestId("studio-v3-final-reveal-investment");
    expect(within(investment).getByText("€620")).toBeVisible();
    expect(within(investment).getByText("€207 per person")).toBeVisible();

    const details = screen.getByTestId("studio-v3-final-reveal-inclusions");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("(€40 × 3)");
    expect(details).toHaveTextContent("€120");
  });
});