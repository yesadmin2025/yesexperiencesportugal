// Studio V3 — Living Journey Panel (Phase 1, mobile QA hotfix v2).
//
// Hardened to never overlap mobile content:
//   - Hidden entirely on mobile (< md). Mobile already runs the full
//     cinematic single-column flow; the panel was adding noise and
//     occasionally overlapping the question / Back / step label /
//     choice grid / Continue CTA.
//   - On tablet/desktop, rendered as a compact inline card at the top
//     of <main>, in normal document flow (never fixed, never sticky),
//     so it can never overlap PhaseShell content.
//
// Other rules (locked):
//   - Reads state ONLY through existing curation helpers.
//   - Never invents stops: route + moments come from resolveStudioV3Route.
//   - Soft fade only (≤220ms), brand tokens only, mobile-first.
//   - Hidden on "feeling" / "map" / "storyboard" phases and while a
//     reaction beat plays.
//   - Placeholder rows are hidden until they carry real data, so the
//     card stays small early in the flow. "Investment shown once you
//     choose your tier" placeholder removed — investment row only
//     appears once a tier is actually selected.

import { useMemo } from "react";
import {
  composeJourneyTitle,
  getOptionLabel,
  resolveStudioV3Route,
} from "./curation";
import {
  COMPANIONS,
  FEELINGS,
  INTERESTS,
  INVESTMENT_TIERS,
  RHYTHMS,
  type StudioV3State,
} from "./types";

interface LivingJourneyPanelProps {
  state: StudioV3State;
  /** Hide when the phase already owns the screen (map / storyboard / first feeling) or a reaction beat plays. */
  hidden?: boolean;
}

export function LivingJourneyPanel({ state, hidden = false }: LivingJourneyPanelProps) {
  const title = useMemo(
    () =>
      composeJourneyTitle({
        feeling: state.feeling,
        companions: state.companions,
        occasion: state.occasion,
        pickup: state.pickup,
        interests: state.interests,
        rhythm: state.rhythm,
        region: null,
      }),
    [
      state.feeling,
      state.companions,
      state.occasion,
      state.pickup,
      state.interests,
      state.rhythm,
    ],
  );

  // DNA pills — max 3 in stable order: feeling · companions · rhythm.
  // Interest pulled in only when room remains (we cap at 3 to stay compact).
  const dna = useMemo(() => {
    const pills: string[] = [];
    if (state.feeling) pills.push(getOptionLabel(FEELINGS, state.feeling));
    if (state.companions) pills.push(getOptionLabel(COMPANIONS, state.companions));
    if (state.rhythm) pills.push(getOptionLabel(RHYTHMS, state.rhythm));
    if (pills.length < 3 && state.interests && state.interests.length > 0) {
      pills.push(getOptionLabel(INTERESTS, state.interests[0]));
    }
    return pills.slice(0, 3);
  }, [state.feeling, state.companions, state.rhythm, state.interests]);

  // Route + moments — only resolved once the three core picks AND a pickup
  // or at least one interest are in (avoids early placeholder noise).
  const meaningfulRoute =
    !!(state.feeling && state.companions && state.rhythm) &&
    !!(state.pickup || (state.interests && state.interests.length > 0));

  const resolved = useMemo(() => {
    if (!meaningfulRoute) return null;
    return resolveStudioV3Route({
      feeling: state.feeling!,
      companions: state.companions!,
      rhythm: state.rhythm!,
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
    });
  }, [
    meaningfulRoute,
    state.feeling,
    state.companions,
    state.rhythm,
    state.interests,
    state.pickup,
    state.occasion,
  ]);

  const routeLine = resolved?.suggestedRouteLabel ?? null;
  const moments = (resolved?.routePoints ?? []).slice(0, 3).map((p) => p.label);
  const investmentLabel = state.investment
    ? getOptionLabel(INVESTMENT_TIERS, state.investment)
    : null;

  if (hidden) return null;

  return (
    // `hidden md:flex` — completely off the DOM-render path on mobile so
    // it can never overlap the PhaseShell. Tablet/desktop only.
    <div className="hidden md:flex w-full justify-center px-3 pt-3">
      <div
        className="w-full max-w-md rounded-[2px] border px-3 py-2 transition-opacity duration-[220ms] ease-out motion-reduce:transition-none"
        style={{
          background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
          borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
          boxShadow: "0 8px 24px -18px color-mix(in oklab, var(--charcoal) 35%, transparent)",
        }}
      >
        {/* Eyebrow + working title */}
        <p
          className="text-[9px] uppercase tracking-[0.26em] font-bold leading-none"
          style={{ color: "var(--gold)" }}
        >
          Your journey · forming
        </p>
        <h2
          className="mt-1 text-[13px] leading-tight font-semibold truncate"
          style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>

        {/* DNA pills — only when at least one exists */}
        {dna.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {dna.map((label) => (
              <li
                key={label}
                className="rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.18em] font-semibold leading-none"
                style={{
                  background: "color-mix(in oklab, var(--sand) 70%, transparent)",
                  color: "color-mix(in oklab, var(--charcoal) 80%, transparent)",
                }}
              >
                {label}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Route — only when we actually have a meaningful resolved route */}
        {routeLine ? (
          <p
            className="mt-1.5 text-[10.5px] leading-tight truncate"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            <span
              className="mr-1 uppercase tracking-[0.2em] font-bold"
              style={{ color: "color-mix(in oklab, var(--teal) 80%, transparent)" }}
            >
              Route
            </span>
            {routeLine}
          </p>
        ) : null}

        {/* Moments so far — only once they exist */}
        {moments.length > 0 ? (
          <p
            className="mt-1 text-[10.5px] leading-tight truncate"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            <span
              className="mr-1 uppercase tracking-[0.2em] font-bold"
              style={{ color: "color-mix(in oklab, var(--teal) 80%, transparent)" }}
            >
              Moments
            </span>
            {moments.join(" · ")}
          </p>
        ) : null}

        {/* Investment tier — label only, never €. Only after user picks.
            No "Investment shown once you choose your tier" placeholder. */}
        {investmentLabel ? (
          <p
            className="mt-1 text-[10.5px] leading-tight truncate"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            <span
              className="mr-1 uppercase tracking-[0.2em] font-bold"
              style={{ color: "color-mix(in oklab, var(--teal) 80%, transparent)" }}
            >
              Investment
            </span>
            {investmentLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
