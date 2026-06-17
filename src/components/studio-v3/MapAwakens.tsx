import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { RoutedStopUI } from "@/components/builder/types";
import { curateJourney, type CuratedJourney } from "./curation";
import {
  recordStudioV3Phase4Timing,
  type StudioV3Phase4Phase,
} from "@/lib/studio-v3-telemetry";
import { PortugalSilhouette, type SilhouetteRegion } from "./PortugalSilhouette";
import type {
  Companions,
  DestinationIntent,
  Feeling,
  Interest,
  InvestmentTier,
  Pickup,
  Rhythm,
} from "./types";

// TODO: Later phase — add pickup-aware map eyebrow ("From {pickup label}").
// Skipped in Phase 1B to avoid prop drilling and a wider refactor.

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

// Map destinationIntent (or tour region fallback) into the silhouette
// region so the gold pulse settles exactly where the day will unfold.
function resolveSilhouetteRegion(
  intent: DestinationIntent | null | undefined,
  tourRegion: string | null | undefined,
): SilhouetteRegion {
  if (intent === "alentejo-evora-wine" || intent === "comporta-troia") return "alentejo";
  if (intent === "central-portugal" || intent === "spiritual-coast") return "centro";
  if (intent === "lisbon-sintra-cascais") return "lisbon-coast";
  if (intent === "arrabida-setubal-azeitao") return "arrabida";
  const r = (tourRegion ?? "").toLowerCase();
  if (r.includes("alentejo") || r.includes("évora") || r.includes("evora") || r.includes("comporta")) return "alentejo";
  if (r.includes("arrábida") || r.includes("arrabida") || r.includes("setúbal") || r.includes("setubal")) return "arrabida";
  if (r.includes("sintra") || r.includes("cascais") || r.includes("lisbon") || r.includes("lisboa")) return "lisbon-coast";
  if (r.includes("centro") || r.includes("central") || r.includes("óbidos") || r.includes("obidos") || r.includes("fátima") || r.includes("fatima")) return "centro";
  return null;
}

/**
 * Phase 4 — "The map awakens".
 *
 * The trilogy resolves into ONE real Signature day (chosen from the
 * existing catalog — never invented). The map fades in, stops appear one
 * by one in cadence with a quiet editorial card that whispers each
 * moment's story. The traveller can pause, step manually, or let the
 * sequence unfold on its own.
 *
 * Strict reuse of BuilderMap so the cartography matches the rest of the
 * site. The cinematic layer is composition + timing, not new map chrome.
 */
interface Props {
  feeling: Feeling;
  companions: Companions;
  rhythm: Rhythm;
  /** Optional context — when present, ensures the intermediate playback
   *  resolves to the SAME tour family the final reveal will use, so users
   *  never see a stale wrong-region route (e.g. Arrábida while their
   *  selected destination intent is Alentejo / Évora). */
  interests?: ReadonlyArray<Interest>;
  pickup?: Pickup | null;
  investment?: InvestmentTier | null;
  destinationIntent?: DestinationIntent | null;
  /** ISO yyyy-mm-dd of the exact selected day — used to skip stops
   *  closed on that weekday (e.g. Mercado do Livramento on Mondays). */
  dateExact?: string | null;
  onBack: () => void;
  onContinue: (tourId: string) => void;
}

const AUTO_INTERVAL_MS = 3400;

