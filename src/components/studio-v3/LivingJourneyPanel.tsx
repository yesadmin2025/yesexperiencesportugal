// Studio V3 — Living Journey Panel (Phase 1 only).
//
// A compact, fixed top card that updates live as the user makes choices,
// so the Studio feels like a journey being designed — not a sequence of
// isolated questions.
//
// Rules (locked):
//   - Reads state ONLY through existing curation helpers.
//   - Never invents stops: route + moments come from resolveStudioV3Route.
//   - Soft fade only (≤220ms), brand tokens only, mobile-first.
//   - Hidden on the opening "feeling" phase (don't compete with first pick),
//     on "map" / "storyboard" (own panels), and while a reaction beat plays.

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

  // DNA pills — at most 4, in stable order: feeling · companions · rhythm · top interest.
  const dna = useMemo(() => {
    const pills: string[] = [];
    if (state.feeling) pills.push(getOptionLabel(FEELINGS, state.feeling));
    if (state.companions) pills.push(getOptionLabel(COMPANIONS, state.companions));
    if (state.rhythm) pills.push(getOptionLabel(RHYTHMS, state.rhythm));
    if (state.interests && state.interests.length > 0) {
      pills.push(getOptionLabel(INTERESTS, state.interests[0]));
    }
    return pills.slice(0, 4);
  }, [state.feeling, state.companions, state.rhythm, state.interests]);

  // Route + moments — only resolved once the three core picks are in.
  const resolved = useMemo(() => {
    if (!state.feeling || !state.companions || !state.rhythm) return null;
    return resolveStudioV3Route({
      feeling: state.feeling,
      companions: state.companions,
      rhythm: state.rhythm,
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
    });
  }, [
    state.feeling,
    state.companions,
    state.rhythm,
    state.interests,
    state.pickup,
    state.occasion,
  ]);

  const routeLine = resolved?.suggestedRouteLabel ?? "Route forms as you choose";
  const moments = (resolved?.routePoints ?? []).slice(0, 3).map((p) => p.label);
  const investmentLabel = state.investment
    ? getOptionLabel(INVESTMENT_TIERS, state.investment)
    : null;

  return (
    <div
      aria-hidden={hidden}
      className={[
        "pointer-events-none fixed inset-x-0 top-10 z-20 flex justify-center px-3",
        "transition-opacity duration-[220ms] ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-[2px] border px-3.5 py-2.5 backdrop-blur-sm"
        style={{
          background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
          borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
          boxShadow: "0 8px 24px -18px color-mix(in oklab, var(--charcoal) 35%, transparent)",
        }}
      >
        {/* Eyebrow + working title */}
        <p
          className="text-[9px] uppercase tracking-[0.26em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          Your journey · forming
        </p>
        <h2
          className="mt-0.5 text-[13.5px] leading-snug font-semibold truncate"
          style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>

        {/* DNA pills */}
        {dna.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {dna.map((label) => (
              <li
                key={label}
                className="rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.18em] font-semibold"
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

        {/* Route line */}
        <p
          className="mt-1.5 text-[10.5px] truncate"
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

        {/* Moments so far */}
        {moments.length > 0 ? (
          <p
            className="mt-1 text-[10.5px] truncate"
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

        {/* Investment tier — label only, never € */}
        <p
          className="mt-1 text-[10.5px] truncate"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          <span
            className="mr-1 uppercase tracking-[0.2em] font-bold"
            style={{ color: "color-mix(in oklab, var(--teal) 80%, transparent)" }}
          >
            Investment
          </span>
          {investmentLabel ?? "Shown once you choose your tier"}
        </p>
      </div>
    </div>
  );
}
