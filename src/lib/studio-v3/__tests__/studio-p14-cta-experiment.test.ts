import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  P14_YOUR_DAY_CTA_CLICK_EVENT,
  P14_YOUR_DAY_CTA_TEST_ID,
  P14_YOUR_DAY_CTA_VARIANTS,
  assignP14YourDayCtaVariant,
  p14YourDayCtaLabelForVariant,
  readStoredP14YourDayCtaVariant,
} from "../experiments";
import { getFunnelVariant } from "@/lib/studio-v3-funnel";
import { computeStudioFunnelStats, type StudioFunnelMetricRow } from "../funnelMetrics";

const SESSION_KEY = "studio-v3.funnel.session.v1";
const VARIANT_KEY = "studio-v3.funnel.variant.v1";

function row(
  session_id: string,
  step_key: string,
  event: string,
  variant: string,
  value: Record<string, unknown> | null = null,
): StudioFunnelMetricRow {
  return {
    session_id,
    step_number: 0,
    step_key,
    event,
    value,
    variant,
    created_at: "2026-08-26T20:00:00.000Z",
  };
}

describe("P14 · Your Day CTA experiment assignment", () => {
  beforeEach(() => {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(VARIANT_KEY);
  });

  it("is deterministic for the same funnel session", () => {
    const first = assignP14YourDayCtaVariant("session-fixed-001");
    const second = assignP14YourDayCtaVariant("session-fixed-001");
    expect(second).toBe(first);
    expect(Object.values(P14_YOUR_DAY_CTA_VARIANTS)).toContain(first);
  });

  it("is reasonably balanced over a fixed deterministic population", () => {
    const assignments = Array.from({ length: 400 }, (_, index) =>
      assignP14YourDayCtaVariant(`session-${index.toString().padStart(3, "0")}`),
    );
    const story = assignments.filter((arm) => arm === P14_YOUR_DAY_CTA_VARIANTS.story).length;
    expect(story).toBeGreaterThanOrEqual(160);
    expect(story).toBeLessThanOrEqual(240);
  });

  it("reuses a stored P14 arm and never replaces an unrelated active variant", () => {
    window.sessionStorage.setItem(VARIANT_KEY, P14_YOUR_DAY_CTA_VARIANTS.story);
    expect(getFunnelVariant()).toBe(P14_YOUR_DAY_CTA_VARIANTS.story);

    window.sessionStorage.setItem(VARIANT_KEY, "future_experiment_control");
    expect(getFunnelVariant()).toBe("future_experiment_control");
  });

  it("assigns an unassigned session once and persists the result", () => {
    window.sessionStorage.setItem(SESSION_KEY, "stable-session-123");
    const expected = assignP14YourDayCtaVariant("stable-session-123");
    expect(getFunnelVariant()).toBe(expected);
    expect(window.sessionStorage.getItem(VARIANT_KEY)).toBe(expected);
    expect(getFunnelVariant()).toBe(expected);
  });

  it("lets presentation read only P14 arms without creating or hijacking assignment", () => {
    expect(readStoredP14YourDayCtaVariant()).toBeNull();

    window.sessionStorage.setItem(VARIANT_KEY, P14_YOUR_DAY_CTA_VARIANTS.story);
    expect(readStoredP14YourDayCtaVariant()).toBe(P14_YOUR_DAY_CTA_VARIANTS.story);

    window.sessionStorage.setItem(VARIANT_KEY, "future_experiment_control");
    expect(readStoredP14YourDayCtaVariant()).toBeNull();
    expect(window.sessionStorage.getItem(VARIANT_KEY)).toBe("future_experiment_control");
  });

  it("keeps the two CTA promises exact and non-transactional", () => {
    expect(p14YourDayCtaLabelForVariant(P14_YOUR_DAY_CTA_VARIANTS.control)).toBe(
      "Continue to guest details",
    );
    expect(p14YourDayCtaLabelForVariant(P14_YOUR_DAY_CTA_VARIANTS.story)).toBe(
      "Make this my day in Portugal",
    );
    expect(p14YourDayCtaLabelForVariant(null)).toBe("Continue to guest details");
  });
});

describe("P14 · experiment conversion truth", () => {
  it("uses Your Day reach as the handoff denominator and dedupes repeated clicks", () => {
    const control = P14_YOUR_DAY_CTA_VARIANTS.control;
    const story = P14_YOUR_DAY_CTA_VARIANTS.story;
    const rows = [
      row("c1", "intro", "enter", control),
      row("c1", "storyboard", "enter", control),
      row("c1", "storyboard", "milestone", control, { studio_event: P14_YOUR_DAY_CTA_CLICK_EVENT }),
      row("c1", "storyboard", "milestone", control, { studio_event: P14_YOUR_DAY_CTA_CLICK_EVENT }),
      row("c1", "guestDetails", "enter", control),
      row("c2", "intro", "enter", control),
      row("c2", "storyboard", "enter", control),
      row("s1", "intro", "enter", story),
      row("s1", "storyboard", "enter", story),
      row("s1", "storyboard", "milestone", story, { studio_event: P14_YOUR_DAY_CTA_CLICK_EVENT }),
      row("s1", "guestDetails", "enter", story),
      row("s1", "checkoutSummary", "enter", story),
      row("s2", "intro", "enter", story),
    ];

    const stats = computeStudioFunnelStats(rows);
    const controlStats = stats.variants.find((variant) => variant.variant === control);
    const storyStats = stats.variants.find((variant) => variant.variant === story);

    expect(controlStats).toMatchObject({
      sessions: 2,
      yourDayReached: 2,
      handoffClicked: 1,
      handoffRate: 50,
      guestDetailsReached: 1,
      guestDetailsRate: 50,
    });
    expect(storyStats).toMatchObject({
      sessions: 2,
      yourDayReached: 1,
      handoffClicked: 1,
      handoffRate: 100,
      guestDetailsReached: 1,
      guestDetailsRate: 100,
      checkoutReached: 1,
    });
  });

  it("returns zero instead of inventing a rate when a variant never reached Your Day", () => {
    const variant = P14_YOUR_DAY_CTA_VARIANTS.story;
    const stats = computeStudioFunnelStats([row("s1", "intro", "enter", variant)]);
    expect(stats.variants[0]).toMatchObject({
      yourDayReached: 0,
      handoffClicked: 0,
      handoffRate: 0,
    });
  });
});

describe("P14 · presentation isolation", () => {
  it("targets only the unified Your Day handoff, assigns before child render and lazy-loads click analytics", () => {
    const ctaSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/CtaButton.tsx"),
      "utf8",
    );
    const storySource = fs.readFileSync(
      path.join(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
      "utf8",
    );
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/studio-v3/LivingAtlasStudioPage.tsx"),
      "utf8",
    );

    expect(P14_YOUR_DAY_CTA_TEST_ID).toBe("studio-v3-handoff-primary");
    expect(ctaSource).toContain("testId === P14_YOUR_DAY_CTA_TEST_ID");
    expect(ctaSource).toContain("readStoredP14YourDayCtaVariant()");
    expect(ctaSource).toContain('import("@/lib/studio-v3/experimentRuntime")');
    expect(ctaSource).not.toContain("currentP14YourDayCtaLabel");
    expect(pageSource).toContain("getFunnelVariant();");
    expect(storySource).toContain('data-testid="studio-v3-handoff-primary"');
    expect(storySource).toContain('onSecure={() => advance("guestDetails")}');
  });
});