export function MapAwakens({
  feeling,
  companions,
  rhythm,
  interests,
  pickup,
  investment,
  destinationIntent,
  dateExact,
  onBack,
  onContinue,
}: Props) {
  const journey: CuratedJourney = useMemo(
    () =>
      curateJourney(feeling, companions, rhythm, {
        interests,
        pickup,
        investment,
        destinationIntent,
        dateExact,
      }),
    [feeling, companions, rhythm, interests, pickup, investment, destinationIntent, dateExact],
  );



  const [revealed, setRevealed] = useState(0); // how many moments shown
  const [active, setActive] = useState(0); // currently spotlit moment
  const [playing, setPlaying] = useState(true);
  const [mounted, setMounted] = useState(false);
  // Anticipation layer — silhouette + gold pulse hold the stage while the
  // map silently boots underneath. Fades out as the map fades in, so the
  // two surfaces never visually overlap (one ends as the other begins).
  const [anticipating, setAnticipating] = useState(true);
  // Polite announcement for screen readers — narrates the silhouette →
  // map → first stop arc without making the silhouette itself focusable.
  const [srStatus, setSrStatus] = useState<string>(
    "Composing your route. A map of Portugal is taking shape.",
  );
  const timerRef = useRef<number | null>(null);

  const silhouetteRegion = useMemo(
    () => resolveSilhouetteRegion(destinationIntent, journey.tour.region),
    [destinationIntent, journey.tour.region],
  );

  // Cinematic warm-up:
  //   0ms   → silhouette + gold pulse hold the stage (map opacity 0)
  //   1400ms → map starts fading in beneath
  //   2100ms → silhouette fully gone, first stop appears
  //
  // We also capture real wall-clock timings per device so we can audit
  // whether the choreography keeps its rhythm on lower-end phones.
  useEffect(() => {
    const t0 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const emit = (
      phase: StudioV3Phase4Phase,
      extra: Record<string, unknown> = {},
    ) => {
      const elapsed = Math.round(now() - t0);
      recordStudioV3Phase4Timing({
        phase,
        elapsedMs: elapsed,
        tourId: journey.tour.id,
        region: silhouetteRegion ?? journey.tour.region ?? null,
        viewport:
          typeof window !== "undefined"
            ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }
            : null,
        reducedMotion:
          typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false,
        ...extra,
      });
    };

    emit("silhouette-shown");

    const tMap = window.setTimeout(() => {
      setMounted(true);
      setSrStatus("Map ready. The route is about to reveal its first moment.");
      emit("map-mounted");
    }, 1400);
    const tHandoff = window.setTimeout(() => {
      setAnticipating(false);
      setRevealed(1);
      setActive(0);
      setSrStatus(
        `First moment revealed${journey.moments[0]?.label ? `: ${journey.moments[0].label}` : ""}.`,
      );
      emit("first-stop");
    }, 2100);
    const tComplete = window.setTimeout(() => {
      emit("complete");
    }, 2800);
    return () => {
      window.clearTimeout(tMap);
      window.clearTimeout(tHandoff);
      window.clearTimeout(tComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Auto-advance.
  useEffect(() => {
    if (!playing || !mounted) return;
    if (active >= journey.moments.length - 1 && revealed >= journey.moments.length) return;
    timerRef.current = window.setTimeout(() => {
      const nextActive = Math.min(active + 1, journey.moments.length - 1);
      setActive(nextActive);
      setRevealed((r) => Math.max(r, nextActive + 1));
    }, AUTO_INTERVAL_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, revealed, playing, mounted, journey.moments.length]);

  const step = (dir: -1 | 1) => {
    setPlaying(false);
    const next = Math.max(0, Math.min(journey.moments.length - 1, active + dir));
    setActive(next);
    setRevealed((r) => Math.max(r, next + 1));
  };

  // Build RoutedStopUI[] for BuilderMap — only the revealed moments that
  // have real coordinates. Map is forgiving of missing stops.
  const mapStops: RoutedStopUI[] = useMemo(() => {
    return journey.moments
      .slice(0, revealed)
      .filter((m) => m.lat !== null && m.lng !== null)
      .map((m, i) => ({
        key: `${journey.tour.id}-${m.index}`,
        region_key: journey.tour.id,
        label: m.label,
        blurb: m.story,
        tag: null,
        lat: m.lat as number,
        lng: m.lng as number,
        duration_minutes: 60,
        driveMinutesFromPrev: i === 0 ? 0 : 25,
      }));
  }, [journey, revealed]);

  const current = journey.moments[active];
  const isLast = active === journey.moments.length - 1 && revealed >= journey.moments.length;

  return (
    <div className="relative w-full min-h-[100dvh]" style={{ background: "var(--ivory)" }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 z-30 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        aria-label="Back to rhythm"
      >
        <ArrowLeft size={14} aria-hidden /> Back
      </button>

      {/* Eyebrow */}
      <div
        className="absolute left-1/2 top-5 -translate-x-1/2 z-20 text-[10px] uppercase tracking-[0.28em] font-semibold whitespace-nowrap"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> Suggested route · taking shape
      </div>

      {/* Polite live-region — narrates the silhouette → map → first stop
          arc to assistive tech so blind users get the same emotional beat
          as sighted users. Visually hidden, never traps focus. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srStatus}
      </div>

      {/* Map stage — top portion of the viewport. */}
      <section
        aria-label="Suggested route map"
        aria-busy={!mounted || anticipating}
        className="absolute inset-x-0 top-0 h-[58dvh] sm:h-[62dvh] z-10 px-3 pt-14 pb-3"
      >
        {/* Anticipation layer — Portugal silhouette + gold pulse holds the
            stage while the real map silently boots underneath. Fades out
            as the map fades in: the two never visually overlap. */}
        <div
          aria-hidden="true"
          data-testid="studio-v3-map-anticipation"
          className={`pointer-events-none absolute inset-0 px-3 pt-14 pb-3 z-20 transition-opacity duration-[700ms] ease-out ${
            anticipating ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="relative w-full h-full overflow-hidden rounded-[4px]"
            style={{
              background: "var(--ivory)",
              animation: anticipating
                ? "studioV3AnticipationBreath 1400ms ease-out both"
                : undefined,
            }}
          >
            <PortugalSilhouette fill={1} region={silhouetteRegion} />
            <div
              className="absolute inset-x-0 bottom-5 text-center text-[10px] uppercase tracking-[0.32em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span>{" "}
              {silhouetteRegion ? "The day takes shape" : "Composing your route"}
            </div>
          </div>
        </div>

        {/* Map wrapper — hidden from AT and tab order while anticipating
            so screen readers and keyboard users never land on an empty
            invisible map. `inert` removes focusability entirely on
            supported browsers; `tabIndex={-1}` is the safe fallback. */}
        <div
          className={`relative w-full h-full overflow-hidden rounded-[4px] border border-[color:var(--charcoal)]/15 shadow-[0_24px_60px_-32px_rgba(46,46,46,0.45)] transition-opacity duration-[700ms] ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={anticipating}
          // @ts-expect-error — `inert` is a valid HTML attribute, React 19 supports it
          inert={anticipating ? "" : undefined}
          tabIndex={anticipating ? -1 : undefined}
        >

          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center text-[10.5px] uppercase tracking-[0.24em] font-semibold" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", background: "var(--sand)" }}>
                Map awakening…
              </div>
            }
          >
            <BuilderMap
              stops={mapStops}
              regionCenter={journey.center}
              regionKey={journey.tour.id}
              emotionalMode
              activeStopIndex={mapStops.length > 0 ? Math.min(active, mapStops.length - 1) : null}
              chrome={false}
              locale="en"
            />
          </Suspense>

          {/* Cinematic vignette — soft dark wash at top + bottom for a
              premium, Homepage-Studio-Preview feel. Pins and route stay
              fully legible because the centre stays untouched. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(46,46,46,0.32) 0%, rgba(46,46,46,0) 22%, rgba(46,46,46,0) 70%, rgba(46,46,46,0.38) 100%)",
            }}
          />

          {/* Top-left chip — reinforces non-confirmed status */}
          <div
            className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.22em] font-semibold"
            style={{
              background: "color-mix(in oklab, var(--ivory) 88%, transparent)",
              color: "color-mix(in oklab, var(--charcoal) 80%, transparent)",
              border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
              borderRadius: "2px",
            }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> Suggested route
          </div>

          {/* Bottom-right footnote — clarifies status without alarming */}
          {revealed >= journey.moments.length ? (
            <div
              className="absolute right-3 bottom-3 z-10 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.22em] font-semibold"
              style={{
                background: "color-mix(in oklab, var(--charcoal) 80%, transparent)",
                color: "var(--ivory)",
                borderRadius: "2px",
                animation: "studioV3RiseIn 520ms ease-out both",
              }}
            >
              To be confirmed by YES
            </div>
          ) : null}
        </div>
      </section>


      {/* Editorial moment card — anchored to lower portion. */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pt-4">
        <div className="mx-auto max-w-[560px]">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3" aria-hidden>
            {journey.moments.map((m, i) => (
              <span
                key={m.index}
                className="block h-[2px] transition-all duration-[320ms]"
                style={{
                  width: i === active ? 20 : 10,
                  background:
                    i === active
                      ? "var(--gold)"
                      : i < revealed
                        ? "color-mix(in oklab, var(--charcoal) 35%, transparent)"
                        : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                }}
              />
            ))}
          </div>

          {current ? (
            <article
              key={current.index}
              className="relative px-5 py-5 border"
              style={{
                background: "var(--ivory)",
                borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                boxShadow: "0 18px 44px -24px rgba(46,46,46,0.28)",
                animation: "studioV3RiseIn 520ms ease-out both",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.28em] font-semibold"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                Moment {String(current.index + 1).padStart(2, "0")} ·{" "}
                <span style={{ color: "var(--gold)" }}>{journey.tour.region}</span>
                {current.borrowed ? (
                  <span
                    className="ml-2 inline-block align-middle h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--gold)" }}
                    role="img"
                    aria-label="Chosen for the way you travel"
                    title="Chosen for the way you travel"
                  />
                ) : null}
              </p>

              <h2
                className="mt-2 text-[20px] sm:text-[24px] leading-[1.15] tracking-[-0.01em] font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
              >
                {current.label}
              </h2>
              <p
                className="mt-2 text-[13px] leading-relaxed italic"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "color-mix(in oklab, var(--charcoal) 75%, transparent)",
                }}
              >
                {current.story}
              </p>
            </article>
          ) : null}

          {/* Transport */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={active === 0}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
              aria-label="Previous moment"
            >
              <ArrowLeft size={14} />
            </button>

            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
              aria-pressed={!playing}
            >
              {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
              {playing ? "Pause" : "Resume"}
            </button>

            <button
              type="button"
              onClick={() => step(1)}
              disabled={active >= journey.moments.length - 1}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
              aria-label="Next moment"
            >
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Hold this journey CTA — appears when sequence completes. */}
          <div
            className={`mt-5 text-center transition-opacity duration-[520ms] ${
              isLast ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!isLast}
          >
            <button
              type="button"
              onClick={() => onContinue(journey.tour.id)}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Hold this journey <ArrowRight size={14} aria-hidden />
            </button>
            <p
              className="mt-2 text-[10px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 45%, transparent)" }}
            >
              Suggested route · to be confirmed by YES
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes studioV3RiseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes studioV3AnticipationBreath {
          0%   { opacity: 0; transform: scale(0.985); }
          40%  { opacity: 1; transform: scale(1.01); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="studio-v3-map-anticipation"] { transition: none; animation: none; }
        }
      `}</style>
    </div>
  );
}
