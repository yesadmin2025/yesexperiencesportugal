/**
 * Studio Pass 2C — beat tiering + Living Day as the feedback surface.
 *
 * Locks:
 *   - only Feeling and the FIRST route-bearing map beat stay cinematic;
 *   - every other beat whispers into the Living Day and does not block;
 *   - whisper is presentation-only: no persistence, no replay on back/edit;
 *   - continue analytics semantics (event + `viaReaction`) are unchanged;
 *   - reduced motion still skips beats entirely;
 *   - Logistics suppresses the redundant acknowledgement while the Living Day
 *     is visible; refinement is untouched;
 *   - no curation / rhythm / route / pricing / checkout coupling was added.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render as rtlRender, screen, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { INITIAL_STATE, type StudioV3State } from "../types";

vi.mock("@/lib/studio-v3/compose-live-story.functions", () => ({
  composeLiveStory: Object.assign(() => Promise.resolve(null), { url: "/x" }),
}));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-start")>()),
  useServerFn: () => () => new Promise(() => {}),
}));
vi.mock("@/hooks/useBuilderSessionId", () => ({ useBuilderSessionId: () => "test-session" }));
vi.mock("@/lib/studio-analytics", () => ({ trackStudio: () => {} }));

import { LivingJourneyPanel } from "../LivingJourneyPanel";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);
const PANEL_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/LivingJourneyPanel.tsx"),
  "utf8",
);

function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function s(partial: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...partial };
}

const SHAPED = s({
  phase: "rhythm",
  feeling: "wine-food",
  companions: "couple",
  interests: ["wine"],
  rhythm: "balanced",
});

beforeEach(() => cleanup());

describe("Pass 2C — beat tiers", () => {
  const tierBlock = STUDIO_SRC.slice(
    STUDIO_SRC.indexOf("const playReaction = useCallback"),
    STUDIO_SRC.indexOf("// Single-select handlers"),
  );

  it("keeps exactly two cinematic tiers: Feeling and the first route map beat", () => {
    expect(tierBlock).toContain('const isRouteMapBeat = r.kind === "map-beat" && r.mapMode !== "origin"');
    expect(tierBlock).toContain(
      'const cinematic = r.kind === "feeling" || (isRouteMapBeat && !firstRouteBeatShownRef.current)',
    );
  });

  it("marks the first route beat as spent so later map beats whisper", () => {
    expect(tierBlock).toContain("if (cinematic && isRouteMapBeat) firstRouteBeatShownRef.current = true;");
    expect(STUDIO_SRC).toContain("const firstRouteBeatShownRef = useRef(false);");
  });

  it("demoted beats never mount the overlay and advance in one step", () => {
    const whisperBranch = tierBlock.slice(tierBlock.indexOf("if (!cinematic)"));
    expect(whisperBranch).toContain("setWhisper({ text: line, id: whisperSeq.current })");
    expect(whisperBranch).toContain("setReaction(null)");
    // No hold timer, no second setReaction that would re-open a beat.
    expect(whisperBranch.slice(0, whisperBranch.indexOf("return;"))).not.toMatch(/setReaction\(r\)/);
  });

  it("preserves exact continue analytics semantics for a whispered beat", () => {
    const whisperBranch = tierBlock.slice(tierBlock.indexOf("if (!cinematic)"));
    expect(whisperBranch).toContain('event: "continue"');
    expect(whisperBranch).toContain("value: { to: r.nextPhase, viaReaction: r.kind }");
  });

  it("still skips every beat under reduced motion, before tiering runs", () => {
    const reducedIdx = tierBlock.indexOf("prefersReducedMotion()");
    const tierIdx = tierBlock.indexOf("const cinematic =");
    expect(reducedIdx).toBeGreaterThan(-1);
    expect(reducedIdx).toBeLessThan(tierIdx);
  });

  it("clears the whisper on back and on edit jumps so it never replays", () => {
    const back = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("const back = useCallback"),
      STUDIO_SRC.indexOf("const playReaction = useCallback"),
    );
    expect(back.match(/setWhisper\(null\)/g)?.length).toBe(2); // back + jumpBackToPhase
  });

  it("never persists the whisper", () => {
    const persist = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("function writePersistedStudioState"),
      STUDIO_SRC.indexOf("export function StudioV3()"),
    );
    expect(persist).not.toContain("whisper");
  });

  it("adds no curation, rhythm, route or pricing coupling", () => {
    expect(tierBlock).not.toMatch(/RHYTHM_STOP_COUNT|priceFrom|resolveStudioV3Route|stripe/i);
  });
});

describe("Pass 2C — Living Day carries the feedback", () => {
  it("renders a whisper in the existing feedback slot", () => {
    render(
      <LivingJourneyPanel
        state={SHAPED}
        whisper={{ text: "Movement and pause, held in balance.", id: 1 }}
      />,
    );
    const el = screen.getByTestId("studio-v3-living-day-feedback");
    expect(el.textContent).toContain("Movement and pause");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveAttribute("data-whisper", "true");
  });

  it("fades on its own without a click and never becomes a phase", () => {
    vi.useFakeTimers();
    try {
      render(<LivingJourneyPanel state={SHAPED} whisper={{ text: "A clear date.", id: 2 }} />);
      expect(screen.getByTestId("studio-v3-living-day-feedback")).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(4500);
      });
      expect(screen.queryByTestId("studio-v3-living-day-feedback")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows nothing when no whisper is handed down", () => {
    render(<LivingJourneyPanel state={SHAPED} whisper={null} />);
    expect(screen.queryByTestId("studio-v3-living-day-feedback")).toBeNull();
  });

  it("stays hidden with the panel (no orphan whisper over a takeover phase)", () => {
    render(<LivingJourneyPanel state={SHAPED} hidden whisper={{ text: "Held.", id: 3 }} />);
    expect(screen.queryByTestId("studio-v3-living-day-feedback")).toBeNull();
  });

  it("keeps the whisper animation reduced-motion safe", () => {
    expect(PANEL_SRC).toContain("motion-reduce:animate-none");
  });
});

describe("Pass 2C — acknowledgement narration", () => {
  it("suppresses the logistics acknowledgement while the Living Day is visible", () => {
    expect(STUDIO_SRC).toContain(
      'if (surface === "logistics" && !livingDayHidden) return null;',
    );
  });

  it("leaves the refinement surface untouched", () => {
    const ack = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("const renderAcknowledgement ="),
      STUDIO_SRC.indexOf("const orderedRhythms"),
    );
    expect(ack).not.toContain('surface === "refinement"');
    expect(STUDIO_SRC).toContain('renderAcknowledgement("refinement")');
  });
});
