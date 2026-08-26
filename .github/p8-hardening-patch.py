from __future__ import annotations

from pathlib import Path
import re
import subprocess
import textwrap

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


def replace_between(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    content = read(path)
    start = content.find(start_marker)
    if start < 0:
        raise RuntimeError(f"Start marker not found in {path}: {start_marker!r}")
    end = content.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"End marker not found in {path}: {end_marker!r}")
    write(path, content[:start] + replacement + content[end:])


# ---------------------------------------------------------------------------
# 1. Route authority: one complete state -> route input contract everywhere.
# ---------------------------------------------------------------------------
write(
    "src/components/studio-v3/studioRouteAuthority.ts",
    textwrap.dedent(
        '''\
        import { findTour } from "@/data/signatureTours";
        import { lookupStopGeo } from "@/lib/studio/stop-lookup";
        import {
          resolveStudioV3Route,
          type ResolvedRoutePoint,
          type ResolvedStudioV3Route,
        } from "./curation";
        import type { StudioV3State } from "./types";

        export type StudioRouteInput = Parameters<typeof resolveStudioV3Route>[0];

        /**
         * Single route-shaping projection of Studio state.
         *
         * Pricing-only fields and PII are intentionally excluded. Every consumer
         * that needs the composed route must start here so date closures,
         * refinement and reshaping cannot silently disappear downstream.
         */
        export function studioRouteInputFromState(state: StudioV3State): StudioRouteInput {
          return {
            feeling: state.feeling,
            companions: state.companions,
            rhythm: state.rhythm,
            interests: state.interests,
            pickup: state.pickup,
            occasion: state.occasion,
            considerations: state.considerations,
            investment: state.investment,
            destinationIntent: state.destinationIntent,
            dateExact: state.dateExact,
            refinement: state.refinement,
            seed: state.rerollCount ?? 0,
          };
        }

        export function resolveStudioRouteFromState(state: StudioV3State): ResolvedStudioV3Route {
          return resolveStudioV3Route(studioRouteInputFromState(state));
        }

        function pointWithKnownGeo(
          point: { label: string; story?: string | null },
          index: number,
          resolved: ResolvedStudioV3Route,
        ): ResolvedRoutePoint {
          const known = resolved.composedRoutePoints.find(
            (candidate) => candidate.label.toLowerCase() === point.label.toLowerCase(),
          );
          if (known) return { ...known, index, story: point.story ?? known.story };
          const geo = lookupStopGeo(point.label);
          return {
            index,
            label: point.label,
            story: point.story ?? "",
            lat: geo?.lat ?? null,
            lng: geo?.lng ?? null,
          };
        }

        /**
         * The traveller's itinerary authority chain.
         *
         * 1. explicit edits made by the traveller;
         * 2. the full custom route composed by Studio (not the compact 4-point card);
         * 3. the compact route for legacy/thin states;
         * 4. catalog stops only as a final safety fallback.
         *
         * `tourId` is therefore a pricing/region anchor, never permission to replace
         * a composed or edited route with an off-the-shelf Signature.
         */
        export function authoritativeStudioRoutePoints(state: StudioV3State): ResolvedRoutePoint[] {
          const resolved = resolveStudioRouteFromState(state);

          if (state.editedRoutePoints && state.editedRoutePoints.length > 0) {
            return state.editedRoutePoints.map((point, index) =>
              pointWithKnownGeo(point, index, resolved),
            );
          }

          if (resolved.composedRoutePoints.length > 0) {
            return resolved.composedRoutePoints.map((point, index) => ({ ...point, index }));
          }

          if (resolved.routePoints.length > 0) {
            return resolved.routePoints.map((point, index) => ({ ...point, index }));
          }

          const tour = state.tourId ? findTour(state.tourId) : null;
          return (tour?.stops ?? []).map((stop, index) => pointWithKnownGeo(stop, index, resolved));
        }
        '''
    ),
)

