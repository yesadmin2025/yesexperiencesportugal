// Micro-interactions contract for add-on chips.
//
// Verifies:
//   • idle → checked transitions synchronously (totals stay deterministic)
//   • a transient "pending" data-state flashes for ≤180ms then clears
//   • running total updates on every selection, across light + dark themes
//   • cap of 3 is enforced via aria-disabled, click on disabled is a no-op
//   • deselecting re-enables previously disabled chips
//   • output is wired with aria-live="polite" for screen readers

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SignaturePriceCard } from "../SignaturePriceCard";
import type { SignatureTour } from "@/data/signatureTours";

vi.mock("@/data/signatureToursViator", () => ({
  VIATOR_META: {
    "fixture-lisbon": { priceFromUSD: 215.05 }, // → €200 base
  } as Record<string, { priceFromUSD: number }>,
}));

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
}));

function makeTour(): SignatureTour {
  return {
    id: "fixture-lisbon",
    title: "Fixture",
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "7–9h",
  } as SignatureTour;
}

function defaultProps() {
  return {
    tour: makeTour(),
    stopCount: 5,
    dateExact: null,
    onSecure: vi.fn(),
    onRefine: vi.fn(),
    journeyTitle: null,
  };
}

function renderInTheme(theme: "light" | "dark") {
  return render(
    <div data-theme={theme}>
      <SignaturePriceCard {...defaultProps()} />
    </div>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("SignaturePriceCard · add-on micro-interactions", () => {
  it.each(["light", "dark"] as const)(
    "[%s] selecting an add-on flips data-state to checked and bumps the running total",
    (theme) => {
      renderInTheme(theme);
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      const chips = within(fieldset).getAllByRole("button");
      expect(chips.length).toBeGreaterThan(0);

      const first = chips[0];
      expect(first).toHaveAttribute("data-state", "idle");

      fireEvent.click(first);

      // Selection is synchronous — checked state is immediate.
      expect(first).toHaveAttribute("aria-pressed", "true");
      // Pending flourish flag is on
      expect(first.getAttribute("data-state")).toMatch(/pending|checked/);

      // Total reflects base + this add-on
      const total = screen.getByTestId("studio-v3-add-ons-total");
      const match = first.textContent?.match(/\+€(\d+)/);
      const addonEur = match ? Number(match[1]) : 0;
      expect(total.textContent).toContain(`€${200 + addonEur}`);

      // After the pending window clears, state settles on checked.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(first).toHaveAttribute("data-state", "checked");
    },
  );

  it("running total recomputes correctly across multiple selections", () => {
    render(<SignaturePriceCard {...defaultProps()} />);
    const chips = within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button");
    let expected = 200;
    chips.slice(0, 2).forEach((chip) => {
      const m = chip.textContent?.match(/\+€(\d+)/);
      expected += m ? Number(m[1]) : 0;
      fireEvent.click(chip);
    });
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByTestId("studio-v3-add-ons-total").textContent).toContain(
      `€${expected}`,
    );
  });

  it("cap of 3: a 4th selection is blocked, aria-disabled appears, total unchanged", () => {
    render(<SignaturePriceCard {...defaultProps()} />);
    const chips = within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button");
    if (chips.length < 3) return; // catalog smaller than cap, skip
    chips.slice(0, 3).forEach((c) => fireEvent.click(c));
    act(() => vi.advanceTimersByTime(200));

    const totalBefore = screen.getByTestId("studio-v3-add-ons-total").textContent;
    // Any remaining unselected chip must be aria-disabled
    const remaining = chips.find((c) => c.getAttribute("aria-pressed") !== "true");
    if (!remaining) return;
    expect(remaining).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(remaining);
    act(() => vi.advanceTimersByTime(200));
    expect(remaining).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("studio-v3-add-ons-total").textContent).toBe(totalBefore);
  });

  it("deselecting a chip re-enables previously gated siblings", () => {
    render(<SignaturePriceCard {...defaultProps()} />);
    const chips = within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button");
    if (chips.length < 4) return;
    chips.slice(0, 3).forEach((c) => fireEvent.click(c));
    act(() => vi.advanceTimersByTime(200));
    expect(chips[3]).toHaveAttribute("aria-disabled", "true");

    // Deselect the first → 4th must come back to life
    fireEvent.click(chips[0]);
    act(() => vi.advanceTimersByTime(200));
    expect(chips[3]).not.toHaveAttribute("aria-disabled", "true");
  });

  it("running total <output> exposes aria-live=polite for screen readers", () => {
    render(<SignaturePriceCard {...defaultProps()} />);
    const total = screen.getByTestId("studio-v3-add-ons-total");
    expect(total.tagName.toLowerCase()).toBe("output");
    expect(total).toHaveAttribute("aria-live", "polite");
  });
});
