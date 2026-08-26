from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(rel: str) -> str:
    return (ROOT / rel).read_text()

def write(rel: str, text: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------
# 1) Canonical legacy phase helper + exact old-map identity helper
# ---------------------------------------------------------------------
write("src/components/studio-v3/studioPhaseCanonical.ts", '''import type { StudioV3Phase } from "./types";

/**
 * P8 — one traveller-facing Your Day surface.
 *
 * `map` and `confirmation` remain valid historical ids so saved Studio state
 * can still be read, but both canonicalise to the unified `storyboard` reveal
 * before anything is rendered or persisted.
 */
export function canonicalStudioPhase(phase: StudioV3Phase): StudioV3Phase {
  return phase === "map" || phase === "confirmation" ? "storyboard" : phase;
}
''')

write("src/components/studio-v3/studioYourDayIdentity.ts", '''import { composeJourneyTitle, curateJourney } from "./curation";
import type { StudioV3State } from "./types";

export interface StudioYourDayIdentity {
  readonly tourId: string;
  readonly journeyTitle: string;
}

/**
 * Resolve the Signature identity with the exact deterministic curator that
 * powered the pre-P8 MapAwakens phase. P8 moves *when* the identity is fixed,
 * never how the tour is selected.
 */
export function resolveStudioYourDayIdentity(
  state: StudioV3State,
): StudioYourDayIdentity | null {
  if (!state.feeling || !state.companions || !state.rhythm) return null;

  const journey = curateJourney(state.feeling, state.companions, state.rhythm, {
    interests: state.interests,
    pickup: state.pickup,
    investment: state.investment,
    destinationIntent: state.destinationIntent,
    dateExact: state.dateExact,
    seed: state.rerollCount ?? 0,
  });
  const tour = journey.tour;
  return {
    tourId: tour.id,
    journeyTitle: composeJourneyTitle({
      feeling: state.feeling,
      companions: state.companions,
      occasion: state.occasion,
      pickup: state.pickup,
      interests: state.interests,
      rhythm: state.rhythm,
      region: tour.region ?? null,
    }),
  };
}
''')

# ---------------------------------------------------------------------
# 2) Phase relevance: keep ids, skip legacy screens in normal flow
# ---------------------------------------------------------------------
curation_path = "src/components/studio-v3/curation.ts"
c = read(curation_path)
c = replace_once(
    c,
    '  if (phase === "date" || phase === "pickup" || phase === "guests") return false;\n',
    '  if (phase === "date" || phase === "pickup" || phase === "guests") return false;\n  // P8: historical ids stay in the phase union/order for hydration, but the\n  // traveller now sees one canonical Your Day surface: `storyboard`.\n  if (phase === "map" || phase === "confirmation") return false;\n',
    "curation legacy reveal relevance",
)
write(curation_path, c)

# ---------------------------------------------------------------------
# 3) StudioV3 orchestration + unified StoryboardHandoff
# ---------------------------------------------------------------------
sv_path = "src/components/studio-v3/StudioV3.tsx"
s = read(sv_path)

# Imports.
s = replace_once(s, 'import { MapAwakens } from "./MapAwakens";\n', '', "remove MapAwakens import")
s = replace_once(s, 'import { CurtainRise } from "./CurtainRise";\n', '', "remove CurtainRise import")
s = replace_once(s, 'import { FinalRevealStory } from "./FinalRevealStory";\n', '', "remove FinalRevealStory import")
s = replace_once(s, 'import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";\n', '', "remove parent Living Atlas bridge import")
s = replace_once(
    s,
    'import { composeDirectorsRead, directorsReadBackTarget } from "./directorsRead";\n',
    'import { composeDirectorsRead, directorsReadBackTarget } from "./directorsRead";\nimport { canonicalStudioPhase } from "./studioPhaseCanonical";\nimport { resolveStudioYourDayIdentity } from "./studioYourDayIdentity";\n',
    "add P8 helpers",
)
s = replace_once(
    s,
    'import { YourDayFrame } from "@/components/studio-v3/YourDayFrame";\n',
    'import { YourDayFrame } from "@/components/studio-v3/YourDayFrame";\nimport { YourDayTimeline } from "./YourDayTimeline";\nimport { resolveYourDayMapTruth } from "./yourDayMapTruth";\n',
    "add Your Day truth imports",
)

# Session hydration canonicalises before the restored state ever renders.
old_restore = '''    const phase: StudioV3Phase =
      parsed.phase && PHASE_ORDER.includes(parsed.phase) && !NON_RESTORABLE_PHASES.has(parsed.phase)
        ? parsed.phase
        : "intro";
    if (phase === "intro") return null;
    return { ...INITIAL_STATE, ...parsed, phase };
'''
new_restore = '''    const restoredPhase: StudioV3Phase =
      parsed.phase && PHASE_ORDER.includes(parsed.phase) && !NON_RESTORABLE_PHASES.has(parsed.phase)
        ? parsed.phase
        : "intro";
    const phase = canonicalStudioPhase(restoredPhase);
    if (phase === "intro") return null;
    return { ...INITIAL_STATE, ...parsed, phase };
'''
s = replace_once(s, old_restore, new_restore, "session phase canonicalization")

# Normal explicit advances also canonicalise any stale legacy target.
old_advance = '''  const advance = useCallback((next: StudioV3Phase) => {
    // If a previous cinematic beat is still dissolving, remove it before any
    // explicit CTA transition. Otherwise mobile users can see the next screen
    // but taps still hit the old overlay, which feels like the builder froze.
    setReaction(null);
    setExiting(true);
    setState((s) => {
      // Phase-order guard — prevent CTA double-taps or stale handlers from
      // skipping forward out of sequence. The next phase must be either the
      // current one (no-op) or strictly *after* the current phase in
      // PHASE_ORDER. Anything else is dropped silently.
      const fromIdx = PHASE_ORDER.indexOf(s.phase);
      const toIdx = PHASE_ORDER.indexOf(next);
      if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) {
        setExiting(false);
        return s;
      }
      trackStep({
        stepNumber: stepOf(s.phase),
        stepKey: s.phase,
        event: "continue",
        value: { to: next },
      });
      return s;
    });
    window.setTimeout(() => {
      setState((s) => {
        const fromIdx = PHASE_ORDER.indexOf(s.phase);
        const toIdx = PHASE_ORDER.indexOf(next);
        if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) return s;
        return { ...s, phase: next };
      });
      setExiting(false);
    }, 380);
  }, []);
'''
new_advance = '''  const advance = useCallback((next: StudioV3Phase) => {
    const canonicalNext = canonicalStudioPhase(next);
    // If a previous cinematic beat is still dissolving, remove it before any
    // explicit CTA transition. Otherwise mobile users can see the next screen
    // but taps still hit the old overlay, which feels like the builder froze.
    setReaction(null);
    setExiting(true);
    setState((s) => {
      // Phase-order guard — prevent CTA double-taps or stale handlers from
      // skipping forward out of sequence. The next phase must be either the
      // current one (no-op) or strictly *after* the current phase in
      // PHASE_ORDER. Anything else is dropped silently.
      const fromIdx = PHASE_ORDER.indexOf(s.phase);
      const toIdx = PHASE_ORDER.indexOf(canonicalNext);
      if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) {
        setExiting(false);
        return s;
      }
      trackStep({
        stepNumber: stepOf(s.phase),
        stepKey: s.phase,
        event: "continue",
        value: { to: canonicalNext },
      });
      return s;
    });
    window.setTimeout(() => {
      setState((s) => {
        const fromIdx = PHASE_ORDER.indexOf(s.phase);
        const toIdx = PHASE_ORDER.indexOf(canonicalNext);
        if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) return s;
        return { ...s, phase: canonicalNext };
      });
      setExiting(false);
    }, 380);
  }, []);
'''
s = replace_once(s, old_advance, new_advance, "canonical advance")

# Parent-only confirmation intelligence disappears; Storyboard already resolves
# the same grounded data inside the unified surface.
start = s.index('  /**\n   * Living Atlas intelligence for the current answers.')
end = s.index('  // Guest Details snapshot', start)
s = s[:start] + '  // P8: Living Atlas reasons/alternatives are resolved inside the canonical Your Day.\n\n' + s[end:]

# Parent final-reveal save handler disappears; the unified surface already owns
# SaveSignatureButton with the same server function.
start = s.index('  // Save-my-signature handler for the Final Reveal secondary CTA.')
end = s.index('  const [detailsOpen, setDetailsOpen]', start)
s = s[:start] + s[end:]

# Logistics commits the exact old MapAwakens tour identity before reveal.
old_logistics = '''              const forward: StudioV3State = {
                ...state,
                adults: committedAdults,
                minorAges: committedMinors,
                guests: committedTotal,
                guestsPrivateEvent: committedTotal >= 11,
              };
              setState(() => forward);
              trackStudio("logistics_completed", {
                phase: "logistics",
                stepNumber: stepOf("logistics"),
                date_mode: forward.dateMode,
                guests: committedTotal,
              });
              // No blocking interpretation overlay: the acknowledgement already
              // happened inline, so we move straight into the composition.
              window.setTimeout(() => advance(getNextPhase(forward, "logistics")), 60);
'''
new_logistics = '''              const forward: StudioV3State = {
                ...state,
                adults: committedAdults,
                minorAges: committedMinors,
                guests: committedTotal,
                guestsPrivateEvent: committedTotal >= 11,
              };
              const identity = resolveStudioYourDayIdentity(forward);
              const committedForward: StudioV3State = identity
                ? {
                    ...forward,
                    tourId: identity.tourId,
                    journeyTitle: identity.journeyTitle,
                  }
                : forward;
              setState(() => committedForward);
              trackStudio("logistics_completed", {
                phase: "logistics",
                stepNumber: stepOf("logistics"),
                date_mode: committedForward.dateMode,
                guests: committedTotal,
              });
              // P8: identity is already fixed, so there is one payoff surface.
              window.setTimeout(
                () => advance(getNextPhase(committedForward, "logistics")),
                60,
              );
'''
s = replace_once(s, old_logistics, new_logistics, "logistics identity commit")

# Remove legacy traveller-facing map block completely.
map_start = s.index('      {state.phase === "map" && state.feeling && state.companions && state.rhythm ? (')
story_start = s.index('      {state.phase === "storyboard" ? (', map_start)
s = s[:map_start] + '      {/* P8: `map` remains a legacy id only; Your Day owns map/timeline truth. */}\n\n' + s[story_start:]

# Storyboard is the single reveal; no curtain gate, direct back/continue.
story_start = s.index('      {state.phase === "storyboard" ? (')
confirmation_start = s.index('      {state.phase === "confirmation" ? (', story_start)
story_segment = s[story_start:confirmation_start]
story_segment = replace_once(story_segment, '        <>\n          <CurtainRise state={state} />\n          <PhaseShell\n', '        <PhaseShell\n', "remove CurtainRise wrapper")
story_segment = replace_once(story_segment, '          </PhaseShell>\n        </>\n', '        </PhaseShell>\n', "close Storyboard PhaseShell")
story_segment = replace_once(story_segment, '              onBack={() => back("map")}\n', '              onBack={() => back("logistics")}\n', "storyboard back")
story_segment = replace_once(story_segment, '              onSecure={() => advance("confirmation")}\n', '              onSecure={() => advance("guestDetails")}\n', "storyboard direct continue")
s = s[:story_start] + story_segment + s[confirmation_start:]

# Remove legacy confirmation render block. Id remains accepted/canonicalised.
confirmation_start = s.index('      {state.phase === "confirmation" ? (')
guest_start = s.index('      {state.phase === "guestDetails" ? (', confirmation_start)
s = s[:confirmation_start] + '      {/* P8: `confirmation` remains a legacy id only and canonicalises to storyboard. */}\n\n' + s[guest_start:]

# Back from Guest Details now lands on canonical Your Day (back() also skips
# legacy ids by relevance, this makes the intent explicit at the call-site).
s = replace_once(s, '            onBack={() => back("confirmation")}\n', '            onBack={() => back("storyboard")}\n', "guest details back")

# Storyboard truth inputs: never use resolveRevealRouteStops' synthetic lastKnown
# coordinates to decide whether a map is earned.
anchor = '  const skeletonTour = resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null;\n'
truth_block = '''  const skeletonTour = resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null;

  const truthfulMoments = useMemo(() => {
    const byLabel = new Map(resolved.routePoints.map((p) => [p.label.toLowerCase(), p] as const));
    return editedStops.map((stop) => {
      const routePoint = byLabel.get(stop.label.toLowerCase());
      const lookup = lookupStopGeo(stop.label);
      return {
        label: stop.label,
        story: stop.story ?? null,
        location: skeletonTour?.region ?? null,
        lat: routePoint?.lat ?? lookup?.lat ?? null,
        lng: routePoint?.lng ?? lookup?.lng ?? null,
      };
    });
  }, [editedStops, resolved.routePoints, skeletonTour?.region]);
  const mapTruth = useMemo(() => resolveYourDayMapTruth(truthfulMoments), [truthfulMoments]);
  const mapViewKey = `${skeletonTour?.id ?? "none"}:${editedStops.map((s) => s.label).join("|")}`;
  const mapViewTracked = useRef<string | null>(null);
  useEffect(() => {
    if (mapTruth.mode !== "map" || mapViewTracked.current === mapViewKey) return;
    mapViewTracked.current = mapViewKey;
    trackStudio("map_viewed", {
      phase: "storyboard",
      tourId: skeletonTour?.id ?? null,
      stops: mapTruth.stops.length,
      routeGeometry: mapTruth.hasRouteGeometry,
    });
  }, [mapTruth, mapViewKey, skeletonTour?.id]);
'''
s = replace_once(s, anchor, truth_block, "truth-gated map inputs")

# Remove all blocking compose/pin timers. The unified surface is usable at
# first paint; motion can decorate descendants but never gates content/CTA.
cinematic_start = s.index('  // ---------- Cinematic 3-beat composing reveal (Fase 4) ----------')
cinematic_end = s.index('  // Max moments by rhythm', cinematic_start)
s = s[:cinematic_start] + '''  // P8: Your Day is immediately usable. No forced composing overlay and no
  // timer-gated pin reveal; reduced-motion and standard motion see the same
  // complete information hierarchy on first paint.
  const totalStops = editedStops.length;
  const revealedStops = totalStops;

''' + s[cinematic_end:]

# Update product contract copy.
s = s.replace('  // Product-flow contract (approved plan): this component owns the\n  // Refine screen. Three screens, one job each:\n  //   map        → MapAwakens              (cinematic route reveal)\n  //   storyboard → Refine (this component) (edit stops + add-ons + live price)\n  //   confirmation → Storytelling Signature (FinalRevealStory)\n', '  // P8 product-flow contract: this component owns the ONE Your Day payoff.\n  // `map` and `confirmation` are retained only as historical phase ids.\n')
s = replace_once(s, '      data-studio-v3-screen="refine"\n', '      data-studio-v3-screen="your-day"\n', "your-day screen id")

# Remove the old fixed composing overlay from JSX.
jsx_start = s.index('      {/* ---------- Fase 4 — Cinematic 3-beat composing reveal ---------- */}')
jsx_end = s.index('      <BackLink onClick={onBack} />', jsx_start)
s = s[:jsx_start] + s[jsx_end:]

# Header: one Your Day identity, plus actual journey title and region.
old_header = '''      <YourDayFrame
        className="pt-10"
        title={
          <span data-testid="studio-v3-signature-hero">
            Your day is ready.
            <br />
            <span className="italic" style={{ color: "var(--teal)" }}>
              Now you can refine it.
            </span>
          </span>
        }
      />
'''
new_header = '''      <YourDayFrame
        className="pt-10"
        title={
          <span data-testid="studio-v3-signature-hero">
            Your day,
            <br />
            <span className="italic" style={{ color: "var(--teal)" }}>
              shaped around you.
            </span>
          </span>
        }
      />
      <div className="mx-auto mt-4 max-w-[560px] text-center">
        <h2
          data-testid="studio-v3-journey-title"
          className="text-[22px] sm:text-[28px] leading-[1.2] [text-wrap:balance]"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
        >
          {journeyTitle}
        </h2>
        {skeletonTour?.region ? (
          <p
            data-testid="studio-v3-journey-region"
            className="mt-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold"
            style={{ color: "var(--gold)" }}
          >
            {skeletonTour.region}
          </p>
        ) : null}
      </div>
'''
s = replace_once(s, old_header, new_header, "unified Your Day header")

# Truth-gated map OR deliberate timeline. No duplicate numbered legend.
map_jsx_start = s.index('        {/* ---------- 2. Live route map ---------- */}')
map_jsx_end = s.index('        {/* Daypart timeline, story-of-day intentionally removed on Refine —', map_jsx_start)
new_map_jsx = '''        {/* ---------- 2. Truth-gated map OR editorial timeline ---------- */}
        {editedStops.length > 0 ? (
          <div
            data-testid="studio-v3-reveal-map"
            data-your-day-mode={mapTruth.mode}
            className="mt-8 mx-auto w-full max-w-[520px]"
          >
            {mapTruth.mode === "map" ? (
              <RevealRouteMap
                editedStops={editedStops}
                resolved={resolved}
                skeletonTour={skeletonTour ?? null}
                statePickup={state.pickup}
                revealedStops={revealedStops}
              />
            ) : (
              <YourDayTimeline moments={truthfulMoments} />
            )}
          </div>
        ) : null}

'''
s = s[:map_jsx_start] + new_map_jsx + s[map_jsx_end:]

# Remove pre-moments Living Atlas/alternatives; reinsert later in correct order.
living_start = s.index('        {/* Living Atlas intelligence — the same grounded reasoning')
stops_comment = s.index('        {/* ---------- Stops list (editable) ---------- */}', living_start)
s = s[:living_start] + s[stops_comment:]

# Move contextual refine controls from BEFORE moments to AFTER the story.
editor_start = s.index('          <div\n            data-testid="studio-v3-stops-editor"')
refine_start = s.index('            {/* Contextual refine intents — rendered only when the engine can', editor_start)
stops_ol = s.index('            <ol className="space-y-3 sm:space-y-3">', refine_start)
refine_block = s[refine_start:stops_ol]
s = s[:refine_start] + s[stops_ol:]
# Locate end of that exact stops <ol> after removal.
editor_start = s.index('          <div\n            data-testid="studio-v3-stops-editor"')
stops_ol = s.index('            <ol className="space-y-3 sm:space-y-3">', editor_start)
ol_end = s.index('            </ol>', stops_ol) + len('            </ol>')
story_markup = '''

            <section
              data-testid="studio-v3-day-story"
              aria-label="The story of your day"
              className="mt-7 border-y py-6"
              style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
            >
              <p
                className="text-center text-[10px] uppercase tracking-[0.26em] font-semibold"
                style={{ color: "var(--gold)" }}
              >
                The story of your day
              </p>
              <div className="mt-4 space-y-4">
                {storyChapters.map((chapter) => (
                  <div key={chapter.eyebrow}>
                    <p
                      className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                      style={{ color: "color-mix(in oklab, var(--charcoal) 52%, transparent)" }}
                    >
                      {chapter.eyebrow}
                    </p>
                    <p
                      className="mt-1.5 text-[13.5px] leading-[1.6] [text-wrap:pretty]"
                      style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
                    >
                      {chapter.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

''' + refine_block
s = s[:ol_end] + story_markup + s[ol_end:]

# One grounded confidence cue after all moment/refine controls, before price.
price_anchor = '        {/* ---------- Add-ons + Total (SignaturePriceCard refine variant) ---------- */}\n'
why_markup = '''        <WhyRouteWorks
          reasons={(resolved.livingAtlasReasons ?? []).slice(0, 1)}
          tourId={skeletonTour?.id ?? null}
          testId="studio-v3-travel-file-reasons"
          className="mx-auto mt-8 max-w-[520px]"
        />

'''
s = replace_once(s, price_anchor, why_markup + price_anchor, "single Why this fits cue")

# CTA language now describes the direct handoff to Guest Details.
s = replace_once(s, '            aria-label="See my signature story"\n', '            aria-label="Continue to guest details"\n', "CTA aria")
s = replace_once(s, '            See my signature story\n', '            Continue with this day\n', "CTA label")

# Quiet alternatives footer after the primary CTA/save stack.
cta_anchor = '''        <SaveSignatureButton state={state} journeyTitle={journeyTitle} />
      </div>
    </div>
  );
}
'''
cta_replacement = '''        <SaveSignatureButton state={state} journeyTitle={journeyTitle} />
      </div>

      <OtherDirections
        directions={resolved.livingAtlasAlternatives ?? []}
        variant="footer"
        testId="studio-v3-travel-file-other-directions"
        className="mx-auto mt-7 max-w-[520px]"
      />
    </div>
  );
}
'''
s = replace_once(s, cta_anchor, cta_replacement, "OtherDirections footer")

write(sv_path, s)

# ---------------------------------------------------------------------
# 4) OtherDirections gains an opt-in quiet footer mode; defaults unchanged.
# ---------------------------------------------------------------------
od_path = "src/components/studio-v3/OtherDirections.tsx"
o = read(od_path)
o = replace_once(
    o,
    '  readonly testId?: string;\n',
    '  readonly testId?: string;\n  readonly variant?: "cards" | "footer";\n',
    "OtherDirections variant prop",
)
o = replace_once(
    o,
    'export function OtherDirections({ directions, className, testId }: OtherDirectionsProps) {\n  const shown = directions.slice(0, 2);\n  if (shown.length === 0) return null;\n\n  return (\n',
    '''export function OtherDirections({
  directions,
  className,
  testId,
  variant = "cards",
}: OtherDirectionsProps) {
  const shown = directions.slice(0, 2);
  if (shown.length === 0) return null;

  if (variant === "footer") {
    return (
      <details
        data-testid={testId ?? "studio-v3-other-directions"}
        className={cn("w-full border-t py-4", className)}
        style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
      >
        <summary
          className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
        >
          Other directions considered
          <span aria-hidden style={{ color: "var(--gold)" }}>+</span>
        </summary>
        <ul className="mt-2 space-y-3">
          {shown.map((direction) => (
            <li key={direction.tourId} data-testid="studio-v3-other-direction">
              <p className="text-[13px] font-medium" style={{ color: "var(--charcoal)" }}>
                {direction.title}
              </p>
              <p
                className="mt-1 text-[12.5px] leading-[1.5] [text-wrap:pretty]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 68%, transparent)" }}
              >
                {direction.note}
              </p>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  return (
''',
    "OtherDirections footer mode",
)
write(od_path, o)

# ---------------------------------------------------------------------
# 5) Focused P8 invariants
# ---------------------------------------------------------------------
write("src/components/studio-v3/__tests__/studio-p8-unified-your-day.test.ts", '''import { describe, expect, it } from "vitest";
import { curateJourney, getNextPhase, isPhaseRelevant } from "../curation";
import { canonicalStudioPhase } from "../studioPhaseCanonical";
import { resolveStudioYourDayIdentity } from "../studioYourDayIdentity";
import { INITIAL_STATE, type StudioV3State } from "../types";

const base: StudioV3State = {
  ...INITIAL_STATE,
  phase: "logistics",
  feeling: "coastal",
  companions: "couple",
  rhythm: "slow",
  interests: ["gastronomy", "local-life"],
  destinationIntent: "arrabida-setubal-azeitao",
  dateMode: "exact",
  dateExact: "2026-08-30",
  adults: 2,
  guests: 2,
  rerollCount: 2,
};

describe("P8 phase canonicalisation", () => {
  it("maps both legacy reveal ids to storyboard and leaves all others unchanged", () => {
    expect(canonicalStudioPhase("map")).toBe("storyboard");
    expect(canonicalStudioPhase("confirmation")).toBe("storyboard");
    expect(canonicalStudioPhase("logistics")).toBe("logistics");
    expect(canonicalStudioPhase("guestDetails")).toBe("guestDetails");
  });

  it("keeps legacy ids valid but out of the normal forward path", () => {
    expect(isPhaseRelevant("map", base)).toBe(false);
    expect(isPhaseRelevant("confirmation", base)).toBe(false);
    expect(isPhaseRelevant("storyboard", base)).toBe(true);
    expect(getNextPhase(base, "logistics")).toBe("storyboard");
  });
});

describe("P8 tour identity migration", () => {
  it("commits exactly the tour the old MapAwakens curator would choose", () => {
    const identity = resolveStudioYourDayIdentity(base);
    const oldMapResult = curateJourney(base.feeling!, base.companions!, base.rhythm!, {
      interests: base.interests,
      pickup: base.pickup,
      investment: base.investment,
      destinationIntent: base.destinationIntent,
      dateExact: base.dateExact,
      seed: base.rerollCount,
    });
    expect(identity?.tourId).toBe(oldMapResult.tour.id);
    expect(identity?.journeyTitle).toBeTruthy();
  });

  it("is deterministic for the same state", () => {
    expect(resolveStudioYourDayIdentity(base)).toEqual(resolveStudioYourDayIdentity({ ...base }));
  });
});
''')

print("P8 patch applied successfully")