# ---------------------------------------------------------------------------
# 2. Curation returns BOTH full custom route and compact card route.
# ---------------------------------------------------------------------------
curation_path = "src/components/studio-v3/curation.ts"
replace_once(
    curation_path,
    '  /** Ordered route points, max 4 main points, all from the same Signature. */\n  routePoints: ResolvedRoutePoint[];\n',
    '  /** Full ordered custom route composed for the traveller. Never presentation-capped. */\n  composedRoutePoints: ResolvedRoutePoint[];\n  /** Compact legacy Journey Card projection. Maximum 4 points for that card only. */\n  routePoints: ResolvedRoutePoint[];\n',
)
replace_once(
    curation_path,
    '      suggestedRouteLabel: "To be refined with YES",\n      routePoints: [],\n      journeyTitle: "Your private Portugal day",\n',
    '      suggestedRouteLabel: "To be refined with YES",\n      composedRoutePoints: [],\n      routePoints: [],\n      journeyTitle: "Your private Portugal day",\n',
)
replace_once(
    curation_path,
    '  /** Adaptive refinement answer — becomes a discovery signal, never a price input. */\n  refinement?: AdaptiveRefinementId | null;\n}): ResolvedStudioV3Route {\n',
    '  /** Adaptive refinement answer — becomes a discovery signal, never a price input. */\n  refinement?: AdaptiveRefinementId | null;\n  /** Existing reshape seed. Same state + seed stays deterministic. */\n  seed?: number;\n}): ResolvedStudioV3Route {\n',
)
replace_once(
    curation_path,
    '    dateExact,\n    preferTourId: input.preferTourId ?? intelligence.preferredTourId,\n  });\n',
    '    dateExact,\n    preferTourId: input.preferTourId ?? intelligence.preferredTourId,\n    seed: input.seed ?? 0,\n  });\n',
)

curation = read(curation_path)
start = curation.find("  // Hard cap at 4 main route points on the Journey Card")
end = curation.find("  // Short route sentence", start)
if start < 0 or end < 0:
    raise RuntimeError("Could not locate route-point composition block in curation.ts")
block = curation[start:end]
block = re.sub(r"\broutePoints\b", "composedRoutePoints", block)
block = block.replace("journey.moments.slice(0, 4).map", "journey.moments.map")
block = block.replace(
    "// Hard cap at 4 main route points on the Journey Card (per brief).",
    "// Canonical route: keep every executable moment curated for this rhythm.\n"
    "  // Compact surfaces derive their own four-point projection below; the\n"
    "  // traveller's itinerary must never be truncated here.",
)
block += "  const routePoints = composedRoutePoints.slice(0, 4);\n\n"
write(curation_path, curation[:start] + block + curation[end:])
replace_once(
    curation_path,
    '    suggestedRouteLabel,\n    routePoints,\n    journeyTitle,\n',
    '    suggestedRouteLabel,\n    composedRoutePoints,\n    routePoints,\n    journeyTitle,\n',
)

# ---------------------------------------------------------------------------
# 3. Resolved journey and Travel Story consume the same authority chain.
# ---------------------------------------------------------------------------
resolved_path = "src/components/studio-v3/useResolvedJourney.ts"
replace_once(
    resolved_path,
    'import { resolveStudioV3Route } from "./curation";\n',
    'import { authoritativeStudioRoutePoints } from "./studioRouteAuthority";\n',
)
resolved = read(resolved_path)
stops_start = resolved.find("    // Stops priority chain — same as reveal + checkout share.")
stops_end = resolved.find("\n\n    const tiers =", stops_start)
if stops_start < 0 or stops_end < 0:
    raise RuntimeError("Could not locate useResolvedJourney stops block")
