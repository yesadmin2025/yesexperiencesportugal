// Premium price card for the Studio V3 reveal.
//
// Anchored entirely in real, tour-specific data:
//   - priceFrom in EUR (the same canonical price shown on Signature/Viator-backed tour pages)
//   - duration label from signatureTours[tourId].durationHours
//   - real stop count from the resolved/edited route
//
// Optional add-ons are kept behind an explicit prop for admin/test flows. The
// public Studio reveal shows the real Viator-backed base price only, avoiding
// misleading totals before a human confirms availability.
//
// If the base price is missing, the card degrades gracefully to
// "Price on request" + a WhatsApp escape hatch. No fabricated numbers.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { VIATOR_META } from "@/data/signatureToursViator";
import {
  addOnEurFromBase,
  selectSignatureAddOns,
  selectSignatureAddOnsWithBudget,
  regionBucket,
  LISBON_SUBREGION_BY_TOUR_ID,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import type { SignatureTour } from "@/data/signatureTours";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";

import { whatsappHref } from "@/components/WhatsAppFab";
import {
  recordStudioV3RevealPremium,
  recordStudioV3RevealAddOns,
} from "@/lib/studio-v3-telemetry";

/** Fixed USD→EUR conversion. We don't show "live FX" or hide behind decimals
 *  — this is a "from" anchor, rounded to the nearest €5 so it reads premium. */
const USD_TO_EUR = 0.93;
function usdToEurAnchor(usd: number): number {
  const raw = usd * USD_TO_EUR;
  return Math.max(5, Math.round(raw / 5) * 5);
}

export interface SignaturePriceCardProps {
  tour: SignatureTour | null;
  stopCount: number;
  dateExact: string | null;
  onSecure: () => void;
  onRefine: () => void;
  journeyTitle?: string | null;
  /** Number of travellers — when ≥2, party total is shown alongside per-pp. */
  guests?: number | null;
  /** Real `included[]` from the resolved Signature — drives the footnote. */
  included?: ReadonlyArray<string>;
  /** Public Studio keeps pricing clean; legacy/tests can still exercise add-ons. */
  showAddOns?: boolean;
  /**
   * Called when the traveller selects a tier in the hidden picker. Lets the
   * parent persist the chosen guest size into Studio V3 state so the saved
   * session + Stripe checkout always reflect the same per-person price and
   * party total the user just confirmed. Optional — when omitted the picker
   * still works as a local preview.
   */
  onGuestsChange?: (guests: number) => void;
  /**
   * Admin preview only: override the DB-resolved price tiers for THIS tour
   * with unsaved values so the editor can render the public card before
   * persisting. Does not affect the rest of the app.
   */
  previewTiers?: import("@/data/signatureToursViator").PriceTiersEUR | null;
  /**
   * Remaining minutes in the day budget after stops + drive legs. When
   * provided, add-ons that wouldn't fit are kept visible but dimmed and
   * locked, so the traveller can see *why* an upgrade isn't offered without
   * feeling the day shrinks invisibly.
   */
  remainingMinutes?: number | null;
  /**
   * Ordered stop labels for the resolved/edited Signature route. When
   * provided, the card surfaces a "Your day includes" spine above the
   * inclusion footnote so the price reads against the real day, not a
   * skeleton. Names only — never invented, sourced from the route.
   */
  itineraryStops?: ReadonlyArray<string>;
  /** Approximate total day length in hours (drive + dwell), used in the spine summary. */
  dwellHours?: number | null;
}

export function SignaturePriceCard({
  tour,
  stopCount,
  dateExact,
  onSecure,
  onRefine,
  journeyTitle,
  guests,
  included,
  showAddOns = true,
  onGuestsChange,
  previewTiers = null,
  remainingMinutes = null,
  itineraryStops = [],
  dwellHours = null,
}: SignaturePriceCardProps) {
  const meta = tour ? VIATOR_META[tour.id] : null;
  const priceEur = useMemo(() => {
    if (tour?.priceFrom && tour.priceFrom > 0) return tour.priceFrom;
    if (!meta?.priceFromUSD || meta.priceFromUSD <= 0) return null;
    return usdToEurAnchor(meta.priceFromUSD);
  }, [meta, tour?.priceFrom]);
  const priceSource =
    tour?.priceFrom && tour.priceFrom > 0
      ? "signature"
      : meta?.priceFromUSD
        ? "viator-usd"
        : "missing";

  const durationLabel = tour?.durationHours ?? tour?.duration ?? null;
  const hasPrice = priceEur != null;

  // Budget-aware add-on pool: every eligible option stays visible so the
  // traveller can read it, but ones that wouldn't fit the regional rhythm
  // are flagged via `fitsBudget` and locked at the UI layer below.
  const addOnPool = useMemo(
    () =>
      selectSignatureAddOnsWithBudget({
        resolvedTour: tour,
        stopCount,
        durationLabel,
        remainingMinutes: remainingMinutes ?? undefined,
      }),
    [tour, stopCount, durationLabel, remainingMinutes],
  );
  const availableAddOns = useMemo<SignatureAddOn[]>(
    () => addOnPool.map((e) => e.addOn),
    [addOnPool],
  );
  const fitsBudgetById = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const e of addOnPool) m[e.addOn.id] = e.fitsBudget;
    return m;
  }, [addOnPool]);
  // Fire-and-forget telemetry: snapshot the anchor region + filtered pool so
  // future region/sub-region mismatches (e.g. Arrábida on Sintra) are caught
  // in audit. No PII; just the surface, tour id, bucket, and pool ids.
  useEffect(() => {
    if (!tour) return;
    const bucket = regionBucket(tour.region);
    const anchorSub =
      bucket === "lisbon-arrabida"
        ? LISBON_SUBREGION_BY_TOUR_ID[tour.id] ?? null
        : null;
    const mismatch =
      bucket === "lisbon-arrabida" && anchorSub
        ? availableAddOns.some(
            (a) => a.lisbonSubRegion && a.lisbonSubRegion !== anchorSub,
          )
        : false;
    recordStudioV3RevealAddOns({
      surface: "price-card",
      tourId: tour.id,
      region: tour.region ?? null,
      regionBucket: bucket,
      lisbonSubRegion: anchorSub,
      stopCount,
      durationLabel,
      poolSize: availableAddOns.length,
      poolIds: availableAddOns.map((a) => a.id),
      poolSourceTourIds: availableAddOns.map((a) => a.sourceTourId),
      poolLisbonSubRegions: availableAddOns.map((a) => a.lisbonSubRegion ?? null),
      mismatch,
    });
  }, [tour, availableAddOns, stopCount, durationLabel]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [pendingAddOnId, setPendingAddOnId] = useState<string | null>(null);
  const MAX_ADDONS = 3;
  const atCap = selectedAddOnIds.length >= MAX_ADDONS;
  const toggleAddOn = (id: string) => {
    const isSelected = selectedAddOnIds.includes(id);
    if (!isSelected && atCap) return; // gated
    // Budget gate: never let the user push the day past the regional rhythm.
    if (!isSelected && fitsBudgetById[id] === false) return;
    // Toggle synchronously so totals + a11y stay deterministic.
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    // Transient visual flourish — pending shimmer for ≤180ms, reduced-motion safe.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    setPendingAddOnId(id);
    window.setTimeout(() => setPendingAddOnId(null), 180);
  };
  const addOnsTotalEur = useMemo(() => {
    if (!hasPrice || !priceEur) return 0;
    return availableAddOns
      .filter((a) => selectedAddOnIds.includes(a.id))
      .reduce((sum, a) => sum + addOnEurFromBase(priceEur, a.pricePctOfBase), 0);
  }, [availableAddOns, selectedAddOnIds, hasPrice, priceEur]);
  // Real per-pax (Viator tier) resolution. When the tour has tier data AND
  // we know the guest count, `realPerPax.real === true` and we display the
  // exact per-person rate; otherwise we keep the "from" anchor.
  const { data: tierOverrides } = useTourPriceTiers();
  const effectiveOverrides = useMemo(() => {
    if (!previewTiers || !tour) return tierOverrides ?? null;
    return { ...(tierOverrides ?? {}), [tour.id]: previewTiers };
  }, [tierOverrides, previewTiers, tour]);

  // Hidden picker — lets the traveller preview the per-pax rate for any
  // group size 1..8+ before checkout. Defaults to the funnel's `guests`.
  // `previewGuests === null` means "use the funnel guests value as-is".
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewGuests, setPreviewGuests] = useState<number | null>(null);
  const effectiveGuests = previewGuests ?? guests ?? null;

  const realPerPax = useMemo(
    () => resolvePerPaxEur(tour, effectiveGuests, effectiveOverrides),
    [tour, effectiveGuests, effectiveOverrides],
  );

  const displayPerPaxEur = realPerPax?.real ? realPerPax.eurPerPax : priceEur;
  const totalEur = hasPrice && priceEur ? priceEur + addOnsTotalEur : null;
  const partyCount = effectiveGuests && effectiveGuests >= 2 ? effectiveGuests : null;
  const partyBaseEur =
    displayPerPaxEur != null && partyCount != null ? displayPerPaxEur * partyCount : null;
  const partyTotalEur =
    partyBaseEur != null ? partyBaseEur + addOnsTotalEur * (partyCount ?? 1) : null;

  // Tier rows for the picker — real per-pax when available, "from" anchor otherwise.
  const tierRows = useMemo(() => {
    if (!tour || !priceEur) return [] as Array<{ tier: number; eur: number; real: boolean }>;
    const tiers = effectiveOverrides?.[tour.id] ?? VIATOR_META[tour.id]?.priceTiersEUR;
    return [1, 2, 3, 4, 5, 6, 7, 8].map((t) => {
      const raw = tiers?.[t as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8];
      const real = typeof raw === "number" && raw > 0;
      return { tier: t, eur: real ? (raw as number) : priceEur, real };
    });
  }, [tour, priceEur, effectiveOverrides]);

  // S2 — Smart suggestion: the first eligible add-on the resolver returned,
  // dismissible, hidden once it's been selected. Never invented — sourced
  // from a real sibling Signature in the same region.
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const suggestion = useMemo<SignatureAddOn | null>(() => {
    if (!showAddOns || !hasPrice) return null;
    if (suggestionDismissed) return null;
    const first = availableAddOns[0];
    if (!first) return null;
    if (selectedAddOnIds.includes(first.id)) return null;
    if (atCap) return null;
    return first;
  }, [availableAddOns, selectedAddOnIds, atCap, hasPrice, suggestionDismissed, showAddOns]);

  // S3 — "Why this works": three short lines pulled from the resolved
  // Signature's real `included[]`. Pure data, never invented copy.
  const whyThisWorks = useMemo<string[]>(() => {
    if (!included || included.length === 0) return [];
    return included
      .slice(0, 3)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [included]);

  // S4 — Inclusions footnote: up to 4 short items from the real `included[]`.
  const inclusionFootnote = useMemo<string[]>(() => {
    if (!included || included.length === 0) return [];
    return included
      .slice(0, 4)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [included]);

  useEffect(() => {
    recordStudioV3RevealPremium({
      tourId: tour?.id ?? null,
      hasPrice,
      priceFromEUR: priceEur,
      durationLabel,
      stopCount,
      dateExact,
    });
  }, [tour?.id, hasPrice, priceEur, durationLabel, stopCount, dateExact]);

  // Mobile sticky CTA — visible only after the inline CTA scrolls out of view.
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  useEffect(() => {
    if (!hasPrice) {
      setStickyVisible(false);
      return;
    }
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Show the sticky bar once the inline CTA has scrolled past the viewport.
        setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasPrice]);

  return (
    <section
      data-testid="studio-v3-price-card"
      data-has-price={hasPrice ? "true" : "false"}
      data-price-source={priceSource}
      data-tour-id={tour?.id ?? ""}
      data-base-price-eur={priceEur ?? ""}
      className="mx-auto mt-10 w-full max-w-[460px] px-5"
      aria-label="Your Signature — investment"
    >
      {/* Reveal stagger — premium sequenced entrance. Direct children of
          the inner card fade up one beat at a time. Disabled under
          prefers-reduced-motion. */}
      <style>{`
        [data-sv3-stagger] > * {
          opacity: 0;
          animation: sv3-rise 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        [data-sv3-stagger] > *:nth-child(1)  { animation-delay: 0ms; }
        [data-sv3-stagger] > *:nth-child(2)  { animation-delay: 80ms; }
        [data-sv3-stagger] > *:nth-child(3)  { animation-delay: 180ms; }
        [data-sv3-stagger] > *:nth-child(4)  { animation-delay: 280ms; }
        [data-sv3-stagger] > *:nth-child(5)  { animation-delay: 360ms; }
        [data-sv3-stagger] > *:nth-child(6)  { animation-delay: 440ms; }
        [data-sv3-stagger] > *:nth-child(7)  { animation-delay: 520ms; }
        [data-sv3-stagger] > *:nth-child(8)  { animation-delay: 600ms; }
        [data-sv3-stagger] > *:nth-child(9)  { animation-delay: 680ms; }
        [data-sv3-stagger] > *:nth-child(n+10) { animation-delay: 760ms; }
        @keyframes sv3-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-sv3-stagger] > * { opacity: 1; animation: none; transform: none; }
        }
      `}</style>
      <div
        data-sv3-stagger
        className="relative overflow-hidden rounded-[6px] px-5 py-6 text-center"
        style={{
          background: "color-mix(in oklab, var(--ivory) 88%, var(--sand))",
          border: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
          boxShadow: "0 18px 44px -28px rgba(46,46,46,0.32)",
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-[2px] w-12 -translate-x-1/2 rounded-b-full"
          style={{ background: "var(--gold)" }}
        />
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span>{" "}
          {journeyTitle ? "Your Signature" : "The journey you composed"}
        </p>
        {journeyTitle ? (
          <p
            className="mt-2 text-[19px] sm:text-[21px] leading-[1.2] italic text-balance"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--charcoal)",
            }}
          >
            “{journeyTitle}”
          </p>
        ) : null}

        {hasPrice ? (
          <>
            <p
              className="mt-3 text-[11px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              {realPerPax?.real
                ? `For ${realPerPax.tier === 8 ? "8+" : realPerPax.tier} ${realPerPax.tier === 1 ? "guest" : "guests"}`
                : "From"}
            </p>
            <p
              data-testid="studio-v3-base-price"
              data-eur={priceEur ?? ""}
              data-per-pax-eur={displayPerPaxEur ?? ""}
              data-per-pax-real={realPerPax?.real ? "true" : "false"}
              className="mt-1 text-[40px] leading-none font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
            >
              €{realPerPax?.real ? displayPerPaxEur : priceEur}
              <span
                className="ml-1.5 align-middle text-[13px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
              >
                / pp
              </span>
            </p>
            <p
              className="mt-2 text-[11px] italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              }}
            >
              {realPerPax?.real
                ? "Real per-pax for your group — driver, guide and every detail handled."
                : "A private day, just for you — driver, guide and every detail handled. You only show up."}
            </p>
            {partyTotalEur != null ? (
              <p
                data-testid="studio-v3-party-total"
                className="mt-2 text-[12px] font-semibold tabular-nums"
                style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
              >
                × {partyCount} guests <span style={{ color: "var(--gold)" }}>—</span>{" "}
                <span style={{ color: "var(--charcoal)" }}>€{partyTotalEur}</span>{" "}
                <span className="text-[9.5px] uppercase tracking-[0.2em] opacity-70">
                  investment
                </span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p
              className="mt-3 text-[20px] sm:text-[22px] leading-tight font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
            >
              Price shaped with you
            </p>
            <p
              className="mt-2 text-[12.5px] italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
              }}
            >
              This Signature is bespoke — a YES curator confirms the investment before anything is
              reserved.
            </p>
          </>
        )}

        {/* Hidden picker — preview per-pax for any group size before checkout. */}
        {hasPrice && tierRows.length > 0 ? (
          <div className="mt-5 mx-auto max-w-[380px]" data-testid="studio-v3-tier-picker">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              aria-controls="studio-v3-tier-picker-panel"
              className="mx-auto inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded"
              style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span>
              {pickerOpen ? "Hide group pricing" : "See price for your group size"}
              <ChevronDown
                size={12}
                aria-hidden
                style={{
                  transform: pickerOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease-out",
                  color: "var(--gold)",
                }}
              />
            </button>
            {pickerOpen ? (
              <div
                id="studio-v3-tier-picker-panel"
                role="radiogroup"
                aria-label="Per-person price by group size"
                className="mt-3 grid grid-cols-4 gap-1.5 rounded-[4px] p-2"
                style={{
                  background: "color-mix(in oklab, var(--ivory) 94%, var(--sand))",
                  border: "1px solid color-mix(in oklab, var(--charcoal) 12%, transparent)",
                }}
              >
                {tierRows.map((r) => {
                  const active =
                    (effectiveGuests ?? 0) === r.tier ||
                    (r.tier === 8 && (effectiveGuests ?? 0) >= 8);
                  return (
                    <button
                      key={r.tier}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setPreviewGuests(r.tier);
                        onGuestsChange?.(r.tier);
                      }}
                      data-tier={r.tier}
                      data-active={active ? "true" : "false"}
                      data-real={r.real ? "true" : "false"}
                      className="flex flex-col items-center gap-0.5 rounded-[3px] px-1.5 py-2 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      style={{
                        background: active
                          ? "color-mix(in oklab, var(--gold) 18%, var(--ivory))"
                          : "var(--ivory)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: active
                          ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                          : "color-mix(in oklab, var(--charcoal) 10%, transparent)",
                      }}
                    >
                      <span
                        className="text-[10px] uppercase tracking-[0.16em] font-bold"
                        style={{
                          color: active
                            ? "var(--charcoal)"
                            : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                        }}
                      >
                        {r.tier === 8 ? "8+" : r.tier}
                      </span>
                      <span
                        className="text-[12px] font-bold tabular-nums leading-none"
                        style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
                      >
                        €{r.eur}
                      </span>
                      <span
                        className="text-[8.5px] uppercase tracking-[0.14em] font-semibold"
                        style={{
                          color: r.real
                            ? "color-mix(in oklab, var(--charcoal) 50%, transparent)"
                            : "color-mix(in oklab, var(--charcoal) 38%, transparent)",
                        }}
                      >
                        {r.real ? "/ pp" : "from"}
                      </span>
                    </button>
                  );
                })}
                <p
                  className="col-span-4 mt-1 text-center text-[10px] italic leading-snug"
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  }}
                >
                  Private day — same itinerary, per-person rate adjusts with group size.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <ul
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          {durationLabel ? (
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="block h-1 w-1 rounded-full"
                style={{ background: "var(--gold)" }}
              />
              {durationLabel}
            </li>
          ) : null}
          {stopCount > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="block h-1 w-1 rounded-full"
                style={{ background: "var(--gold)" }}
              />
              {stopCount} {stopCount === 1 ? "moment" : "moments"}
            </li>
          ) : null}
          {dateExact ? (
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="block h-1 w-1 rounded-full"
                style={{ background: "var(--gold)" }}
              />
              {formatPriceDate(dateExact)}
            </li>
          ) : null}
        </ul>

        {/* S3 — Why this works: 3 bullets from the resolved Signature's real
            `included[]`. No invented copy, no quality score gimmick. */}
        {hasPrice && whyThisWorks.length > 0 ? (
          <div
            data-testid="studio-v3-why-this-works"
            className="mt-5 mx-auto max-w-[380px] text-left"
          >
            <p
              className="text-center text-[10.5px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span> Why this works
            </p>
            <ul className="mt-2 space-y-1.5">
              {whyThisWorks.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 16)}`}
                  className="flex items-start gap-2 text-[12px] leading-snug"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
                >
                  <span
                    aria-hidden
                    className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full"
                    style={{ background: "var(--gold)" }}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* S2 — Smart suggestion: promote the most-relevant eligible add-on
            as an "Often added" upsell card above the chip list. Dismissible.
            Sourced from a real sibling Signature; never invented. */}
        {showAddOns && suggestion ? (
          <div
            data-testid="studio-v3-suggested-addon"
            data-addon-id={suggestion.id}
            className="mt-5 mx-auto max-w-[380px] flex items-start gap-3 rounded-[4px] px-3 py-2.5 text-left"
            style={{
              background: "color-mix(in oklab, var(--gold) 8%, var(--ivory))",
              border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
            }}
          >
            <span className="flex-1 min-w-0">
              <span
                className="block text-[9.5px] uppercase tracking-[0.24em] font-bold"
                style={{ color: "var(--gold)" }}
              >
                Often added
              </span>
              <span
                className="mt-0.5 block text-[12.5px] font-semibold"
                style={{ color: "var(--charcoal)" }}
              >
                {suggestion.label}
              </span>
              <span
                className="mt-0.5 block text-[11.5px] leading-snug"
                style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
              >
                {suggestion.blurb}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => toggleAddOn(suggestion.id)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold transition-transform duration-200 hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
              >
                Add +€{addOnEurFromBase(priceEur ?? 0, suggestion.pricePctOfBase)}
              </button>
              <button
                type="button"
                onClick={() => setSuggestionDismissed(true)}
                aria-label="Dismiss suggestion"
                className="text-[10px] uppercase tracking-[0.18em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                Not now
              </button>
            </span>
          </div>
        ) : null}

        {showAddOns && hasPrice && availableAddOns.length > 0 ? (
          <fieldset
            data-testid="studio-v3-add-ons"
            data-count={availableAddOns.length}
            className="mt-6 mx-auto max-w-[380px] text-left"
          >
            <legend
              className="mb-2 w-full text-center text-[10.5px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span> Make the day yours
            </legend>
            <ul className="flex flex-col gap-2">
              {availableAddOns.map((a) => {
                const eur = addOnEurFromBase(priceEur ?? 0, a.pricePctOfBase);

                const selected = selectedAddOnIds.includes(a.id);
                const pending = pendingAddOnId === a.id;
                const fits = fitsBudgetById[a.id] !== false;
                const disabled = !selected && (atCap || !fits);
                const state = pending
                  ? "pending"
                  : selected
                    ? "checked"
                    : disabled
                      ? "disabled"
                      : "idle";
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-disabled={disabled || undefined}
                      aria-busy={pending || undefined}
                      onClick={() => toggleAddOn(a.id)}
                      data-addon-id={a.id}
                      data-state={state}
                      className="addon-chip flex w-full items-start gap-3 rounded-[4px] px-3 py-2.5 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed"
                      style={{
                        background: selected
                          ? "color-mix(in oklab, var(--gold) 12%, var(--ivory))"
                          : "color-mix(in oklab, var(--ivory) 92%, var(--sand))",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: selected
                          ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                          : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                        opacity: disabled ? 0.45 : 1,
                      }}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full transition-transform duration-200"
                        style={{
                          background: selected ? "var(--gold)" : "transparent",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: selected
                            ? "var(--gold)"
                            : "color-mix(in oklab, var(--charcoal) 30%, transparent)",
                          transform: pending ? "scale(0.85)" : "scale(1)",
                        }}
                      >
                        {selected ? <Check size={10} color="var(--ivory)" /> : null}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block text-[12.5px]"
                          style={{
                            color: "var(--charcoal)",
                            fontWeight: selected ? 600 : 500,
                          }}
                        >
                          {a.label}
                        </span>
                        <span
                          className="block text-[11.5px] leading-snug mt-0.5"
                          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
                        >
                          {a.blurb}
                        </span>
                        {!fits ? (
                          <span
                            className="mt-1 inline-block text-[9.5px] uppercase tracking-[0.2em] font-semibold"
                            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                            data-testid="addon-budget-locked"
                          >
                            Won't fit this day ({a.durationMinutes}m)
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="shrink-0 text-[12px] font-semibold tabular-nums"
                        style={{ color: "var(--charcoal)" }}
                      >
                        +€{eur}
                        <span className="ml-1 text-[9.5px] uppercase tracking-[0.18em] font-semibold opacity-60">
                          / pp
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p
              className="mt-2 text-center text-[10.5px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
            >
              Up to {MAX_ADDONS} add-ons
            </p>
            <output
              data-testid="studio-v3-add-ons-total"
              aria-live="polite"
              className="mt-3 block text-center text-[11px] uppercase tracking-[0.22em] font-semibold tabular-nums"
              style={{ color: "var(--charcoal)" }}
            >
              {selectedAddOnIds.length > 0 && totalEur != null ? (
                <>
                  Investment <span style={{ color: "var(--gold)" }}>—</span> €{totalEur}
                  <span className="ml-1 text-[9.5px] tracking-[0.18em] opacity-60">/ pp</span>
                </>
              ) : (
                <span className="sr-only">No add-ons selected</span>
              )}
            </output>
          </fieldset>
        ) : null}

        {/* Itinerary spine — real stop names in order, so the price reads
            against the actual day. Names sourced from the resolved Signature
            route; never invented. */}
        {hasPrice && itineraryStops.length > 0 ? (
          <section
            data-testid="studio-v3-itinerary-spine"
            className="mt-5 mx-auto max-w-[380px] rounded-[4px] px-3 py-2.5 text-left"
            style={{
              background: "color-mix(in oklab, var(--ivory) 92%, var(--sand))",
              border: "1px solid color-mix(in oklab, var(--gold) 28%, transparent)",
            }}
            aria-label="Your day includes these stops"
          >
            <p
              className="text-[9.5px] uppercase tracking-[0.24em] font-bold flex items-center gap-1.5"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span>
              Your day includes
              <span
                className="ml-auto text-[10px] font-semibold tabular-nums tracking-[0.16em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                {dwellHours != null && dwellHours > 0
                  ? `≈ ${dwellHours.toFixed(dwellHours < 10 ? 1 : 0)}h · ${itineraryStops.length} stops`
                  : `${itineraryStops.length} stops`}
              </span>
            </p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {itineraryStops.slice(0, 5).map((label, i) => (
                <li
                  key={`spine-${i}`}
                  className="flex items-start gap-2 text-[12px] leading-snug"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
                >
                  <span
                    aria-hidden
                    className="mt-[1px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
                    style={{
                      background: "color-mix(in oklab, var(--gold) 22%, transparent)",
                      color: "var(--charcoal)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
              {itineraryStops.length > 5 ? (
                <li
                  className="pl-[26px] text-[10.5px] italic"
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                  }}
                >
                  …and {itineraryStops.length - 5} more
                </li>
              ) : null}
            </ol>
          </section>
        ) : null}


        {/* S4 — Inclusions footnote: what's actually in the day. Real data
            from the resolved Signature's `included[]`; never invented. */}
        {hasPrice && inclusionFootnote.length > 0 ? (
          <footer
            data-testid="studio-v3-inclusions-footnote"
            className="mt-5 mx-auto max-w-[380px] rounded-[4px] px-3 py-2.5 text-left"
            style={{
              background: "color-mix(in oklab, var(--ivory) 96%, var(--sand))",
              border: "1px dashed color-mix(in oklab, var(--charcoal) 16%, transparent)",
            }}
          >
            <p
              className="text-[9.5px] uppercase tracking-[0.24em] font-bold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              Included
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {inclusionFootnote.map((line, i) => (
                <li
                  key={`inc-${i}`}
                  className="flex items-start gap-2 text-[11.5px] leading-snug"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
                >
                  <span
                    aria-hidden
                    className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full"
                    style={{ background: "color-mix(in oklab, var(--charcoal) 35%, transparent)" }}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p
              className="mt-2 text-[10px] italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
              }}
            >
              No hidden fees — every detail of the day is included.
            </p>
          </footer>
        ) : null}

        {/* Trust strip — discreet, reduces hesitation right before the CTA. */}
        {hasPrice ? (
          <div
            data-testid="studio-v3-trust-strip"
            className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={11} aria-hidden style={{ color: "var(--gold)" }} />
              Real itinerary
            </span>
            <span aria-hidden style={{ color: "color-mix(in oklab, var(--gold) 50%, transparent)" }}>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={11} aria-hidden style={{ color: "var(--gold)" }} />
              Local designer review
            </span>
            <span aria-hidden style={{ color: "color-mix(in oklab, var(--gold) 50%, transparent)" }}>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={11} aria-hidden style={{ color: "var(--gold)" }} />
              Free cancellation 48h
            </span>
          </div>
        ) : null}

        <div ref={ctaRef} className="mt-4 flex flex-col items-center gap-2.5">
          {hasPrice ? (
            <button
              type="button"
              onClick={onSecure}
              data-testid="studio-v3-cta-primary"
              className="group inline-flex items-center gap-2 px-7 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                background: "var(--charcoal)",
                color: "var(--ivory)",
                boxShadow: "0 14px 36px -18px color-mix(in oklab, var(--charcoal) 60%, transparent)",
              }}
            >
              Yes — make this day mine
              <ArrowRight size={14} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          ) : (
            <a
              href={whatsappHref(
                `Hi YES — I composed a Signature in the Studio${
                  journeyTitle ? ` ("${journeyTitle}")` : ""
                } and would like to confirm the investment.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Request the investment <ArrowRight size={14} aria-hidden />
            </a>
          )}

          {hasPrice ? (
            <p
              className="mt-0.5 inline-flex items-center gap-1.5 text-[10.5px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
            >
              <ShieldCheck size={12} aria-hidden style={{ color: "var(--gold)" }} />
              Secure checkout · Stripe-protected · Cancel free for 48h
            </p>
          ) : null}

          <button
            type="button"
            onClick={onRefine}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 68%, transparent)" }}
          >
            Adjust a few things first
          </button>
        </div>
      </div>

      {/* Mobile sticky CTA — appears only after the inline CTA scrolls out of view. */}
      {hasPrice && stickyVisible ? (
        <div
          data-testid="studio-v3-cta-sticky"
          className="md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] animate-fade-in"
          style={{
            background: "color-mix(in oklab, var(--ivory) 96%, var(--sand))",
            borderTop: "1px solid color-mix(in oklab, var(--gold) 40%, transparent)",
            boxShadow: "0 -10px 30px -18px rgba(46,46,46,0.28)",
          }}
        >
          <button
            type="button"
            onClick={onSecure}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
          >
            Yes — make this day mine <ArrowRight size={14} aria-hidden />
          </button>
          <p
            className="mt-1.5 text-center text-[9.5px] uppercase tracking-[0.22em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            Stripe-protected · Free cancellation 48h
          </p>
        </div>
      ) : null}
    </section>
  );
}

function formatPriceDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return iso;
  }
}
