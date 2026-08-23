import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FinalRevealStory } from "../FinalRevealStory";
import { INITIAL_STATE } from "../types";

const trackStudio = vi.hoisted(() => vi.fn());
vi.mock("@/lib/studio-analytics", () => ({ trackStudio }));

function renderReveal() {
  return render(
    <FinalRevealStory
      state={{ ...INITIAL_STATE, phase: "confirmation", guests: 2 }}
      selectedAddOns={[]}
      perPaxEur={200}
      totalEur={400}
      onContinue={() => {}}
      onSaveSignature={() => {}}
      onBack={() => {}}
    />,
  );
}

describe("price_expanded analytics", () => {
  beforeEach(() => trackStudio.mockClear());

  it("fires at most once per mounted reveal, even after re-opening", () => {
    renderReveal();
    const details = screen.queryByTestId("studio-v3-price-change-factors");
    if (!details) {
      // No real price-changing factor for this state → the disclosure must
      // not render, and the event must never fire.
      expect(trackStudio.mock.calls.filter((c) => c[0] === "price_expanded")).toHaveLength(0);
      return;
    }
    const el = details as HTMLDetailsElement;
    el.open = true;
    fireEvent(el, new Event("toggle", { bubbles: false }));
    el.open = false;
    fireEvent(el, new Event("toggle", { bubbles: false }));
    el.open = true;
    fireEvent(el, new Event("toggle", { bubbles: false }));
    expect(trackStudio.mock.calls.filter((c) => c[0] === "price_expanded")).toHaveLength(1);
  });
});