stops_new = textwrap.dedent(
    '''\
        // Stops are one authority chain shared with reveal, Travel Story and
        // checkout-facing state. A catalog tour is only the last safety fallback.
        const stops: ResolvedJourneyStop[] = authoritativeStudioRoutePoints(state).map((point) => ({
          label: point.label,
          story: point.story ?? "",
        }));
    '''
).rstrip()
write(resolved_path, resolved[:stops_start] + stops_new + resolved[stops_end:])

snapshot_path = "src/components/studio-v3/signatureStorySnapshot.ts"
replace_once(
    snapshot_path,
    'import { resolveStudioV3Route, pickupCityLabel } from "./curation";\n',
    'import { pickupCityLabel } from "./curation";\nimport { authoritativeStudioRoutePoints } from "./studioRouteAuthority";\n',
)
snapshot = read(snapshot_path)
block_start = snapshot.find("  const resolved = resolveStudioV3Route({")
block_end = snapshot.find("\n\n  const chapters:", block_start)
if block_start < 0 or block_end < 0:
    raise RuntimeError("Could not locate Signature Story route block")
route_new = textwrap.dedent(
    '''\
      const routePoints = authoritativeStudioRoutePoints(state).map((point, index) => ({
        label: point.label,
        story: point.story,
        index,
      }));
    '''
).rstrip()
write(snapshot_path, snapshot[:block_start] + route_new + snapshot[block_end:])
snapshot = read(snapshot_path)
rev_start = snapshot.find("  const routeLabels =\n")
rev_end = snapshot.find("\n\n  const addOnPart", rev_start)
if rev_start < 0 or rev_end < 0:
    raise RuntimeError("Could not locate Journey Revision route block")
rev_new = '  const routeLabels = authoritativeStudioRoutePoints(state).map((point) => point.label);'
write(snapshot_path, snapshot[:rev_start] + rev_new + snapshot[rev_end:])

# Curtain region voice must resolve from the exact same inputs too.
curtain_path = "src/components/studio-v3/CurtainRise.tsx"
replace_once(
    curtain_path,
    'import { resolveStudioV3Route } from "./curation";\n',
    'import { resolveStudioRouteFromState } from "./studioRouteAuthority";\n',
)
curtain = read(curtain_path)
curtain_start = curtain.find("  const resolved =\n")
curtain_end = curtain.find("\n  const tour =", curtain_start)
if curtain_start < 0 or curtain_end < 0:
    raise RuntimeError("Could not locate CurtainRise route block")
curtain_new = textwrap.dedent(
    '''\
      const resolved =
        state.feeling && state.companions && state.rhythm
          ? resolveStudioRouteFromState(state)
          : null;
    '''
).rstrip()
write(curtain_path, curtain[:curtain_start] + curtain_new + curtain[curtain_end:])

