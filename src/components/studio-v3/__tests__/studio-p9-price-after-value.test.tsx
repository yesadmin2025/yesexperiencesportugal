import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ComposerMap } from "../ComposerMap";
import { LivingJourneyPanel } from "../LivingJourneyPanel";
import {
  COMPANIONS,
  FEELINGS,
  INITIAL_STATE,
  INTERESTS,
  INVESTMENT_TIERS,
  PICKUPS,
  RHYTHMS,
  type StudioV3State,
} from "../types";

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () =>
    vi.fn().mockResolvedValue({
      text: "A quiet Portuguese day begins to take shape around the choices already made.",
      source: "fallback",
    }),
}));
vi.mock("@/lib/studio-v3/compose-live-story.functions", () => ({ composeLiveStory: {} }));
vi.mock("@/hooks/useBuilderSessionId", () => ({ useBuilderSessionId: () => "p9-session-123456" }));
vi.mock("@/hooks/use-route-leg-minutes", () => ({
  useRouteLegMinutes: () => ({ legMinutes: null, isLoading: false, error: null }),
}));
vi.mock("../SmartRecommendation", () => ({ SmartRecommendation: () => null }));

afterEach(() => cleanup());

const studioSrc = readFileSync(resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"), "utf8");

function valueState(): StudioV3State {
  return {
    ...INITIAL_STATE,
    phase: "rhythm",
    feeling: FEELINGS.find((x) => x.id === "wine-food")!.id as StudioV3State["feeling"],
    companions: COMPANIONS.find((x) => x.id === "couple")!.id as StudioV3State["companions"],
    interests: [INTERESTS.find((x) => x.id === "wine")!.id] as StudioV3State["interests"],
    rhythm: RHYTHMS.find((x) => x.id === "balanced")!.id as StudioV3State["rhythm"],
    pickup: PICKUPS[0].id as StudioV3State["pickup"],
    investment: INVESTMENT_TIERS[0].id as StudioV3State["investment"],
    guests: 2,
    adults: 2,
    minorAges: [],
  };
}

function expectNoMoneyBeforeValue(text: string | null | undefined) {
  const value = text ?? "";
  expect(value).not.toMatch(/€/);
  expect(value).not.toMatch(/\bfrom\s+€?/i);
  expect(value).not.toMatch(/~\s*€/i);
  expect(value).not.toMatch(/\binvestment\b/i);
  expect(value).not.toMatch(/\bbudget\b/i);
}

describe("P9 — Price After Value", () => {
  it("ComposerMap keeps route/value cues but exposes no money or investment framing", () => {
    const { container } = render(<ComposerMap state={valueState()} />);
    expect(screen.getByTestId("studio-v3-composer-map")).toBeTruthy();
    expectNoMoneyBeforeValue(container.textContent);
  });

  it("Living Journey collapsed pill and opened draft remain value-first", () => {
    const { container } = render(<LivingJourneyPanel state={valueState()} />);
    expectNoMoneyBeforeValue(container.textContent);

    fireEvent.click(screen.getByRole("button", { name: "Open your journey draft" }));
    const dialog = screen.getByRole("dialog", { name: "Journey draft" });
    expectNoMoneyBeforeValue(dialog.textContent);
  });

  it("the public Studio no longer mounts the pre-value RunningInvestmentRibbon", () => {
    expect(studioSrc).not.toContain("<RunningInvestmentRibbon");
    expect(studioSrc).not.toContain('from "./RunningInvestmentRibbon"');
  });

  it("reveals investment only after route, editable moments and why-this-fits", () => {
    const routePos = studioSrc.indexOf('testId="studio-v3-unified-route"');
    const stopsPos = studioSrc.indexOf('data-testid="studio-v3-stops-editor"');
    const whyPos = studioSrc.indexOf('testId="studio-v3-travel-file-reasons"');
    const pricePos = studioSrc.indexOf("<SignaturePriceCard");

    for (const [label, pos] of [
      ["route", routePos],
      ["stops", stopsPos],
      ["why", whyPos],
      ["price", pricePos],
    ] as const) {
      expect(pos, `missing ${label} anchor`).toBeGreaterThan(-1);
    }
    expect(stopsPos).toBeGreaterThan(routePos);
    expect(whyPos).toBeGreaterThan(stopsPos);
    expect(pricePos).toBeGreaterThan(whyPos);
  });

  it("adds calm estimate context without changing the pricing authority surface", () => {
    const priceSrc = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/SignaturePriceCard.tsx"),
      "utf8",
    );
    expect(priceSrc).toContain("Estimated for ${composition}");
    expect(priceSrc).toContain("resolvedTotalEur");
    expect(priceSrc).toContain("resolvedPerPaxEur");
    expect(priceSrc).not.toMatch(/resolvedTotalEur\s*\/\s*(?:guests|effectiveGuests|partyCount)/);
  });
});
