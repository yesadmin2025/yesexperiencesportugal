/**
 * @vitest-environment jsdom
 *
 * P3B — the running investment whisper may only show a party total when
 * Studio has canonical pricing. It never multiplies a `from` anchor locally.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunningInvestmentRibbon } from "../RunningInvestmentRibbon";
import { INITIAL_STATE } from "../types";

const state = {
  ...INITIAL_STATE,
  phase: "who" as const,
  guests: 2,
  adults: 2,
  minorAges: [],
};

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  sessionStorage.clear();
});

describe("RunningInvestmentRibbon — canonical investment", () => {
  it("shows no numeric party total before canonical pricing exists", () => {
    render(<RunningInvestmentRibbon state={state} />);

    const ribbon = screen.getByTestId("studio-v3-investment-ribbon");
    expect(ribbon.textContent).toContain("investment takes shape with your day");
    expect(screen.queryByTestId("studio-v3-investment-ribbon-total")).toBeNull();
    expect(screen.queryByTestId("studio-v3-investment-ribbon-delta")).toBeNull();
  });

  it("renders the supplied canonical total and never invents an initial delta", () => {
    render(
      <RunningInvestmentRibbon
        state={state}
        resolvedTotalEur={500}
        resolvedAdultUnitEur={250}
        resolvedGuests={2}
      />,
    );

    const total = screen.getByTestId("studio-v3-investment-ribbon-total");
    expect(total.getAttribute("data-eur")).toBe("500");
    expect(total.textContent).toContain("€500");
    expect(total.textContent).toContain("2");
    expect(screen.queryByTestId("studio-v3-investment-ribbon-delta")).toBeNull();
  });

  it("shows exact positive and negative deltas only on real total changes, then clears them", () => {
    const { rerender } = render(
      <RunningInvestmentRibbon
        state={state}
        resolvedTotalEur={500}
        resolvedAdultUnitEur={250}
        resolvedGuests={2}
      />,
    );

    rerender(
      <RunningInvestmentRibbon
        state={state}
        resolvedTotalEur={500}
        resolvedAdultUnitEur={250}
        resolvedGuests={2}
      />,
    );
    expect(screen.queryByTestId("studio-v3-investment-ribbon-delta")).toBeNull();

    rerender(
      <RunningInvestmentRibbon
        state={state}
        resolvedTotalEur={620}
        resolvedAdultUnitEur={310}
        resolvedGuests={2}
      />,
    );
    let delta = screen.getByTestId("studio-v3-investment-ribbon-delta");
    expect(delta.getAttribute("data-delta-eur")).toBe("120");
    expect(delta.textContent).toContain("Updated +€120");

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.queryByTestId("studio-v3-investment-ribbon-delta")).toBeNull();

    rerender(
      <RunningInvestmentRibbon
        state={state}
        resolvedTotalEur={540}
        resolvedAdultUnitEur={270}
        resolvedGuests={2}
      />,
    );
    delta = screen.getByTestId("studio-v3-investment-ribbon-delta");
    expect(delta.getAttribute("data-delta-eur")).toBe("-80");
    expect(delta.textContent).toContain("Updated −€80");
  });

  it("clears its pending delta timer on unmount", () => {
    const { rerender, unmount } = render(
      <RunningInvestmentRibbon state={state} resolvedTotalEur={500} resolvedGuests={2} />,
    );
    rerender(
      <RunningInvestmentRibbon state={state} resolvedTotalEur={600} resolvedGuests={2} />,
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("contains no approximate-party-total code and keeps reduced-motion styling", () => {
    const src = readFileSync(
      fileURLToPath(new URL("../RunningInvestmentRibbon.tsx", import.meta.url)),
      "utf8",
    );
    expect(src).not.toContain("~€");
    expect(src).not.toContain("partyTotalEur");
    expect(src).not.toMatch(/priceFromEur\s*\*\s*guests/);
    expect(src).toContain("motion-reduce:transition-none");
  });
});