# ---------------------------------------------------------------------------
# 4. Truthful unified route surface. No fake coords, no schematic route line.
# ---------------------------------------------------------------------------
write(
    "src/components/studio-v3/UnifiedYourDayRoute.tsx",
    textwrap.dedent(
        '''\
        import { useEffect, useMemo, useRef } from "react";
        import { EditorialMap } from "@/components/maps/EditorialMap";
        import { lookupStopGeo } from "@/lib/studio/stop-lookup";
        import { trackStudio } from "@/lib/studio-analytics";
        import type { ResolvedStudioV3Route } from "./curation";
        import { resolveYourDayMapTruth } from "./yourDayMapTruth";
        import { YourDayTimeline } from "./YourDayTimeline";

        interface Props {
          stops: ReadonlyArray<{ label: string; story?: string | null }>;
          resolved: Pick<
            ResolvedStudioV3Route,
            "composedRoutePoints" | "routePoints" | "routeAreaLabel" | "skeletonTourKey"
          >;
          region?: string | null;
        }

        /**
         * Canonical cartography for P8 Your Day.
         *
         * A geographic map is earned only when EVERY kept moment has a real
         * coordinate. Otherwise the exact same moments become an editorial
         * timeline. Pins never imply a driven polyline: showRoute is always false.
         */
        export function UnifiedYourDayRoute({ stops, resolved, region }: Props) {
          const sourcePoints =
            resolved.composedRoutePoints.length > 0
              ? resolved.composedRoutePoints
              : resolved.routePoints;

          const moments = useMemo(() => {
            const byLabel = new Map(
              sourcePoints.map((point) => [point.label.toLowerCase(), point] as const),
            );
            return stops.map((stop) => {
              const known = byLabel.get(stop.label.toLowerCase());
              const fallback = lookupStopGeo(stop.label);
              return {
                label: stop.label,
                story: stop.story ?? known?.story ?? null,
                location: region ?? resolved.routeAreaLabel ?? null,
                lat: known?.lat ?? fallback?.lat ?? null,
                lng: known?.lng ?? fallback?.lng ?? null,
              };
            });
          }, [stops, sourcePoints, region, resolved.routeAreaLabel]);

          const truth = useMemo(() => resolveYourDayMapTruth(moments), [moments]);
          const mapTracked = useRef(false);
          useEffect(() => {
            if (truth.mode !== "map" || mapTracked.current) return;
            mapTracked.current = true;
            trackStudio("map_viewed", {
              phase: "storyboard",
              tourId: resolved.skeletonTourKey,
              stops: truth.stops.length,
              routeGeometry: false,
            });
          }, [truth, resolved.skeletonTourKey]);

          return (
            <section
              data-testid="studio-v3-unified-route"
              data-your-day-mode={truth.mode}
              aria-label={truth.mode === "map" ? "Your day, on the map" : "Your day, moment by moment"}
              className="mx-auto mt-8 w-full max-w-[520px]"
            >
              {truth.mode === "map" ? (
                <EditorialMap
                  stops={truth.stops.map((stop) => ({
                    label: stop.label,
                    lat: stop.lat,
                    lng: stop.lng,
                  }))}
                  activeCount={truth.stops.length}
                  tone="dark"
                  showRoute={false}
                  eyebrow="Your day"
                  meta={region ?? resolved.routeAreaLabel ?? "Portugal"}
                  footerRight={`${truth.stops.length} moment${truth.stops.length === 1 ? "" : "s"} · 1 day`}
                  ariaLabel={`Your private day with ${truth.stops.length} moments in real geographic order.`}
                  className="h-[300px] w-full sm:h-[440px]"
                  aspectRatio="auto"
                  preserveAspectRatio="xMidYMid meet"
                  showLabels={false}
                />
              ) : (
                <YourDayTimeline moments={moments} activeCount={moments.length} />
              )}
            </section>
          );
        }
        '''
    ),
)

# ---------------------------------------------------------------------------
# 5. Studio orchestration: atomic handoff, complete route, truthful map.
# ---------------------------------------------------------------------------
studio_path = "src/components/studio-v3/StudioV3.tsx"
replace_once(studio_path, 'import { StudioV3SignatureMap } from "./StudioV3SignatureMap";\n', '')
replace_once(studio_path, 'import { RouteLegend } from "@/components/studio-v3/RouteLegend";\n', '')
replace_once(
    studio_path,
    'import { YourDayFrame } from "@/components/studio-v3/YourDayFrame";\n',
    'import { YourDayFrame } from "@/components/studio-v3/YourDayFrame";\nimport { UnifiedYourDayRoute } from "./UnifiedYourDayRoute";\nimport { studioRouteInputFromState } from "./studioRouteAuthority";\n',
)

# Atomic Logistics commit, including technical anchor, before advance.
studio = read(studio_path)
on_compose = studio.find('            onCompose={() => {')
forward_start = studio.find('              const forward: StudioV3State = {', on_compose)
forward_end = studio.find('            }}\n          />', forward_start)
if on_compose < 0 or forward_start < 0 or forward_end < 0:
    raise RuntimeError("Could not locate Logistics onCompose block")
