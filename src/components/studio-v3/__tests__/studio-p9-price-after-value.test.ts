/**
 * P9 — Price after value / price without shock.
 *
 * The traveller must feel the composed day before any money appears. These
 * are source-contract tests: they lock the *absence* of pre-value price
 * surfaces and the position of the canonical price boundary, which is what
 * regressions actually break.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isPhaseRelevant } from "../curation";
import { INITIAL_STATE } from "../types";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const STUDIO = read("src/components/studio-v3/StudioV3.tsx");
const PANEL = read("src/components/studio-v3/LivingJourneyPanel.tsx");

describe("P9 · StudioV3 main funnel carries no pre-value price surface", () => {
  it("does not import RunningInvestmentRibbon", () => {
    expect(STUDIO).not.toMatch(/^import\s+\{[^}]*RunningInvestmentRibbon/m);
  });

  it("does not mount <RunningInvestmentRibbon", () => {
    expect(STUDIO).not.toContain("<RunningInvestmentRibbon");
  });

  it("keeps the ribbon component itself intact for legacy/component tests", () => {
    const ribbon = read("src/components/studio-v3/RunningInvestmentRibbon.tsx");
    expect(ribbon).toContain("export function RunningInvestmentRibbon");
  });
});

describe("P9 · Journey Draft is value-only", () => {
  it("has no local price arithmetic or price variables", () => {
    expect(PANEL).not.toContain("scopePriceFromEur");
    expect(PANEL).not.toContain("scopePartyTotalEur");
    expect(PANEL).not.toContain("INVESTMENT_TIERS");
    expect(PANEL).not.toContain("investmentLabel");
  });

  it("renders no money or investment framing", () => {
    expect(PANEL).not.toContain("from €");
    expect(PANEL).not.toContain("~€");
    expect(PANEL).not.toContain("Experience Investment");
    expect(PANEL).not.toMatch(/priceFrom\s*\*/);
  });

  it("keeps the value cues: region, moments, duration, route/story/timeline/map", () => {
    expect(PANEL).toContain("scopeRegion");
    expect(PANEL).toContain("scopeStops");
    expect(PANEL).toContain("scopeDuration");
    expect(PANEL).toContain("studio-v3-journey-scope");
    expect(PANEL).toContain("StudioV3SignatureMap");
    expect(PANEL).toContain("TimelineView");
    expect(PANEL).toContain("routeLine");
  });
});

describe("P9 · canonical price boundary stays inside Your Day", () => {
  it("SignaturePriceCard is still rendered with variant=refine", () => {
    expect(STUDIO).toContain("<SignaturePriceCard");
    expect(STUDIO).toMatch(/variant="refine"/);
  });

  it("price card appears after the route and stops editor in source order", () => {
    const route = STUDIO.indexOf("studio-v3-unified-route");
    const stops = STUDIO.indexOf("studio-v3-stops-editor");
    const price = STUDIO.indexOf("<SignaturePriceCard");
    expect(route).toBeGreaterThan(-1);
    expect(stops).toBeGreaterThan(-1);
    expect(price).toBeGreaterThan(stops);
    expect(stops).toBeGreaterThan(route);
  });

  it("preserves the canonical resolved pricing props", () => {
    for (const prop of [
      "resolvedPerPaxEur={resolvedJourney.perPaxEur}",
      "resolvedTotalEur={resolvedJourney.totalEur}",
      "resolvedBaseTotalEur={resolvedJourney.baseTotalEur}",
      "resolvedAddOnsTotalEur={resolvedJourney.addOnsPartyTotalEur}",
    ]) {
      expect(STUDIO).toContain(prop);
    }
  });
});

describe("P9 · investment is never an asked phase", () => {
  it("investment stays non-relevant in the modern path", () => {
    expect(isPhaseRelevant("investment", INITIAL_STATE)).toBe(false);
  });
});

/* -------------------------------------------------------------------------
 * P9 hardening — pre-value surfaces carry no money/investment framing, the
 * unified Your Day order ends in value → reasons → price, and the price card
 * never invents a per-person average.
 * ---------------------------------------------------------------------- */

const COMPOSER = read("src/components/studio-v3/ComposerMap.tsx");
const PRICE_CARD = read("src/components/studio-v3/SignaturePriceCard.tsx");

describe("P9 · ComposerMap is a pre-value surface", () => {
  it("has no price projection or visible money", () => {
    expect(COMPOSER).not.toContain("scopePriceFromEur");
    expect(COMPOSER).not.toContain("From €");
  });

  it("has no investment tier framing", () => {
    expect(COMPOSER).not.toContain("INVESTMENT_TIERS");
    expect(COMPOSER).not.toContain("investmentLabel");
    expect(COMPOSER).not.toContain("Investment direction");
  });

  it("keeps the value-first status labels", () => {
    expect(COMPOSER).toContain('"Draft ready"');
    expect(COMPOSER).toContain('"Composing your day"');
  });

  it("still passes investment into internal curation truth", () => {
    expect(COMPOSER).toContain("investment: state.investment");
  });
});

describe("P9 · Journey Draft AI story is not budget-framed", () => {
  it("storyKey and request omit investment", () => {
    const storyKeyBlock = PANEL.slice(PANEL.indexOf("storyKey"), PANEL.indexOf("sessionId,"));
    expect(storyKeyBlock).not.toContain("state.investment");
  });

  it("internal curation may still read investment", () => {
    expect(PANEL).toContain("investment: state.investment");
  });
});

describe("P9 · unified Your Day order ends value → reasons → price", () => {
  it("route < stops editor < reasons < price card", () => {
    const route = STUDIO.indexOf("studio-v3-unified-route");
    const stops = STUDIO.indexOf("studio-v3-stops-editor");
    const reasons = STUDIO.indexOf("studio-v3-travel-file-reasons");
    const price = STUDIO.indexOf("<SignaturePriceCard");
    expect(route).toBeGreaterThan(-1);
    expect(stops).toBeGreaterThan(route);
    expect(reasons).toBeGreaterThan(stops);
    expect(price).toBeGreaterThan(reasons);
  });

  it("renders the reasons block exactly once", () => {
    const matches = STUDIO.match(/studio-v3-travel-file-reasons/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("P9 · SignaturePriceCard guest context reads as an estimate", () => {
  it("uses the estimated copy", () => {
    expect(PRICE_CARD).toContain("Estimated for ");
    expect(PRICE_CARD).toContain("Estimated per guest");
  });

  it("keeps canonical resolved pricing paths", () => {
    expect(PRICE_CARD).toContain("resolvedTotalEur");
    expect(PRICE_CARD).toContain("resolvedPerPaxEur");
  });

  it("never invents a per-person average from the canonical total", () => {
    expect(PRICE_CARD).not.toMatch(/resolvedTotalEur\s*\/\s*/);
  });
});
