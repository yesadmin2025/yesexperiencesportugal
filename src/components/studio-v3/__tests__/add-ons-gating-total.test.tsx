// Integration tests for the add-ons section on SignaturePriceCard.
//
// Verifies:
//   1. Add-ons are gated by itinerary thresholds (minHours / minStops):
//        - low duration/low stops → fewer or zero add-ons surface
//        - duration/stops above thresholds → up to 3 surface
//   2. Running total = base + sum(selected add-ons), always per pp,
//      across selection toggles and across light / dark themes.
//   3. Toggling an add-on off subtracts it from the total.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SignaturePriceCard } from "../SignaturePriceCard";
import type { SignatureTour } from "@/data/signatureTours";
import {
  ADD_ONS_BY_REGION,
  addOnEurFromBase,
  regionBucket,
} from "@/data/signatureAddOns";

vi.mock("@/data/signatureToursViator", () => ({
  VIATOR_META: {
    "fixture-lisbon": { priceFromUSD: 215.05 }, // → €200 base (round to €5)
    "fixture-douro": { priceFromUSD: 322.58 }, // → €300 base
  } as Record<string, { priceFromUSD: number }>,
}));

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
}));

function makeTour(over: Partial<SignatureTour> = {}): SignatureTour {
  return {
    id: "fixture-lisbon",
    title: "Fixture Tour",
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "7–9h",
    // unrelated fields the component doesn't read
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(over as any),
  } as SignatureTour;
}

function renderInTheme(theme: "light" | "dark", ui: React.ReactNode) {
  return render(
    <div data-theme={theme} style={{ background: theme === "dark" ? "#111" : "#fff" }}>
      {ui}
    </div>,
  );
}

function defaultProps(over: Partial<React.ComponentProps<typeof SignaturePriceCard>> = {}) {
  return {
    tour: makeTour(),
    stopCount: 5,
    dateExact: null,
    onSecure: vi.fn(),
    onRefine: vi.fn(),
    journeyTitle: null,
    ...over,
  };
}