atomic = textwrap.dedent(
    '''\
                  const forward: StudioV3State = {
                    ...state,
                    adults: committedAdults,
                    minorAges: committedMinors,
                    guests: committedTotal,
                    guestsPrivateEvent: committedTotal >= 11,
                  };

                  // P8 hardening: resolve the SAME custom route from one complete
                  // input projection. tourId is only its technical pricing/region
                  // anchor; the composed moments remain the itinerary authority.
                  const composedRoute = resolveStudioV3Route(studioRouteInputFromState(forward));
                  const composedTour = composedRoute.skeletonTourKey
                    ? findTour(composedRoute.skeletonTourKey)
                    : null;
                  const committedForward: StudioV3State = {
                    ...forward,
                    tourId: composedTour?.id ?? forward.tourId,
                    journeyTitle: composedRoute.journeyTitle,
                  };

                  setState(() => committedForward);
                  trackStudio("logistics_completed", {
                    phase: "logistics",
                    stepNumber: stepOf("logistics"),
                    date_mode: committedForward.dateMode,
                    guests: committedTotal,
                  });
                  window.setTimeout(
                    () => advance(getNextPhase(committedForward, "logistics")),
                    60,
                  );
    '''
).rstrip()
# Keep the two committed guest lines immediately preceding forward_start.
write(studio_path, studio[:forward_start] + atomic + "\n" + studio[forward_end:])

# Route resolver + base stops use full route and all shaping inputs.
studio = read(studio_path)
resolved_start = studio.find('  const resolved = useMemo(\n', studio.find('export function StoryboardHandoff'))
base_marker = studio.find('  const editedStops = state.editedRoutePoints ?? baseStops;', resolved_start)
if resolved_start < 0 or base_marker < 0:
    raise RuntimeError("Could not locate Storyboard resolved/baseStops block")
resolved_new = textwrap.dedent(
    '''\
      const resolved = useMemo(
        () => resolveStudioV3Route(studioRouteInputFromState(state)),
        [state],
      );

      const baseStops = useMemo(
        () =>
          (resolved.composedRoutePoints.length > 0
            ? resolved.composedRoutePoints
            : resolved.routePoints
          ).map((point) => ({ label: point.label, story: point.story })),
        [resolved.composedRoutePoints, resolved.routePoints],
      );

    '''
)
write(studio_path, studio[:resolved_start] + resolved_new + studio[base_marker:])

# Geo/OSRM helper: real coords only. Never copy the previous stop coordinate.
geo_helper = textwrap.dedent(
    '''\
    function resolveRevealRouteStops(
      editedStops: ReadonlyArray<{ label: string }>,
      resolved: {
        composedRoutePoints?: ReadonlyArray<{
          label: string;
          lat?: number | null;
          lng?: number | null;
        }>;
        routePoints: ReadonlyArray<{ label: string; lat?: number | null; lng?: number | null }>;
      },
      skeletonTour: { region?: string | null } | null,
    ) {
      const sourcePoints =
        resolved.composedRoutePoints && resolved.composedRoutePoints.length > 0
          ? resolved.composedRoutePoints
          : resolved.routePoints;
      const byLabel = new Map(sourcePoints.map((point) => [point.label.toLowerCase(), point] as const));
      const rk = tourRegionToRegionKey(skeletonTour?.region ?? null);
      const originCoord = REGION_ORIGIN[rk]
        ? { lat: REGION_ORIGIN[rk].lat, lng: REGION_ORIGIN[rk].lng }
        : null;

      const stopsDetailed = editedStops.map((stop) => {
        const resolvedPoint = byLabel.get(stop.label.toLowerCase());
        if (resolvedPoint && resolvedPoint.lat != null && resolvedPoint.lng != null) {
          return { label: stop.label, lat: resolvedPoint.lat, lng: resolvedPoint.lng };
        }
        const geo = lookupStopGeo(stop.label);
        if (geo) {
          return {
            label: stop.label,
            lat: geo.lat,
            lng: geo.lng,
            dwellMin: geo.dwellMin,
            kind: geo.kind,
          };
        }
        return { label: stop.label } as { label: string; lat?: number; lng?: number };
      });

      const allGeo =
        originCoord &&
        stopsDetailed.every(
          (stop) => typeof stop.lat === "number" && typeof stop.lng === "number",
        );
      const rawStops: RouteLegStop[] | null = allGeo
        ? [
            { key: "origin", lat: originCoord!.lat, lng: originCoord!.lng },
            ...stopsDetailed.map((stop, index) => ({
              key: `${index}-${stop.label}`,
              lat: stop.lat as number,
              lng: stop.lng as number,
            })),
          ]
        : null;
      const routeStops: RouteLegStop[] | null = rawStops
        ? rawStops.filter(
            (stop, index, all) =>
              index === 0 || stop.lat !== all[index - 1].lat || stop.lng !== all[index - 1].lng,
          )
        : null;

      return { stopsDetailed, originCoord, routeStops };
    }

    '''
)
replace_between(
    studio_path,
    '/**\n * resolveRevealRouteStops',
    '/**\n * LetYesDecide',
    '/**\n * resolveRevealRouteStops — geo/OSRM facts for time-budget calculations.\n * Missing coordinates stay missing; they are never copied from a neighbour.\n */\n' + geo_helper,
)

