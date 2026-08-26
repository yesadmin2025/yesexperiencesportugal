import { beforeEach, describe, expect, it } from "vitest";
import {
  computeStudioFunnelStats,
  STUDIO_FUNNEL_STEPS,
  type StudioFunnelMetricRow,
} from "../funnelMetrics";
import { enrichStudioFunnelTiming, resetStudioFunnelTimingForTests } from "../funnelTiming";
import { stripStudioAnalyticsPii } from "@/lib/studio-analytics";

function row(
  session_id: string,
  step_key: string,
  event: string,
  value: Record<string, unknown> | null = null,
  created_at = "2026-08-26T18:00:00.000Z",
  variant: string | null = null,
): StudioFunnelMetricRow {
  return {
    session_id,
    step_number: 0,
    step_key,
    event,
    value,
    created_at,
    variant,
  };
}

describe("P11 · live Studio funnel shape", () => {
  it("matches the current traveller-facing sequence and excludes retired phases", () => {
    const keys = STUDIO_FUNNEL_STEPS.map((step) => step.key);
    expect(keys).toEqual([
      "intro",
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
    expect(keys).not.toContain("destination");
    expect(keys).not.toContain("investment");
    expect(keys).not.toContain("addons");
    expect(keys).not.toContain("configurator");
    expect(keys).not.toContain("secure");
  });

  it("dedupes repeated events by session and counts real step completion", () => {
    const rows = [
      row("a", "intro", "enter"),
      row("a", "intro", "enter"),
      row("a", "intro", "continue", { ms_on_step: 1200 }),
      row("a", "feeling", "enter"),
      row("a", "feeling", "back", { ms_on_step: 400 }),
      row("b", "intro", "enter"),
      row("b", "intro", "abandon", { ms_on_step: 3000 }),
    ];
    const stats = computeStudioFunnelStats(rows);
    const intro = stats.perStep.find((step) => step.key === "intro");
    const feeling = stats.perStep.find((step) => step.key === "feeling");
    expect(stats.totalSessions).toBe(2);
    expect(intro).toMatchObject({ reached: 2, completed: 1, dropPct: 50 });
    expect(feeling).toMatchObject({ reached: 1, completed: 0, dropPct: 100 });
    expect(intro?.medianMs).toBe(2100);
  });

  it("treats secure_confirm as Checkout completion and terminal timing", () => {
    const rows = [
      row("paid", "checkoutSummary", "enter"),
      row("paid", "checkoutSummary", "secure_confirm", { ms_on_step: 2500 }),
      row("left", "checkoutSummary", "enter"),
    ];
    const stats = computeStudioFunnelStats(rows);
    const checkout = stats.perStep.find((step) => step.key === "checkoutSummary");
    expect(stats.checkoutReached).toBe(2);
    expect(stats.confirmed).toBe(1);
    expect(checkout).toMatchObject({ reached: 2, completed: 1, dropPct: 50, medianMs: 2500 });
  });

  it("counts semantic milestones once per session", () => {
    const rows = [
      row("a", "directors_read", "milestone", { studio_event: "interpretation_viewed" }),
      row("a", "directors_read", "milestone", { studio_event: "interpretation_viewed" }),
      row("a", "interests", "milestone", { studio_event: "surprise_me_selected" }),
      row("a", "storyboard", "milestone", { studio_event: "price_expanded" }),
      row("b", "storyboard", "milestone", { studio_event: "moment_removed" }),
      row("b", "storyboard", "milestone", { studio_event: "moment_swapped" }),
      row("b", "logistics", "milestone", { studio_event: "logistics_completed" }),
    ];
    const stats = computeStudioFunnelStats(rows);
    expect(stats.milestones).toEqual({
      directorsRead: 1,
      delegated: 1,
      logisticsCompleted: 1,
      mapViewed: 0,
      refined: 1,
      priceExpanded: 1,
    });
  });

  it("keeps experiment variants session-based and conversion-ready", () => {
    const rows = [
      row("a", "intro", "enter", null, "2026-08-26T18:00:00.000Z", "control"),
      row("a", "storyboard", "enter", null, "2026-08-26T18:05:00.000Z", "control"),
      row("a", "checkoutSummary", "enter", null, "2026-08-26T18:10:00.000Z", "control"),
      row("a", "checkoutSummary", "secure_confirm", null, "2026-08-26T18:12:00.000Z", "control"),
      row("b", "intro", "enter", null, "2026-08-26T18:00:00.000Z", "control"),
      row("c", "intro", "enter", null, "2026-08-26T18:00:00.000Z", "director-copy-b"),
      row("c", "storyboard", "enter", null, "2026-08-26T18:05:00.000Z", "director-copy-b"),
    ];
    const stats = computeStudioFunnelStats(rows);
    expect(stats.variants).toEqual([
      {
        variant: "control",
        sessions: 2,
        yourDayReached: 1,
        handoffClicked: 0,
        guestDetailsReached: 0,
        checkoutReached: 1,
        confirmed: 1,
        yourDayRate: 50,
        handoffRate: 0,
        guestDetailsRate: 0,
        checkoutRate: 50,
        confirmedRate: 50,
      },
      {
        variant: "director-copy-b",
        sessions: 1,
        yourDayReached: 1,
        handoffClicked: 0,
        guestDetailsReached: 0,
        checkoutReached: 0,
        confirmed: 0,
        yourDayRate: 100,
        handoffRate: 0,
        guestDetailsRate: 0,
        checkoutRate: 0,
        confirmedRate: 0,
      },
    ]);
  });
});

describe("P11 · central phase timing", () => {
  beforeEach(() => resetStudioFunnelTimingForTests());

  it("adds elapsed time to exits without overwriting explicit timing", () => {
    expect(
      enrichStudioFunnelTiming({
        sessionId: "s",
        stepKey: "feeling",
        event: "enter",
        now: 1000,
      }),
    ).toEqual({});
    expect(
      enrichStudioFunnelTiming({
        sessionId: "s",
        stepKey: "feeling",
        event: "abandon",
        now: 2500,
      }),
    ).toEqual({ ms_on_step: 1500 });
    expect(
      enrichStudioFunnelTiming({
        sessionId: "s",
        stepKey: "feeling",
        event: "continue",
        now: 4000,
      }),
    ).toEqual({ ms_on_step: 3000 });

    enrichStudioFunnelTiming({
      sessionId: "s",
      stepKey: "who",
      event: "enter",
      now: 5000,
    });
    expect(
      enrichStudioFunnelTiming({
        sessionId: "s",
        stepKey: "who",
        event: "back",
        value: { ms_on_step: 777, to: "feeling" },
        now: 9000,
      }),
    ).toEqual({ ms_on_step: 777, to: "feeling" });

    enrichStudioFunnelTiming({
      sessionId: "s",
      stepKey: "checkoutSummary",
      event: "enter",
      now: 10000,
    });
    expect(
      enrichStudioFunnelTiming({
        sessionId: "s",
        stepKey: "checkoutSummary",
        event: "secure_confirm",
        now: 12500,
      }),
    ).toEqual({ ms_on_step: 2500 });
  });
});

describe("P11 · funnel privacy", () => {
  it("drops PII before semantic milestones reach the internal funnel", () => {
    expect(
      stripStudioAnalyticsPii({
        email: "traveller@example.com",
        full_name: "Traveller Name",
        phone: "+351900000000",
        pickup_address: "Private hotel address",
        notes: "Private note",
        intentId: "more-ocean",
        stops: 4,
      }),
    ).toEqual({ intentId: "more-ocean", stops: 4 });
  });
});
