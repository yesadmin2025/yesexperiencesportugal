// Studio V3 — Smart Recommendation.
//
// Picks the single most relevant real add-on for the current journey and
// surfaces it as a 1-click suggestion. Never invents experiences: pulls
// from `selectSignatureAddOns`, which only returns add-ons whose source
// Signature exists. Renders nothing when no add-on qualifies.
//
// Mobile-first card under the Story tab: eyebrow + label + blurb + price
// + a "Suggest this" affordance. Click is informational only — it logs to
// the funnel as `addon_toggle`. Actual add-on purchase happens later in
// the booking flow; this is the cinematic moment of being seen.

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import {
  addOnEurFromBase,
  selectSignatureAddOns,
  regionBucket,
  LISBON_SUBREGION_BY_TOUR_ID,
} from "@/data/signatureAddOns";
import { trackStep } from "@/lib/studio-v3-funnel";
import { recordStudioV3RevealAddOns } from "@/lib/studio-v3-telemetry";

interface SmartRecommendationProps {
  /** Resolved Signature tour id (from resolveStudioV3Route). */
  tourId: string | null;
  /** Number of stops in the resolved itinerary. */
  stopCount: number;
  /** Loose duration label (e.g. "7–9h"). */
  durationLabel: string | null;
}

export function SmartRecommendation({
  tourId,
  stopCount,
  durationLabel,
}: SmartRecommendationProps) {
  const [accepted, setAccepted] = useState(false);

  const { addon, priceEur, pool, tour } = useMemo(() => {
    if (!tourId) return { addon: null, priceEur: null, pool: [], tour: null };
    const t = signatureTours.find((x) => x.id === tourId) ?? null;
    if (!t) return { addon: null, priceEur: null, pool: [], tour: null };
    const picks = selectSignatureAddOns({
      resolvedTour: t,
      stopCount,
      durationLabel,
    });
    const first = picks[0] ?? null;
    if (!first) return { addon: null, priceEur: null, pool: picks, tour: t };
    const base = t.priceFrom && t.priceFrom > 0 ? t.priceFrom : null;
    const price = base ? addOnEurFromBase(base, first.pricePctOfBase) : null;
    return { addon: first, priceEur: price, pool: picks, tour: t };
  }, [tourId, stopCount, durationLabel]);

  // Fire-and-forget telemetry: record the anchor region + filtered pool so
  // we can detect future region/sub-region drift (e.g. Arrábida on Sintra).
  useEffect(() => {
    if (!tour) return;
    const bucket = regionBucket(tour.region);
    const anchorSub = bucket === "lisbon-arrabida"
      ? LISBON_SUBREGION_BY_TOUR_ID[tour.id] ?? null
      : null;
    const mismatch =
      bucket === "lisbon-arrabida" && anchorSub
        ? pool.some((a) => a.lisbonSubRegion && a.lisbonSubRegion !== anchorSub)
        : false;
    recordStudioV3RevealAddOns({
      surface: "smart-reco",
      tourId: tour.id,
      region: tour.region ?? null,
      regionBucket: bucket,
      lisbonSubRegion: anchorSub,
      stopCount,
      durationLabel,
      poolSize: pool.length,
      poolIds: pool.map((a) => a.id),
      poolSourceTourIds: pool.map((a) => a.sourceTourId),
      poolLisbonSubRegions: pool.map((a) => a.lisbonSubRegion ?? null),
      mismatch,
    });
  }, [tour, pool, stopCount, durationLabel]);


  if (!addon) return null;

  const onAccept = () => {
    setAccepted(true);
    trackStep({
      stepNumber: 9,
      stepKey: "smart_recommendation",
      event: "addon_toggle",
      value: { addon_id: addon.id, on: true, source: "smart_reco" },
    });
  };

  return (
    <div
      data-testid="studio-v3-smart-reco"
      className="mt-4 rounded-[4px] border px-3.5 py-3"
      style={{
        background: "color-mix(in oklab, var(--gold) 8%, var(--ivory))",
        borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} aria-hidden style={{ color: "var(--gold)" }} />
        <p
          className="text-[9px] uppercase tracking-[0.26em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          Smart recommendation
        </p>
      </div>
      <p
        className="mt-1.5 text-[13.5px] font-semibold leading-snug"
        style={{
          color: "var(--charcoal)",
          fontFamily: "var(--font-display)",
        }}
      >
        {addon.label}
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
      >
        {addon.blurb}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {priceEur ? (
          <p
            className="text-[11px] tabular-nums"
            style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
          >
            <span className="font-semibold">+ €{priceEur}</span>{" "}
            <span className="opacity-70">/ guest</span>
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onAccept}
          disabled={accepted}
          aria-pressed={accepted}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-80"
          style={{
            background: accepted ? "var(--teal)" : "var(--charcoal)",
            color: "var(--ivory)",
          }}
        >
          {accepted ? "Suggested ✓" : "Suggest this"}
          {!accepted ? (
            <span aria-hidden style={{ color: "var(--gold)" }}>
              ›
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
