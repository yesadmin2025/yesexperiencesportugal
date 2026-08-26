import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeStudioFunnelStats,
  STUDIO_FUNNEL_STEPS,
  type StudioFunnelMetricRow,
} from "../funnelMetrics";

function row(
  session: string,
  step: string,
  event: string,
  value: Record<string, unknown> | null = null,
  createdAt = "2026-08-26T12:00:00.000Z",
): StudioFunnelMetricRow {
  return {
    session_id: session,
    step_number: 1,
    step_key: step,
    event,
    value,
    created_at: createdAt,
  };
}

describe("P11 · current Studio funnel model", () => {
  it("uses the real P5-P10 traveller path, not the retired dashboard sequence", () => {
    expect(STUDIO_FUNNEL_STEPS.map((step) => step.key)).toEqual([
      "feeling",
      "who",
      "interests",
      "rhythm",
      "refinement",
      "logistics",
      "storyboard",
      "guestDetails",
      "checkoutSummary",
    ]);
    expect(STUDIO_FUNNEL_STEPS.map((step) => step.key)).not.toContain("companions");
    expect(STUDIO_FUNNEL_STEPS.map((step) => step.key)).not.toContain("configurator");
    expect(STUDIO_FUNNEL_STEPS.map((step) => step.key)).not.toContain("secure");
  });

  it("computes reach, completion and drop-off by unique session", () => {
    const stats = computeStudioFunnelStats([
      row("a", "feeling", "enter"),
      row("a", "feeling", "continue", { ms_on_step: 1200 }),
      row("b", "feeling", "enter"),
      row("b", "feeling", "abandon", { ms_on_step: 3000 }),
      row("a", "who", "enter"),
    ]);
    const feeling = stats.perStep.find((step) => step.key === "feeling");
    expect(stats.totalSessions).toBe(2);
    expect(feeling).toMatchObject({
      reached: 2,
      completed: 1,
      dropPct: 50,
      reachPct: 100,
      medianMs: 2100,
    });
  });

  it("does not invent terminal checkout drop-off", () => {
    const stats = computeStudioFunnelStats([row("a", "checkoutSummary", "enter")]);
    const checkout = stats.perStep.find((step) => step.key === "checkoutSummary");
    expect(checkout?.terminal).toBe(true);
    expect(checkout?.completed).toBeNull();
    expect(checkout?.dropPct).toBeNull();
    expect(stats.checkoutReached).toBe(1);
  });

  it("counts semantic milestones once per session", () => {
    const stats = computeStudioFunnelStats([
      row("a", "directors_read", "milestone", { studio_event: "interpretation_viewed" }),
      row("a", "directors_read", "milestone", { studio_event: "interpretation_viewed" }),
      row("b", "interests", "milestone", { studio_event: "surprise_me_selected" }),
      row("a", "logistics", "milestone", { studio_event: "logistics_completed" }),
      row("a", "storyboard", "milestone", { studio_event: "moment_swapped" }),
      row("a", "storyboard", "milestone", { studio_event: "price_expanded" }),
    ]);
    expect(stats.milestones).toEqual({
      directorsRead: 1,
      delegated: 1,
      logisticsCompleted: 1,
      mapViewed: 0,
      refined: 1,
      priceExpanded: 1,
    });
  });

  it("measures investment tier conversion to checkout reach, not pretend purchase", () => {
    const stats = computeStudioFunnelStats([
      row("a", "investment", "tier_chosen", { tier: "elevated" }, "2026-08-26T10:00:00Z"),
      row("a", "checkoutSummary", "enter", null, "2026-08-26T10:10:00Z"),
      row("b", "investment", "tier_chosen", { tier: "elevated" }, "2026-08-26T11:00:00Z"),
      row("c", "investment", "tier_chosen", { tier: "considered" }, "2026-08-26T12:00:00Z"),
      row("c", "checkoutSummary", "enter", null, "2026-08-26T12:10:00Z"),
    ]);
    expect(stats.tiers).toEqual([
      { tier: "elevated", picks: 2, checkoutReached: 1, rate: 50 },
      { tier: "considered", picks: 1, checkoutReached: 1, rate: 100 },
    ]);
  });

  it("uses the traveller's latest tier once per session", () => {
    const stats = computeStudioFunnelStats([
      row("a", "investment", "tier_chosen", { tier: "considered" }, "2026-08-26T10:00:00Z"),
      row("a", "investment", "tier_chosen", { tier: "elevated" }, "2026-08-26T10:02:00Z"),
      row("a", "checkoutSummary", "enter", null, "2026-08-26T10:10:00Z"),
    ]);
    expect(stats.tiers).toEqual([
      { tier: "elevated", picks: 1, checkoutReached: 1, rate: 100 },
    ]);
  });
});

describe("P11 · instrumentation contract", () => {
  const analytics = readFileSync(resolve(process.cwd(), "src/lib/studio-analytics.ts"), "utf8");
  const funnel = readFileSync(resolve(process.cwd(), "src/lib/studio-v3-funnel.ts"), "utf8");
  const dashboard = readFileSync(
    resolve(process.cwd(), "src/routes/admin.studio-v3-funnel.tsx"),
    "utf8",
  );

  it("persists semantic events as funnel milestones without changing GA routing", () => {
    expect(funnel).toContain('| "milestone"');
    expect(analytics).toContain('event: "milestone"');
    expect(analytics).toContain('value: { studio_event: event, ...safeRest }');
    expect(analytics).toContain('trackEvent((ga ?? "studio_step_completed")');
  });

  it("keeps true native funnel events single-write and never treats price expansion as a tier choice", () => {
    expect(analytics).toContain('guest_details_started: "secure_open"');
    expect(analytics).not.toContain('price_expanded: "tier_chosen"');
    expect(analytics).toContain("if (funnel)");
  });

  it("strips contact/identity fields before internal funnel persistence", () => {
    expect(analytics).toContain("STUDIO_PII_KEYS");
    expect(analytics).toContain('"email"');
    expect(analytics).toContain('"phone"');
    expect(analytics).toContain('"full_name"');
    expect(analytics).toContain('"pickup_address"');
    expect(analytics).toContain("stripStudioAnalyticsPii");
    expect(analytics).toContain("safeRest");
  });

  it("dashboard consumes the pure current-flow aggregator", () => {
    expect(dashboard).toContain("computeStudioFunnelStats");
    expect(dashboard).not.toContain("const STEP_ORDER");
    expect(dashboard).toContain("Investment tier → checkout");
    expect(dashboard).not.toContain("Investment tier → confirmation");
  });
});
