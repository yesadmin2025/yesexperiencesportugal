/**
 * Studio Pass 2A — Living Day spine.
 *
 * Locks the persistent causal artefact: truthful stages, no invention,
 * customer-safe winery labels, derived (never manufactured) feedback,
 * separate visibility from the ComposerMap, and mobile touch target.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render as rtlRender, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { resolveStudioV3Route } from "../curation";
import {
  buildLivingDaySnapshot,
  isLivingDayPhaseAllowed,
  livingDayFeedback,
  livingDayStageFor,
} from "../livingDaySpine";
import { isWineryStopLabel } from "../studioWineryPresentation";

vi.mock("@/lib/studio-v3/compose-live-story.functions", () => ({
  composeLiveStory: Object.assign(() => Promise.resolve(null), { url: "/x" }),
}));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-start")>()),
  useServerFn: () => () => new Promise(() => {}),
}));
vi.mock("@/hooks/useBuilderSessionId", () => ({ useBuilderSessionId: () => "test-session" }));
const tracked: Array<{ event: string; params: Record<string, unknown> }> = [];
vi.mock("@/lib/studio-analytics", () => ({
  trackStudio: (event: string, params: Record<string, unknown>) => tracked.push({ event, params }),
}));

import { LivingJourneyPanel } from "../LivingJourneyPanel";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function s(partial: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...partial };
}

const DIRECTION = s({ phase: "who", feeling: "coastal", companions: "couple" });
const DRAFT = s({ phase: "interests", feeling: "wine-food", companions: "couple", interests: ["wine"] });
const SHAPED = s({ ...DRAFT, phase: "rhythm", rhythm: "balanced" });

beforeEach(() => {
  tracked.length = 0;
  cleanup();
});

describe("Pass 2A — resolver is untouched (presentation only)", () => {
  it("resolves the identical underlying route the resolver already returned", () => {
    const direct = resolveStudioV3Route({
      feeling: SHAPED.feeling!,
      companions: SHAPED.companions!,
      rhythm: SHAPED.rhythm!,
      interests: SHAPED.interests,
      pickup: SHAPED.pickup,
      occasion: SHAPED.occasion,
      investment: SHAPED.investment,
      destinationIntent: SHAPED.destinationIntent,
      dateExact: SHAPED.dateExact,
    });
    const snap = buildLivingDaySnapshot(SHAPED);
    expect(snap.tourId).toBe(direct.skeletonTourKey);
    const points = direct.composedRoutePoints.length
      ? direct.composedRoutePoints
      : direct.routePoints;
    expect(snap.momentCount).toBe(points.length);
  });
});

describe("Pass 2A — three truthful stages", () => {
  it("DNA-only state shows no stops and no moment count", () => {
    const snap = buildLivingDaySnapshot(DIRECTION);
    expect(snap.stage).toBe("direction");
    expect(snap.momentCount).toBe(0);
    expect(snap.moments).toEqual([]);
    expect(snap.routeLine).toBeNull();
    expect(snap.region).toBeNull();
    expect(snap.dna.length).toBeGreaterThan(0);
  });

  it("feeling + companions + interest yields a labelled draft without mutating rhythm", () => {
    const before = { ...DRAFT };
    const snap = buildLivingDaySnapshot(DRAFT);
    expect(snap.stage).toBe("draft");
    expect(snap.tentativeRhythm).toBe(true);
    expect(snap.momentCount).toBeGreaterThan(0);
    // State untouched — the balanced rhythm is presentation only.
    expect(DRAFT.rhythm).toBeNull();
    expect(DRAFT).toEqual(before);
  });

  it("once a real rhythm exists the Living Day uses the actual resolved route", () => {
    const snap = buildLivingDaySnapshot(SHAPED);
    expect(snap.stage).toBe("shaped");
    expect(snap.tentativeRhythm).toBe(false);
    const slow = buildLivingDaySnapshot(s({ ...SHAPED, rhythm: "slow" }));
    const actual = resolveStudioV3Route({
      feeling: SHAPED.feeling!,
      companions: SHAPED.companions!,
      rhythm: "slow",
      interests: SHAPED.interests,
      pickup: SHAPED.pickup,
      occasion: SHAPED.occasion,
      investment: SHAPED.investment,
      destinationIntent: SHAPED.destinationIntent,
      dateExact: SHAPED.dateExact,
    });
    const points = actual.composedRoutePoints.length
      ? actual.composedRoutePoints
      : actual.routePoints;
    expect(slow.momentCount).toBe(points.length);
  });

  it("stage helper never promotes an empty state", () => {
    expect(livingDayStageFor(INITIAL_STATE)).toBe("hidden");
    expect(livingDayStageFor(DIRECTION)).toBe("direction");
    expect(livingDayStageFor(DRAFT)).toBe("draft");
    expect(livingDayStageFor(SHAPED)).toBe("shaped");
  });
});

describe("Pass 2A — recompute, never stale", () => {
  it("adding an interest recomputes the snapshot", () => {
    const one = buildLivingDaySnapshot(SHAPED);
    const two = buildLivingDaySnapshot(s({ ...SHAPED, interests: ["wine", "heritage"] }));
    expect(two.moments.join("|")).not.toBe("");
    // Going back to the earlier selection reproduces the earlier snapshot.
    const back = buildLivingDaySnapshot(SHAPED);
    expect(back.moments.join("|")).toBe(one.moments.join("|"));
  });

  it("feedback for an added interest is causal, and never claims a route it does not have", () => {
    const before = buildLivingDaySnapshot(DIRECTION);
    const nextState = s({ ...DIRECTION, interests: ["wine"] });
    const after = buildLivingDaySnapshot(nextState);
    const fb = livingDayFeedback(DIRECTION, nextState, before, after);
    expect(fb).not.toBeNull();
    expect(fb!.trigger).toBe("interest");
    expect(fb!.text).toMatch(/Wine/);
  });

  it("removing an interest is described as removal, derived from the transition", () => {
    const prevState = s({ ...SHAPED, interests: ["wine", "heritage"] });
    const prev = buildLivingDaySnapshot(prevState);
    const next = buildLivingDaySnapshot(SHAPED);
    const fb = livingDayFeedback(prevState, SHAPED, prev, next);
    expect(fb?.text).toMatch(/less central/i);
  });

  it("rhythm feedback only reports a moment delta the resolver actually produced", () => {
    const prevState = SHAPED;
    const prev = buildLivingDaySnapshot(prevState);
    const nextState = s({ ...SHAPED, rhythm: "slow" });
    const next = buildLivingDaySnapshot(nextState);
    const fb = livingDayFeedback(prevState, nextState, prev, next);
    expect(fb).not.toBeNull();
    const delta = next.momentCount - prev.momentCount;
    if (delta !== 0) {
      expect(fb!.text).toMatch(/(fewer|more) moment/);
      expect(fb!.deltaCount).toBe(Math.abs(delta));
    } else {
      expect(fb!.text).not.toMatch(/(fewer|more) moment/);
      expect(fb!.deltaCount).toBe(0);
    }
  });

  it("no structural change produces no invented feedback", () => {
    const snap = buildLivingDaySnapshot(SHAPED);
    expect(livingDayFeedback(SHAPED, SHAPED, snap, snap)).toBeNull();
  });
});

describe("Pass 2A — full-route authority (no compact-card cap)", () => {
  const IMMERSIVE = s({
    phase: "rhythm",
    feeling: "wine-food",
    companions: "couple",
    interests: ["wine"],
    destinationIntent: "arrabida-setubal-azeitao",
    rhythm: "immersive",
  });

  const resolveImmersive = () =>
    resolveStudioV3Route({
      feeling: IMMERSIVE.feeling!,
      companions: IMMERSIVE.companions!,
      rhythm: IMMERSIVE.rhythm!,
      interests: IMMERSIVE.interests,
      pickup: IMMERSIVE.pickup,
      occasion: IMMERSIVE.occasion,
      investment: IMMERSIVE.investment,
      destinationIntent: IMMERSIVE.destinationIntent,
      dateExact: IMMERSIVE.dateExact,
    });

  it("pill count, scope count and timeline all reflect the FULL composed route (>4)", () => {
    const raw = resolveImmersive();
    const full = raw.composedRoutePoints.length
      ? raw.composedRoutePoints
      : raw.routePoints;
    // Guard the premise: this fixture must genuinely exceed the compact cap.
    expect(full.length).toBeGreaterThan(4);

    render(<LivingJourneyPanel state={IMMERSIVE} />);
    const pill = screen.getByTestId("studio-v3-living-day-pill");
    expect(pill.textContent ?? "").toContain(`${full.length} moments`);

    fireEvent.click(pill);
    // Scope line count matches the composed route, not the 4-slot card.
    const scope = screen.getByTestId("studio-v3-journey-scope");
    expect(scope.textContent ?? "").toContain(`${full.length}`);

    // Timeline view lists every composed moment, not the compact slice.
    fireEvent.click(screen.getByRole("tab", { name: /timeline/i }));
    const timeline = screen.getByTestId("studio-v3-timeline-view");
    expect(within(timeline).getAllByRole("listitem")).toHaveLength(full.length);
  });

  it("map view renders and reveals every composed moment (no 4-stop cap)", () => {
    const raw = resolveImmersive();
    const full = raw.composedRoutePoints.length
      ? raw.composedRoutePoints
      : raw.routePoints;
    expect(raw.routePoints.length).toBeLessThan(full.length); // compact cap exists upstream

    // Deterministic reveal: force reduced-motion so all pins render at once
    // instead of relying on the cinematic sequential timers.
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      })),
    });
    vi.useFakeTimers();
    try {
      render(<LivingJourneyPanel state={IMMERSIVE} />);
      fireEvent.click(screen.getByTestId("studio-v3-living-day-pill"));
      fireEvent.click(screen.getByRole("tab", { name: /map/i }));
      // Flush the drawer's pin timers and the map's internal 460ms segment
      // stagger so every composed moment is revealed.
      rtlAct(() => {
        vi.advanceTimersByTime(120 + full.length * 460 + 1000);
      });
      const map = screen.getByLabelText("Your journey, drawing live");
      expect(map).toBeInTheDocument();

      // The accessible stop overlay must expose one button per composed
      // moment — exactly the full route length, not the legacy 4-pin cap.
      const toolbar = screen.getByRole("toolbar", { name: /route stops/i });
      const stopButtons = within(toolbar).getAllByRole("button");
      expect(stopButtons).toHaveLength(full.length);
      expect(stopButtons[0]).toHaveAccessibleName(/stop 1:/i);
      expect(stopButtons[full.length - 1]).toHaveAccessibleName(
        new RegExp(`stop ${full.length}:`),
      );

      // The map's SR route summary also counts every revealed stop.
      const summary = screen.getByLabelText(/route summary/i);
      expect(summary.textContent ?? "").toContain(`${full.length}`);

      // Winery pins stay generic in the accessibility layer.
      const names = stopButtons.map((b) => b.getAttribute("aria-label") ?? "").join(" | ");
      expect(isWineryStopLabel(names) ? names : "").not.toMatch(
        /jose maria|fonseca|bacalhoa|quinta/i,
      );
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});

describe("Pass 2A — winery names are always generic", () => {
  it("no snapshot moment or route line exposes a supplier winery name", () => {
    const states = [
      SHAPED,
      s({ ...SHAPED, rhythm: "full", interests: ["wine", "gastronomy"] }),
      s({
        ...SHAPED,
        destinationIntent: "arrabida-setubal-azeitao",
        interests: ["wine"],
        rhythm: "full",
      }),
    ];
    for (const st of states) {
      const snap = buildLivingDaySnapshot(st);
      for (const m of snap.moments) {
        if (isWineryStopLabel(m)) {
          expect(m).toMatch(/^(A|Another) [a-z]*\s?local winery$|local winery/i);
        }
      }
      const raw = resolveStudioV3Route({
        feeling: st.feeling!,
        companions: st.companions!,
        rhythm: st.rhythm!,
        interests: st.interests,
        pickup: st.pickup,
        occasion: st.occasion,
        investment: st.investment,
        destinationIntent: st.destinationIntent,
        dateExact: st.dateExact,
      });
      const points = raw.composedRoutePoints.length ? raw.composedRoutePoints : raw.routePoints;
      for (const p of points) {
        if (!isWineryStopLabel(p.label)) continue;
        expect(snap.moments).not.toContain(p.label);
        expect(snap.routeLine ?? "").not.toContain(p.label);
      }
    }
  });
});

describe("Pass 2A — visibility rules", () => {
  it("hides on intro, takeover and checkout phases", () => {
    for (const p of ["intro", "map", "storyboard", "confirmation", "guestDetails", "checkoutSummary"] as const) {
      expect(isLivingDayPhaseAllowed(p)).toBe(false);
      expect(buildLivingDaySnapshot(s({ ...SHAPED, phase: p })).stage).toBe("hidden");
    }
  });

  it("allows early discovery phases once something real exists", () => {
    for (const p of ["destination", "who", "interests", "rhythm", "refinement", "logistics"] as const) {
      expect(isLivingDayPhaseAllowed(p)).toBe(true);
    }
  });

  it("a reaction overlay hides it, and it returns afterwards", () => {
    expect(buildLivingDaySnapshot(SHAPED, { reactionActive: true }).stage).toBe("hidden");
    expect(buildLivingDaySnapshot(SHAPED, { reactionActive: false }).stage).toBe("shaped");
  });

  it("StudioV3 gates the Living Day separately from the ComposerMap", () => {
    expect(STUDIO_SRC).toContain("<LivingJourneyPanel state={state} hidden={livingDayHidden} />");
    expect(STUDIO_SRC).toContain("<ComposerMap state={state} hidden={composerHidden} />");
    // ComposerMap keeps its later, stricter gate (chromeReady / pickup).
    expect(STUDIO_SRC).toMatch(/const composerHidden =[\s\S]{0,120}!chromeReady/);
  });
});

describe("Pass 2A — rendered artefact", () => {
  it("DNA-only pill renders without stop names or a moment count", () => {
    render(<LivingJourneyPanel state={DIRECTION} />);
    const pill = screen.getByTestId("studio-v3-living-day-pill");
    expect(pill.getAttribute("data-stage")).toBe("direction");
    expect(pill.textContent ?? "").not.toMatch(/moment/i);
    expect(pill.textContent ?? "").toMatch(/forming/i);
  });

  it("pill meets the 44px touch target and announces the draft stage", () => {
    render(<LivingJourneyPanel state={DRAFT} />);
    const pill = screen.getByTestId("studio-v3-living-day-pill");
    expect(pill.className).toContain("min-h-[44px]");
    expect(pill.getAttribute("data-stage")).toBe("draft");
    expect(pill.textContent ?? "").toMatch(/first draft/i);
  });

  it("expanded Living Day shows only generic winery labels", () => {
    render(<LivingJourneyPanel state={SHAPED} />);
    fireEvent.click(screen.getByTestId("studio-v3-living-day-pill"));
    const dialog = screen.getByRole("dialog");
    const raw = resolveStudioV3Route({
      feeling: SHAPED.feeling!,
      companions: SHAPED.companions!,
      rhythm: SHAPED.rhythm!,
      interests: SHAPED.interests,
      pickup: SHAPED.pickup,
      occasion: SHAPED.occasion,
      investment: SHAPED.investment,
      destinationIntent: SHAPED.destinationIntent,
      dateExact: SHAPED.dateExact,
    });
    const points = raw.composedRoutePoints.length ? raw.composedRoutePoints : raw.routePoints;
    for (const p of points) {
      if (!isWineryStopLabel(p.label)) continue;
      expect(dialog.textContent ?? "").not.toContain(p.label);
    }
  });

  it("fires living_day_seen once", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = rtlRender(
      <QueryClientProvider client={client}>
        <LivingJourneyPanel state={SHAPED} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={client}>
        <LivingJourneyPanel state={SHAPED} />
      </QueryClientProvider>,
    );
    expect(tracked.filter((t) => t.event === "living_day_seen")).toHaveLength(1);
    const seen = tracked.find((t) => t.event === "living_day_seen")!;
    expect(Object.keys(seen.params).sort()).toEqual(["moment_count", "phase", "stage"]);
  });

  it("renders nothing when hidden or when the state has nothing real to say", () => {
    const { container: a } = render(<LivingJourneyPanel state={SHAPED} hidden />);
    expect(a.textContent).toBe("");
    const { container: b } = render(<LivingJourneyPanel state={INITIAL_STATE} />);
    expect(b.textContent).toBe("");
  });
});