# Replace the P8 map/legend with the truthful map-or-timeline component.
studio = read(studio_path)
map_start = studio.find('        {/* ---------- 2. Live route map ---------- */}')
story_start = studio.find('        {/* ---------- 3. The story of the day', map_start)
if map_start < 0 or story_start < 0:
    raise RuntimeError("Could not locate Unified Your Day map block")
map_new = textwrap.dedent(
    '''\
            {/* ---------- 2. Truthful route shape ---------- */}
            {editedStops.length > 0 ? (
              <UnifiedYourDayRoute
                stops={editedStops}
                resolved={resolved}
                region={skeletonTour?.region ?? null}
              />
            ) : null}

    '''
)
write(studio_path, studio[:map_start] + map_new + studio[story_start:])

# Move story + ONE why-fit cue after the traveller has seen the editable moments.
studio = read(studio_path)
story_start = studio.find('        {/* ---------- 3. The story of the day')
stops_marker = studio.find('        {/* ---------- Stops list (editable) ---------- */}', story_start)
if story_start < 0 or stops_marker < 0:
    raise RuntimeError("Could not locate story/why block")
write(studio_path, studio[:story_start] + studio[stops_marker:])
studio = read(studio_path)
insert_marker = '        {/* Signature DNA + Shaping direction removed on Refine — decorative\n'
insert_at = studio.find(insert_marker)
if insert_at < 0:
    raise RuntimeError("Could not locate post-stops insertion point")
post_moments = textwrap.dedent(
    '''\
            {/* ---------- 3. Lightweight story after the ordered moments ---------- */}
            {storySlot ? (
              <div data-testid="studio-v3-your-day-story" className="mx-auto mt-8 max-w-[560px]">
                {storySlot}
              </div>
            ) : null}

            {/* One grounded confidence cue only, after the day itself. */}
            <WhyRouteWorks
              reasons={(resolved.livingAtlasReasons ?? []).slice(0, 1)}
              testId="studio-v3-travel-file-reasons"
              className="mx-auto mt-8 max-w-[520px]"
            />

    '''
)
write(studio_path, studio[:insert_at] + post_moments + studio[insert_at:])