describe("SignaturePriceCard · add-ons gating + running total", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("itinerary gating", () => {
    it("surfaces all 3 lisbon-arrábida add-ons when duration + stops are generous", () => {
      render(<SignaturePriceCard {...defaultProps()} />);
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      expect(fieldset.getAttribute("data-count")).toBe("3");
      const buttons = within(fieldset).getAllByRole("button");
      expect(buttons).toHaveLength(3);
      expect(buttons.map((b) => b.getAttribute("data-addon-id"))).toEqual([
        "sommelier-tasting",
        "sunset-extension",
        "private-transfer",
      ]);
    });

    it("hides the sunset add-on when duration is below its minHours (6)", () => {
      // Short half-day tour → hours=3
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({ durationHours: "3h", duration: "Half Day" }),
          })}
        />,
      );
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      expect(fieldset.getAttribute("data-count")).toBe("2");
      const ids = within(fieldset)
        .getAllByRole("button")
        .map((b) => b.getAttribute("data-addon-id"));
      expect(ids).toEqual(["sommelier-tasting", "private-transfer"]);
      expect(ids).not.toContain("sunset-extension");
    });

    it("centro: hides 'village-lunch' add-on when stopCount is below minStops (3)", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({ region: "Centro · Coast", durationHours: "7h" }),
            stopCount: 2,
          })}
        />,
      );
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      const ids = within(fieldset)
        .getAllByRole("button")
        .map((b) => b.getAttribute("data-addon-id"));
      expect(ids).toContain("monastery-after-hours");
      expect(ids).toContain("private-transfer");
      expect(ids).not.toContain("village-lunch");
    });

    it("hides the entire add-on section when the base price is missing", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({ id: "missing-price-id" as string }),
          })}
        />,
      );
      expect(screen.queryByTestId("studio-v3-add-ons")).not.toBeInTheDocument();
    });

    it("never renders more than 3 add-ons even when the pool has more eligible", () => {
      // Every region pool ships exactly 3 today, but assert the cap defensively.
      const pool = ADD_ONS_BY_REGION[regionBucket("Setúbal · Arrábida")];
      expect(pool.length).toBeLessThanOrEqual(3);
      render(<SignaturePriceCard {...defaultProps()} />);
      expect(within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button"))
        .toHaveLength(3);
    });
  });

  describe("running total (base + selected add-ons, per pp)", () => {
    it("shows no total badge when nothing is selected", () => {
      render(<SignaturePriceCard {...defaultProps()} />);
      expect(screen.queryByTestId("studio-v3-add-ons-total")).not.toBeInTheDocument();
    });

    it.each(["light", "dark"] as const)(
      "computes total = base + Σ(selected) per pp in %s theme",
      (theme) => {
        renderInTheme(theme, <SignaturePriceCard {...defaultProps()} />);
        // Base = 215.05 * 0.93 → €200 (rounded to €5)
        const base = 200;

        const sommelier = screen.getByRole("button", { name: /sommelier wine flight/i });
        const sunset = screen.getByRole("button", { name: /sunset at cabo espichel/i });
        const transfer = screen.getByRole("button", { name: /door-to-door private transfer/i });

        const sommelierEur = addOnEurFromBase(base, 0.18); // 36 → 35
        const sunsetEur = addOnEurFromBase(base, 0.12); // 24 → 25
        const transferEur = addOnEurFromBase(base, 0.22); // 44 → 45

        // sanity: the prices rendered on the cards match the helper
        expect(sommelier.textContent).toContain(`+€${sommelierEur}`);
        expect(sunset.textContent).toContain(`+€${sunsetEur}`);
        expect(transfer.textContent).toContain(`+€${transferEur}`);

        fireEvent.click(sommelier);
        expect(sommelier.getAttribute("aria-pressed")).toBe("true");
        let total = screen.getByTestId("studio-v3-add-ons-total");
        expect(total.textContent).toContain(`€${base + sommelierEur}`);
        expect(total.textContent?.toLowerCase()).toContain("/ pp");

        fireEvent.click(sunset);
        total = screen.getByTestId("studio-v3-add-ons-total");
        expect(total.textContent).toContain(`€${base + sommelierEur + sunsetEur}`);

        fireEvent.click(transfer);
        total = screen.getByTestId("studio-v3-add-ons-total");
        expect(total.textContent).toContain(
          `€${base + sommelierEur + sunsetEur + transferEur}`,
        );

        // Toggle one OFF → subtract.
        fireEvent.click(sunset);
        expect(sunset.getAttribute("aria-pressed")).toBe("false");
        total = screen.getByTestId("studio-v3-add-ons-total");
        expect(total.textContent).toContain(`€${base + sommelierEur + transferEur}`);

        // Deselect everything → total badge disappears.
        fireEvent.click(sommelier);
        fireEvent.click(transfer);
        expect(screen.queryByTestId("studio-v3-add-ons-total")).not.toBeInTheDocument();
      },
    );

    it("douro: base + transfer total stays consistent under repeated toggling", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({
              id: "fixture-douro",
              region: "Douro Valley",
              durationHours: "8h",
            }),
          })}
        />,
      );
      const base = 300; // 322.58 * 0.93 = 300.0 → €300
      const transfer = screen.getByRole("button", { name: /door-to-door private transfer/i });
      const transferEur = addOnEurFromBase(base, 0.30); // 90

      for (let i = 0; i < 4; i += 1) {
        fireEvent.click(transfer);
        if (i % 2 === 0) {
          const total = screen.getByTestId("studio-v3-add-ons-total");
          expect(total.textContent).toContain(`€${base + transferEur}`);
        } else {
          expect(screen.queryByTestId("studio-v3-add-ons-total")).not.toBeInTheDocument();
        }
      }
    });
  });
});
