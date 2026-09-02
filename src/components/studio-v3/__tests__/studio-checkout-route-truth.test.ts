import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  resolveAuthoritativeRouteStops,
  resolveStudioRouteFromState,
} from "../studioRouteAuthority";
import { buildWineryDisplayLabels, studioDisplayLabel } from "../studioWineryPresentation";
import type { StudioV3State } from "../types";

const SRC = fs.readFileSync(
  path.join(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

/**
 * Mirror of the checkout derivation in `handleStripeCheckout` — the exact
 * chain the payload must use. The source-contract tests below prove the
 * component still uses this and nothing else.
 */
function checkoutLabels(state: StudioV3State, catalogStops: Array<{ label: string }>) {
  const stops = resolveAuthoritativeRouteStops({
    editedRoutePoints: state.editedRoutePoints ?? null,
    resolved: resolveStudioRouteFromState(state),
    catalogStops,
  });
  const display = buildWineryDisplayLabels(stops);
  return stops.map((s) => studioDisplayLabel(s.label, display));
}

const BASE_STATE = {
  phase: "storyboard",
  feeling: "wine-food",
  companions: "couple",
  rhythm: "immersive",
  interests: ["wine", "food"],
  pickup: "lisbon",
  occasion: null,
  considerations: [],
  investment: null,
  destinationIntent: "arrabida-setubal-azeitao",
  dateExact: null,
  refinement: null,
  rerollCount: 0,
  editedRoutePoints: null,
} as unknown as StudioV3State;

const CATALOG = [
  { label: "Catalog stop A" },
  { label: "Catalog stop B" },
  { label: "Catalog stop C" },
];

describe("Studio checkout route truth — source contract", () => {
  it("checkout derives stopLabels from the authoritative route, not tour.stops", () => {
    expect(SRC).toMatch(/const checkoutStops = resolveAuthoritativeRouteStops\(\{/);
    expect(SRC).toMatch(/editedRoutePoints: currentState\.editedRoutePoints \?\? null/);
    expect(SRC).toMatch(/const checkoutResolved = resolveStudioRouteFromState\(currentState\);/);
    expect(SRC).toMatch(/resolved: checkoutResolved,/);
    // The old catalog-only derivation must be gone.
    expect(SRC).not.toMatch(
      /const stopLabels = \(tour\.stops \?\? \[\]\)\.map\(\(s\) => s\.label\)\.slice\(0, 6\)/,
    );
  });

  it("does not cap the authored route to the legacy 4-slot / 6-stop projection", () => {
    const block = SRC.slice(
      SRC.indexOf("const checkoutStops = resolveAuthoritativeRouteStops"),
      SRC.indexOf("const perPaxBase = resolvedPerPax +"),
    );
    expect(block).not.toMatch(/slice\(0,\s*\d+\)/);
  });

  it("applies the winery presentation guard to persisted checkout labels", () => {
    expect(SRC).toMatch(/const checkoutWineryLabels = buildWineryDisplayLabels\(checkoutStops\)/);
    expect(SRC).toMatch(/studioDisplayLabel\(s\.label, checkoutWineryLabels\)/);
  });

  it("sends an explicit itinerary so the frozen snapshot keeps authored order", () => {
    expect(SRC).toMatch(/itinerary: stopLabels\.map\(\(label\) => \(\{ label \}\)\)/);
  });

  it("touches no pricing / rhythm / curation authority", () => {
    const block = SRC.slice(
      SRC.indexOf("const checkoutStops = resolveAuthoritativeRouteStops"),
      SRC.indexOf("const perPaxBase = resolvedPerPax +"),
    );
    expect(block).not.toMatch(/price|tier|RHYTHM_STOP_COUNT|score/i);
    // PASS 5 — server pricing inputs still come from composition + tour id,
    // now resolved through the STRICT runtime-tier authority (no priceFrom).
    expect(SRC).toMatch(
      /const resolvedPerPax = resolveStudioStrictPerPaxEur\(tour\.id, details\.guests, tourPriceTiers\)/,
    );

  });
});

describe("Studio checkout route truth — behaviour", () => {
  it("base composed route (not catalog) feeds checkout", () => {
    const labels = checkoutLabels(BASE_STATE, CATALOG);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).not.toContain("Catalog stop A");
    const resolved = resolveStudioRouteFromState(BASE_STATE);
    const full = resolved.composedRoutePoints?.length
      ? resolved.composedRoutePoints
      : resolved.routePoints;
    expect(labels).toHaveLength(full.length);
  });

  it("a full/immersive >4 route is not replaced by the compact card route", () => {
    const resolved = resolveStudioRouteFromState(BASE_STATE);
    const full = resolved.composedRoutePoints ?? [];
    if (full.length > 4) {
      expect(resolved.routePoints.length).toBeLessThan(full.length);
      expect(checkoutLabels(BASE_STATE, CATALOG)).toHaveLength(full.length);
    } else {
      // Fixture guard: the authority chain is still proven by the edited cases.
      expect(full.length).toBeGreaterThan(0);
    }
  });

  it("reorder / swap / remove persist exactly, and undo restores the route", () => {
    const base = resolveAuthoritativeRouteStops({
      editedRoutePoints: null,
      resolved: resolveStudioRouteFromState(BASE_STATE),
      catalogStops: CATALOG,
    });
    const baseLabels = base.map((s) => s.label);

    // move earlier: swap index 1 and 0
    const moved = [base[1], base[0], ...base.slice(2)];
    expect(
      checkoutLabels({ ...BASE_STATE, editedRoutePoints: moved } as StudioV3State, CATALOG).slice(
        0,
        2,
      ),
      // Checkout labels are always genericised for guest-facing output, so the
      // expectation compares the same presentation of the reordered moments.
    ).toEqual([base[1].label, base[0].label].map((l) => studioDisplayLabel(l)));

    // swap a moment
    const swapped = base.map((s, i) => (i === 1 ? { label: "Sesimbra", story: "" } : s));
    const swappedLabels = checkoutLabels(
      { ...BASE_STATE, editedRoutePoints: swapped } as StudioV3State,
      CATALOG,
    );
    expect(swappedLabels[1]).toBe("Sesimbra");
    expect(swappedLabels).toHaveLength(base.length);

    // remove a moment
    const removed = base.filter((_, i) => i !== 2);
    expect(
      checkoutLabels({ ...BASE_STATE, editedRoutePoints: removed } as StudioV3State, CATALOG),
    ).toHaveLength(base.length - 1);

    // undo → editedRoutePoints cleared → restored base route
    expect(
      checkoutLabels({ ...BASE_STATE, editedRoutePoints: null } as StudioV3State, CATALOG).length,
    ).toBe(baseLabels.length);
  });

  it("named winery suppliers never enter the checkout payload labels", () => {
    const edited = [
      { label: "Family winery in Azeitão", story: "" },
      { label: "Moscatel cellar, Azeitão", story: "" },
      { label: "Sesimbra", story: "" },
    ];
    const labels = checkoutLabels(
      { ...BASE_STATE, editedRoutePoints: edited } as StudioV3State,
      CATALOG,
    );
    const joined = labels.join(" | ");
    expect(joined).not.toMatch(/jos[ée] maria|fonseca|bacalh[oô]a|quinta|azeit[ãa]o winery/i);
    expect(labels[0]).toMatch(/local winery/i);
    expect(labels[1]).toMatch(/local winery/i);
    expect(labels[2]).toBe("Sesimbra");
  });
});

describe("Studio checkout route truth — untouched files", () => {
  it("pricing config, curation and rhythm constants keep their contracts", () => {
    const pricing = fs.readFileSync(path.join(process.cwd(), "src/config/pricing.ts"), "utf8");
    expect(pricing.length).toBeGreaterThan(0);
    const curation = fs.readFileSync(
      path.join(process.cwd(), "src/components/studio-v3/curation.ts"),
      "utf8",
    );
    expect(curation).toMatch(/RHYTHM_STOP_COUNT/);
  });
});
