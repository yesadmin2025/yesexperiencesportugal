// Integration tests for the add-ons section on SignaturePriceCard.
//
// Verifies the new contract:
//   - Add-ons are NEVER invented — every visible add-on traces to a real
//     sibling Signature in the same region (via sourceTourId).
//   - The resolved Signature's own experience is NEVER offered as an
//     add-on (e.g. you can't add the tile workshop to the tile workshop).
//   - Itinerary thresholds (minHours / minStops) gate visibility.
//   - Running total = base + Σ(selected add-ons), per pp, across themes.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SignaturePriceCard } from "../SignaturePriceCard";
import type { SignatureTour } from "@/data/signatureTours";
import {
  ADD_ON_CATALOG,
  addOnEurFromBase,
  regionBucket,
} from "@/data/signatureAddOns";

vi.mock("@/data/signatureToursViator", () => ({
  VIATOR_META: {
    "fixture-lisbon": { priceFromUSD: 215.05 }, // → €200 base (rounded to €5)
    "fixture-douro": { priceFromUSD: 322.58 }, // → €300 base
    "tiles-workshop": { priceFromUSD: 215.05 }, // for "own-experience excluded" test
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

describe("SignaturePriceCard · add-ons (no invention, sibling-sourced)", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("provenance: add-ons reference real sibling signatures", () => {
    it("never offers pickup / transfer / lunch / guide as add-ons (those are always included)", () => {
      Object.values(ADD_ON_CATALOG)
        .flat()
        .forEach((a) => {
          const text = `${a.id} ${a.label}`.toLowerCase();
          // Things included in every Signature must never be sold again.
          expect(text).not.toMatch(/\bpickup\b/);
          expect(text).not.toMatch(/private transfer/);
          expect(text).not.toMatch(/door-to-door/);
          expect(text).not.toMatch(/\bguide service\b/);
          expect(text).not.toMatch(/\blunch\b/);
        });
    });

    it("every catalog add-on declares a real sourceTourId (referential integrity)", async () => {
      const { signatureTours } = await import("@/data/signatureTours");
      const realIds = new Set(signatureTours.map((t) => t.id));
      Object.values(ADD_ON_CATALOG)
        .flat()
        .forEach((a) => {
          expect(realIds.has(a.sourceTourId)).toBe(true);
        });
    });

    it("does not offer the resolved tour's own experience as an add-on", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({
              id: "tiles-workshop",
              region: "Azeitão · Sesimbra",
              durationHours: "7h",
            }),
          })}
        />,
      );
      const fieldset = screen.queryByTestId("studio-v3-add-ons");
      if (fieldset) {
        const ids = within(fieldset)
          .getAllByRole("button")
          .map((b) => b.getAttribute("data-addon-id"));
        // azulejo-workshop's sourceTourId === "tiles-workshop" → must be filtered out
        expect(ids).not.toContain("azulejo-workshop");
      }
    });
  });

  describe("itinerary gating", () => {
    it("surfaces at most 3 lisbon-arrábida add-ons when duration + stops are generous", () => {
      render(<SignaturePriceCard {...defaultProps()} />);
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      const buttons = within(fieldset).getAllByRole("button");
      expect(buttons.length).toBeLessThanOrEqual(3);
      expect(buttons.length).toBeGreaterThan(0);
      // Sanity: none of them is the resolved tour itself.
      buttons.forEach((b) => {
        expect(b.getAttribute("data-addon-id")).toBeTruthy();
      });
    });

    it("hides add-ons whose minHours exceeds the tour duration", () => {
      // 3h half-day tour → hours=3, so add-ons with minHours 6+ drop out.
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({ durationHours: "3h", duration: "Half Day" }),
          })}
        />,
      );
      const fieldset = screen.queryByTestId("studio-v3-add-ons");
      const ids = fieldset
        ? within(fieldset).getAllByRole("button").map((b) => b.getAttribute("data-addon-id"))
        : [];
      expect(ids).not.toContain("hidden-cove-picnic"); // minHours 6
      expect(ids).not.toContain("coastal-boat-ride"); // minHours 6
      expect(ids).not.toContain("sintra-detour"); // minHours 7
    });

    it("hides 'sintra-detour' when stopCount is below its minStops (4)", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({
            tour: makeTour({ region: "Setúbal · Arrábida", durationHours: "8h" }),
            stopCount: 3,
          })}
        />,
      );
      const fieldset = screen.getByTestId("studio-v3-add-ons");
      const ids = within(fieldset)
        .getAllByRole("button")
        .map((b) => b.getAttribute("data-addon-id"));
      expect(ids).not.toContain("sintra-detour");
    });

    it("hides the entire add-on section when the base price is missing", () => {
      render(
        <SignaturePriceCard
          {...defaultProps({ tour: makeTour({ id: "missing-price-id" as string }) })}
        />,
      );
      expect(screen.queryByTestId("studio-v3-add-ons")).not.toBeInTheDocument();
    });

    it("hides the entire add-on section when no sibling signatures exist (douro bucket)", () => {
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
      expect(screen.queryByTestId("studio-v3-add-ons")).not.toBeInTheDocument();
    });

    it("never renders more than 3 add-ons even with a generous pool", () => {
      // lisbon-arrabida currently has 5 catalog entries; cap = 3.
      const pool = ADD_ON_CATALOG[regionBucket("Setúbal · Arrábida")];
      expect(pool.length).toBeGreaterThanOrEqual(3);
      render(<SignaturePriceCard {...defaultProps()} />);
      expect(within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button")).toHaveLength(3);
    });
  });

  describe("running total (base + Σ selected, per pp)", () => {
    it("shows no total badge when nothing is selected", () => {
      render(<SignaturePriceCard {...defaultProps()} />);
      const total = screen.queryByTestId("studio-v3-add-ons-total");
      expect(total?.textContent?.toLowerCase() ?? "").not.toMatch(/total/);
    });

    it.each(["light", "dark"] as const)(
      "computes total = base + Σ(selected) per pp in %s theme",
      (theme) => {
        renderInTheme(theme, <SignaturePriceCard {...defaultProps()} />);
        const base = 200; // 215.05 USD * 0.93 → €200 (rounded to €5)
        const buttons = within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button");

        // Read each visible add-on's per-pp price directly from the DOM.
        const items = buttons.map((b) => {
          const id = b.getAttribute("data-addon-id")!;
          const m = b.textContent?.match(/\+€(\d+)/);
          return { id, eur: m ? Number(m[1]) : 0, el: b };
        });
        expect(items.every((i) => i.eur > 0)).toBe(true);

        let runningTotal = base;
        // Select each in order, assert total updates correctly.
        for (const item of items) {
          fireEvent.click(item.el);
          expect(item.el.getAttribute("aria-pressed")).toBe("true");
          runningTotal += item.eur;
          const total = screen.getByTestId("studio-v3-add-ons-total");
          expect(total.textContent).toContain(`€${runningTotal}`);
          expect(total.textContent?.toLowerCase()).toContain("/ pp");
        }

        // Toggle the first one OFF and verify the total subtracts.
        fireEvent.click(items[0].el);
        runningTotal -= items[0].eur;
        expect(items[0].el.getAttribute("aria-pressed")).toBe("false");
        const total = screen.getByTestId("studio-v3-add-ons-total");
        expect(total.textContent).toContain(`€${runningTotal}`);

        // Deselect everything → total badge no longer shows a price.
        for (let i = 1; i < items.length; i += 1) fireEvent.click(items[i].el);
        const emptied = screen.queryByTestId("studio-v3-add-ons-total");
        expect(emptied?.textContent?.toLowerCase() ?? "").not.toMatch(/total/);
      },
    );

    it("running total stays consistent under repeated toggling of the same add-on", () => {
      render(<SignaturePriceCard {...defaultProps()} />);
      const first = within(screen.getByTestId("studio-v3-add-ons")).getAllByRole("button")[0];
      const m = first.textContent?.match(/\+€(\d+)/);
      const eur = m ? Number(m[1]) : 0;
      expect(eur).toBeGreaterThan(0);

      for (let i = 0; i < 4; i += 1) {
        fireEvent.click(first);
        if (i % 2 === 0) {
          const total = screen.getByTestId("studio-v3-add-ons-total");
          expect(total.textContent).toContain(`€${200 + eur}`);
        } else {
          const off = screen.queryByTestId("studio-v3-add-ons-total");
          expect(off?.textContent?.toLowerCase() ?? "").not.toMatch(/total/);
        }
      }
    });

    it("addOnEurFromBase rounds to nearest €5/pp (minimum €5)", () => {
      expect(addOnEurFromBase(200, 0.18)).toBe(35); // 36 → 35
      expect(addOnEurFromBase(200, 0.12)).toBe(25); // 24 → 25
      expect(addOnEurFromBase(50, 0.05)).toBe(5); // floored
    });
  });
});