# ---------------------------------------------------------------------------
# 6. Inline story stays lightweight: no second stop-by-stop narration/chips.
# ---------------------------------------------------------------------------
final_path = "src/components/studio-v3/FinalRevealStory.tsx"
replace_once(
    final_path,
    '            {revealSignals.length > 0 ? (\n',
    '            {!inline && revealSignals.length > 0 ? (\n',
)
replace_once(
    final_path,
    '            {paragraphs.map((p) => (\n',
    '            {!inline ? paragraphs.map((p) => (\n',
)
replace_once(
    final_path,
    '            ))}\n          </div>\n',
    '            )) : null}\n          </div>\n',
)

# ---------------------------------------------------------------------------
# 7. Focused truth tests.
# ---------------------------------------------------------------------------
write(
    "src/components/studio-v3/__tests__/studio-p8-route-truth.test.tsx",
    textwrap.dedent(
        '''\
        import { render, screen } from "@testing-library/react";
        import { describe, expect, it } from "vitest";
        import { signatureTours } from "@/data/signatureTours";
        import { REGION_STOP_POOL } from "@/data/regionStopPool";
        import { resolveStudioV3Route } from "../curation";
        import { buildSignatureStorySnapshot } from "../signatureStorySnapshot";
        import {
          authoritativeStudioRoutePoints,
          studioRouteInputFromState,
        } from "../studioRouteAuthority";
        import { UnifiedYourDayRoute } from "../UnifiedYourDayRoute";
        import { INITIAL_STATE, type StudioV3State } from "../types";

        const baseState: StudioV3State = {
          ...INITIAL_STATE,
          phase: "storyboard",
          feeling: "wine-food",
          companions: "couple",
          rhythm: "immersive",
          interests: ["wine", "gastronomy"],
          pickup: "sesimbra-setubal-arrabida",
          destinationIntent: "arrabida-setubal-azeitao",
          investment: "bespoke",
          adults: 2,
          guests: 2,
          dateMode: "exact",
          dateExact: "2026-06-16",
        };

        describe("P8 hardening — custom route authority", () => {
          it("keeps every curated moment in the canonical route while legacy routePoints stay compact", () => {
            const candidates: StudioV3State[] = [
              baseState,
              { ...baseState, feeling: "coastal", interests: ["coast", "nature"] },
              { ...baseState, feeling: "hidden", interests: ["local-life", "nature"] },
              { ...baseState, destinationIntent: "lisbon-sintra-cascais", pickup: "sintra", feeling: "culture", interests: ["heritage", "nature"] },
              { ...baseState, destinationIntent: "alentejo-evora-wine", pickup: "lisbon", feeling: "culture", interests: ["heritage", "gastronomy"] },
            ];
            const resolved = candidates
              .map((state) => resolveStudioV3Route(studioRouteInputFromState(state)))
              .find((route) => route.composedRoutePoints.length > 4);
            expect(resolved, "at least one current immersive profile should legitimately compose >4 moments").toBeTruthy();
            expect(resolved!.routePoints.length).toBeLessThanOrEqual(4);
            expect(resolved!.composedRoutePoints.length).toBeGreaterThan(resolved!.routePoints.length);
          });

          it("only composes labels from real approved sources", () => {
            const allowed = new Set<string>();
            for (const tour of signatureTours) for (const stop of tour.stops) allowed.add(stop.label.toLowerCase());
            for (const stop of REGION_STOP_POOL) allowed.add(stop.name.toLowerCase());
            const points = authoritativeStudioRoutePoints(baseState);
            expect(points.length).toBeGreaterThan(0);
            for (const point of points) expect(allowed.has(point.label.toLowerCase())).toBe(true);
          });

          it("can produce differentiated valid days inside the same destination intent", () => {
            const profiles: StudioV3State[] = [
              { ...baseState, feeling: "wine-food", interests: ["wine", "gastronomy"] },
              { ...baseState, feeling: "coastal", interests: ["coast", "nature"] },
              { ...baseState, feeling: "hands-on", interests: ["heritage", "local-life"] },
              { ...baseState, feeling: "hidden", interests: ["local-life", "nature"] },
            ];
            const signatures = new Set(
              profiles.map((state) =>
                authoritativeStudioRoutePoints(state)
                  .map((point) => point.label)
                  .join("|"),
              ),
            );
            expect(signatures.size).toBeGreaterThan(1);
          });

          it("editedRoutePoints beat both the composed route and a changed technical tourId", () => {
            const composed = authoritativeStudioRoutePoints(baseState);
            expect(composed.length).toBeGreaterThanOrEqual(2);
            const edited = [
              { label: composed[1].label, story: composed[1].story },
              { label: composed[0].label, story: composed[0].story },
            ];
            const otherTour = signatureTours.find((tour) => tour.id !== baseState.tourId)?.id ?? null;
            const state: StudioV3State = { ...baseState, tourId: otherTour, editedRoutePoints: edited };
            expect(authoritativeStudioRoutePoints(state).map((point) => point.label)).toEqual(
              edited.map((point) => point.label),
            );
            expect(buildSignatureStorySnapshot(state).chapters.map((chapter) => chapter.title)).toEqual(
              edited.map((point) => point.label),
            );
          });

          it("keeps Monday operational closures through the downstream story snapshot", () => {
            const monday: StudioV3State = { ...baseState, dateExact: "2026-06-15" };
            const mercado = /mercado\\s+do\\s+livramento/i;
            expect(authoritativeStudioRoutePoints(monday).some((point) => mercado.test(point.label))).toBe(false);
            expect(buildSignatureStorySnapshot(monday).chapters.some((chapter) => mercado.test(chapter.title))).toBe(false);
          });

          it("is deterministic for the same state and reshape seed", () => {
            const once = authoritativeStudioRoutePoints({ ...baseState, rerollCount: 2 }).map((point) => point.label);
            const twice = authoritativeStudioRoutePoints({ ...baseState, rerollCount: 2 }).map((point) => point.label);
            expect(twice).toEqual(once);
          });
        });

        describe("P8 hardening — truthful Your Day cartography", () => {
          it("falls back to the editorial timeline when even one kept moment lacks coordinates", () => {
            const resolved = resolveStudioV3Route(studioRouteInputFromState(baseState));
            render(
              <UnifiedYourDayRoute
                stops={[{ label: "A real editorial moment with no geo override", story: "Story" }]}
                resolved={{ ...resolved, composedRoutePoints: [], routePoints: [] }}
                region="Portugal"
              />,
            );
            expect(screen.getByTestId("studio-v3-unified-route")).toHaveAttribute("data-your-day-mode", "timeline");
            expect(screen.getByTestId("studio-v3-your-day-timeline")).toBeInTheDocument();
          });

          it("earns map mode only when every moment has real coherent coordinates", () => {
            const resolved = resolveStudioV3Route(studioRouteInputFromState(baseState));
            const withGeo = {
              ...resolved,
              composedRoutePoints: [
                { index: 0, label: "Moment A", story: "A", lat: 38.52, lng: -8.89 },
                { index: 1, label: "Moment B", story: "B", lat: 38.49, lng: -8.90 },
              ],
              routePoints: [],
            };
            render(
              <UnifiedYourDayRoute
                stops={withGeo.composedRoutePoints}
                resolved={withGeo}
                region="Setúbal"
              />,
            );
            expect(screen.getByTestId("studio-v3-unified-route")).toHaveAttribute("data-your-day-mode", "map");
            expect(screen.queryByTestId("studio-v3-your-day-timeline")).not.toBeInTheDocument();
          });
        });
        '''
    ),
)

# ---------------------------------------------------------------------------
# 8. Generated brand audit is not part of P8. Restore exact pre-P8 bytes.
# ---------------------------------------------------------------------------
brand = subprocess.run(
    ["git", "show", "aad17ed51b9c509711fd51322376229cc1c8d6b9:src/generated/brand-audit.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
).stdout
(ROOT / "src/generated/brand-audit.json").write_bytes(brand)

print("P8 hardening patch applied")
