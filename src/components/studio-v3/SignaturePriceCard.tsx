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
  addOnEurFor,
  addOnEurFromBase,
  selectSignatureAddOns,
  selectSignatureAddOnsWithBudget,
  regionBucket,
  LISBON_SUBREGION_BY_TOUR_ID,
  type AddOnPricingUnit,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import type { SignatureTour } from "@/data/signatureTours";
import { resolvePerPaxEur, resolveJourneyPricing } from "@/data/signatureTourPricing";
import {
  summarizeJourneyLines,
  hasCompleteJourneyPricing,
  type CheckoutJourneyLine,
} from "@/lib/checkout/journeyDisplay";
import { PerPersonBands, bandRowsFromJourney } from "@/components/checkout/PerPersonBands";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { getSignatureOptionalAddOns } from "@/lib/tailor-chapters";
import { MountBadge } from "./useStudioDebug";

import { whatsappHref } from "@/components/WhatsAppFab";
import { CANCELLATION, LICENSE_LABEL } from "@/config/business-nap";
import { recordStudioV3RevealPremium, recordStudioV3RevealAddOns } from "@/lib/studio-v3-telemetry";
import { CTA_ASK_CURATOR, INCLUDED_HEADER_REFINE } from "@/content/signature-day-copy";
import { formatGuestComposition } from "./formatGuests";
import { resolvePriceChangeFactors } from "./priceChangeFactors";
import {
  InvestmentDelta,
  InvestmentFactors,
  InvestmentLedger,
  useInvestmentDelta,
} from "./InvestmentLedger";

/** Fixed USD→EUR conversion. We don't show "live FX" or hide behind decimals
 *  — this is a "from" anchor, rounded to the nearest €5 so it reads premium. */
const USD_TO_EUR = 0.93;
function usdToEurAnchor(usd: number): number {
  const raw = usd * USD_TO_EUR;
  return Math.max(5, Math.round(raw / 5) * 5);
}

export interface SelectedAddOnSummaryItem {
  id: string;
  label: string;
  /**
   * Legacy per-person anchor for this add-on. Retained for backward
   * compatibility with checkout code that still scales add-ons by
   * `guests`. New code should read `amount` / `perUnit` / `unit`.
   */
  priceEur: number;
  durationMinutes: number;
  pricePctOfBase: number;
  /** Unit-aware per-unit price (per_person → per guest, etc.). */
  perUnit: number;
  /** Unit-aware line total for the current party size. */
  amount: number;
  /** How the add-on is billed. */
  unit: AddOnPricingUnit;
  /** Human unit label (e.g. "per guest", "per group"). */
  unitLabel: string;
}

export interface SelectedAddOnSummary {
  ids: string[];
  /**
   * Legacy per-person total (sum of `priceEur`). Checkout code that
   * scales add-ons by guest count still reads this; new code should
   * prefer `partyTotalEur` which is already unit-aware.
   */
  totalEur: number;
  /** Unit-aware party total = sum of `items[].amount`. */
  partyTotalEur: number;
  totalMinutes: number;
  items: SelectedAddOnSummaryItem[];
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
  /** Adult count (18+) for guest-composition transparency in the header label. */
  adults?: number | null;
  /** Minor ages (0–17) for guest-composition transparency in the header label. */
  minorAges?: readonly number[] | null;
  /** Real `included[]` from the resolved Signature — drives the footnote. */
  included?: ReadonlyArray<string>;
  /** Public Studio keeps pricing clean; legacy/tests can still exercise add-ons. */
  showAddOns?: boolean;
  /**
   * Controlled add-on selection. When provided, the parent owns the ids and
   * receives `onAddOnsChange` callbacks with the fresh summary (labels, euro
   * total, minutes) so the checkout drawer and Stripe session stay in sync
   * with what the traveller actually picked. When omitted the card falls
   * back to its own local state (legacy/test callers).
   */
  selectedAddOnIds?: ReadonlyArray<string>;
  onAddOnsChange?: (summary: SelectedAddOnSummary) => void;
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
  /**
   * Visual variant. `"full"` (default) is the full editorial reveal card.
   * `"refine"` is the stripped decision-page rendering: no editorial header,
   * no journey title, no inclusions footer, no day-rhythm bar — just
   * "Enhance your experience" (add-ons) + Total + Continue. Pricing math
   * is identical; only the rendered surface changes.
   */
  variant?: "full" | "refine";
  /**
   * Canonical totals from `useResolvedJourney` (the single source of truth).
   * When provided AND the traveller isn't previewing a different group size
   * via the hidden picker, these are rendered verbatim — the card never
   * derives its own party total in that case. Keeps refine/reveal/checkout
   * from silently drifting apart.
   */
  resolvedPerPaxEur?: number | null;
  resolvedTotalEur?: number | null;
  /**
   * Canonical base (pre-additions) party total and unit-aware additions
   * party total from `useResolvedJourney`. Presentation only — used for
   * the investment ledger so it can never reconstruct a number.
   */
  resolvedBaseTotalEur?: number | null;
  resolvedAddOnsTotalEur?: number | null;
}

export function SignaturePriceCard({
  tour,
  stopCount,
  dateExact,
  onSecure,
  onRefine,
  journeyTitle,
  guests,
  adults = null,
  minorAges = null,
  included,
  showAddOns = true,
  selectedAddOnIds: controlledAddOnIds,
  onAddOnsChange,
  onGuestsChange,
  previewTiers = null,
  remainingMinutes = null,
  itineraryStops = [],
  dwellHours = null,
  variant = "full",
  resolvedPerPaxEur = null,
  resolvedTotalEur = null,
  resolvedBaseTotalEur = null,
  resolvedAddOnsTotalEur = null,
}: SignaturePriceCardProps) {
  const isRefine = variant === "refine";

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
        guests: guests ?? undefined,
      }),
    [tour, stopCount, durationLabel, remainingMinutes, guests],
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
      bucket === "lisbon-arrabida" ? (LISBON_SUBREGION_BY_TOUR_ID[tour.id] ?? null) : null;
    const mismatch =
      bucket === "lisbon-arrabida" && anchorSub
        ? availableAddOns.some((a) => a.lisbonSubRegion && a.lisbonSubRegion !== anchorSub)
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
  const [uncontrolledAddOnIds, setUncontrolledAddOnIds] = useState<string[]>([]);
  const isControlled = controlledAddOnIds !== undefined;
  // Content-hash the controlled id list so equal lists keep a stable array
  // identity — prevents the sync effect below from firing on every render
  // and thrashing parent state with a fresh items array reference.
  const controlledKey = (controlledAddOnIds ?? []).join("|");
  // Optimistic local mirror: even in controlled mode we keep the last
  // committed id list here so chip highlight paints in the same frame as
  // the click, without waiting for the parent's state round-trip.
  const effectiveIds = useMemo<string[]>(
    () => {
      if (!isControlled) return uncontrolledAddOnIds;
      const controlled = [...(controlledAddOnIds ?? [])];
      // Prefer the local mirror when it's already in sync with the parent —
      // otherwise adopt the parent value (source of truth).
      const sameAsMirror =
        controlled.length === uncontrolledAddOnIds.length &&
        controlled.every((id, i) => id === uncontrolledAddOnIds[i]);
      return sameAsMirror ? uncontrolledAddOnIds : controlled;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isControlled, controlledKey, uncontrolledAddOnIds],
  );
  const selectedAddOnIds = effectiveIds;
  const [pendingAddOnId, setPendingAddOnId] = useState<string | null>(null);
  // Shimmer timer — cleared on unmount so no setState fires after teardown.
  const pendingTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
    },
    [],
  );
  const MAX_ADDONS = 3;
  const atCap = selectedAddOnIds.length >= MAX_ADDONS;
  const selectedAddOns = useMemo(
    () => availableAddOns.filter((a) => selectedAddOnIds.includes(a.id)),
    [availableAddOns, selectedAddOnIds],
  );
  const addOnsTotalEur = useMemo(() => {
    if (!hasPrice || !priceEur) return 0;
    return selectedAddOns.reduce((sum, a) => sum + addOnEurFromBase(priceEur, a.pricePctOfBase), 0);
  }, [selectedAddOns, hasPrice, priceEur]);
  const addOnsMinutes = useMemo(
    () => selectedAddOns.reduce((sum, a) => sum + (a.durationMinutes || 0), 0),
    [selectedAddOns],
  );
  // Unit-aware party total for the selected add-ons — sum of line items
  // priced by their own unit (per_person × guests, per_group × 1, etc.).
  // Used by the "Final estimated total" line and by the Reserve CTA when
  // the guest count is known. Never scaled a second time by the caller.
  const addOnsPartyTotalEur = useMemo(() => {
    if (!hasPrice || !priceEur) return 0;
    const partyGuests = Math.max(1, guests ?? 1);
    return selectedAddOns.reduce(
      (sum, a) => sum + addOnEurFor({ addOn: a, baseEur: priceEur, guests: partyGuests }).amount,
      0,
    );
  }, [selectedAddOns, hasPrice, priceEur, guests]);
  const freeMinutes = remainingMinutes != null ? remainingMinutes - addOnsMinutes : null;

  // Notify the parent whenever the effective add-on selection or its resolved
  // euro/minute totals change. Kept as an effect so both controlled and
  // uncontrolled callers get the same summary shape without racing renders.
  const onAddOnsChangeRef = useRef(onAddOnsChange);
  useEffect(() => {
    onAddOnsChangeRef.current = onAddOnsChange;
  }, [onAddOnsChange]);

  const summaryGuests = Math.max(1, guests ?? 1);
  const buildSummary = (ids: string[]): SelectedAddOnSummary => {
    const base = priceEur ?? 0;
    const selected = availableAddOns.filter((a) => ids.includes(a.id));
    const items: SelectedAddOnSummaryItem[] = selected.map((a) => {
      const line = addOnEurFor({
        addOn: a,
        baseEur: base,
        guests: summaryGuests,
      });
      return {
        id: a.id,
        label: a.label,
        priceEur: addOnEurFromBase(base, a.pricePctOfBase),
        durationMinutes: a.durationMinutes || 0,
        pricePctOfBase: a.pricePctOfBase,
        perUnit: line.perUnit,
        amount: line.amount,
        unit: line.unit,
        unitLabel: line.unitLabel,
      };
    });
    return {
      ids,
      totalEur: items.reduce((sum, i) => sum + i.priceEur, 0),
      partyTotalEur: items.reduce((sum, i) => sum + i.amount, 0),
      totalMinutes: items.reduce((sum, i) => sum + i.durationMinutes, 0),
      items,
    };
  };

  // Track the last id list we emitted to the parent so the sync effect
  // doesn't re-emit on unrelated rerenders (guest count changes, price
  // resolution, etc.). Only fires when the id set actually changes.
  const lastEmittedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const cb = onAddOnsChangeRef.current;
    if (!cb) return;
    // Re-emit when the party size or base changes as well as the selected ids:
    // unit-aware item amounts depend on all three inputs.
    const key = `${selectedAddOnIds.join("|")}::${priceEur ?? "x"}::${summaryGuests}`;
    if (lastEmittedKeyRef.current === key) return;
    lastEmittedKeyRef.current = key;
    cb(buildSummary(selectedAddOnIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddOnIds, priceEur, summaryGuests]);

  const commitAddOnIds = (next: string[]) => {
    // Dual-write: always update the local mirror so the chip flips in the
    // same frame, and if the parent owns state, notify it optimistically.
    setUncontrolledAddOnIds(next);
    if (isControlled) {
      const cb = onAddOnsChangeRef.current;
      if (cb) {
        lastEmittedKeyRef.current = `${next.join("|")}::${priceEur ?? "x"}::${summaryGuests}`;
        cb(buildSummary(next));
      }
    }
  };

  const toggleAddOn = (id: string) => {
    const isSelected = selectedAddOnIds.includes(id);
    if (!isSelected && atCap) return; // gated
    // Budget gate: never let the user push the day past the regional rhythm.
    if (!isSelected && fitsBudgetById[id] === false) return;
    const next = isSelected ? selectedAddOnIds.filter((x) => x !== id) : [...selectedAddOnIds, id];
    commitAddOnIds(next);
    // Transient visual flourish — pending shimmer for ≤180ms, reduced-motion safe.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    setPendingAddOnId(id);
    if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null;
      setPendingAddOnId(null);
    }, 180);
  };

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
  const partyCount = effectiveGuests && effectiveGuests >= 2 ? effectiveGuests : null;
  // Unit-aware add-on total for the currently *previewed* party — used
  // in the visible "Final estimated total" so the picker updates it live.
  const displayGuests = Math.max(1, effectiveGuests ?? guests ?? 1);
  const addOnsDisplayPartyEur = useMemo(() => {
    if (!hasPrice || !priceEur) return 0;
    return selectedAddOns.reduce(
      (sum, a) => sum + addOnEurFor({ addOn: a, baseEur: priceEur, guests: displayGuests }).amount,
      0,
    );
  }, [selectedAddOns, hasPrice, priceEur, displayGuests]);
  const totalEur = hasPrice && priceEur ? priceEur + addOnsTotalEur : null;

  // Age-band journey pricing — matches BrandedCheckoutDrawer exactly. Only
  // applied when the traveller isn't previewing a different group size via
  // the hidden picker (previewGuests !== null), because that preview is an
  // adults-only "what-if" and would silently reprice minors otherwise.
  const composedAdults = typeof adults === "number" && adults >= 1 ? adults : null;
  const composedMinors = minorAges ?? [];
  // Guard: every minor age must be a plausible integer (0-17). If ANY age is
  // missing or invalid the journey pricing inputs are incomplete — refuse to
  // itemise or compute a total from it so the card can never show a mismatch
  // vs. what the checkout drawer would charge.
  const minorAgesComplete = useMemo(
    () =>
      composedMinors.every(
        (age) =>
          typeof age === "number" &&
          Number.isFinite(age) &&
          Number.isInteger(age) &&
          age >= 0 &&
          age <= 17,
      ),
    [composedMinors],
  );
  const journey = useMemo(() => {
    if (previewGuests !== null) return null;
    if (composedAdults == null) return null;
    if (!minorAgesComplete) return null;
    return resolveJourneyPricing(tour, composedAdults, composedMinors, effectiveOverrides);
  }, [previewGuests, composedAdults, composedMinors, minorAgesComplete, tour, effectiveOverrides]);
  const journeyLines: readonly CheckoutJourneyLine[] | null = journey
    ? (journey.lines as unknown as readonly CheckoutJourneyLine[])
    : null;
  // Only itemise when the party actually mixes bands AND every line is fully
  // populated — adults-only bookings are already fully described by the
  // "€X / guest × N" line above, and an incomplete line would render "€NaN".
  const journeyRows = useMemo(
    () =>
      journeyLines && composedMinors.length > 0 && hasCompleteJourneyPricing(journeyLines)
        ? summarizeJourneyLines(journeyLines)
        : [],
    [journeyLines, composedMinors.length],
  );

  const partyBaseEur = journey
    ? journey.totalEur
    : displayPerPaxEur != null && partyCount != null
      ? displayPerPaxEur * partyCount
      : null;
  const localPartyTotalEur = partyBaseEur != null ? partyBaseEur + addOnsDisplayPartyEur : null;

  // Prefer the resolved (canonical) totals when the traveller isn't previewing
  // a different group size via the hidden picker. Otherwise fall back to the
  // locally computed preview so the picker keeps showing "at N guests" hints.
  const usingResolved = previewGuests === null && resolvedTotalEur != null;
  const partyTotalEur = usingResolved ? resolvedTotalEur : localPartyTotalEur;
  // Canonical branch: the ONLY per-person figure we may show is the canonical
  // adult unit price. Never divide the canonical party total by guests — that
  // total can include discounted minors and party-level additions, so the
  // quotient matches nothing the traveller actually pays. Absent unit → omit.
  const perPersonDerived = usingResolved
    ? (resolvedPerPaxEur ?? null)
    : partyTotalEur != null && effectiveGuests != null && effectiveGuests > 0
      ? Math.round(partyTotalEur / effectiveGuests)
      : (displayPerPaxEur ?? null);


  // ---- P3B live investment presentation values (no new pricing math) ----
  // Delta is derived from the SAME number the card displays, so it can only
  // ever describe a real change the traveller just caused.
  const displayedTotalEur = partyTotalEur ?? totalEur ?? null;
  const investmentDelta = useInvestmentDelta(displayedTotalEur);
  // Ledger inputs: canonical values when we're showing canonical totals,
  // otherwise the local preview values already computed above. Never
  // reconstructed or inferred.
  const ledgerBaseEur = usingResolved ? resolvedBaseTotalEur : partyBaseEur;
  const ledgerAdditionsEur = usingResolved ? resolvedAddOnsTotalEur : addOnsDisplayPartyEur;
  const priceFactors = useMemo(
    () =>
      resolvePriceChangeFactors({
        tour,
        selectedAddOns: selectedAddOns.map((a) => ({
          label: a.label,
          unit: addOnEurFor({ addOn: a, baseEur: priceEur ?? 0, guests: summaryGuests }).unit,
        })),
      }),
    [tour, selectedAddOns, priceEur, summaryGuests],
  );

  // Dev-only invariant: perPerson × guests must equal total (±rounding).
  if (import.meta.env.DEV && partyTotalEur != null && effectiveGuests && effectiveGuests > 0) {
    const drift = Math.abs((perPersonDerived ?? 0) * effectiveGuests - partyTotalEur);
    if (drift > effectiveGuests) {
      console.error("[studio-v3] price mismatch", {
        partyTotalEur,
        perPersonDerived,
        effectiveGuests,
        drift,
      });
    }
  }

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

  // Batch C — price anchor. Surface the real cheapest tier so a solo/duo
  // traveller can see "drops to €X/pp with N guests" before tapping the
  // group picker. Sourced from real tier data only; silent when absent.
  const cheapestRealTier = useMemo(() => {
    const reals = tierRows.filter((r) => r.real);
    if (reals.length === 0) return null;
    const min = reals.reduce((acc, r) => (r.eur < acc.eur ? r : acc), reals[0]);
    if (!displayPerPaxEur) return null;
    if (min.eur >= displayPerPaxEur) return null;
    return min;
  }, [tierRows, displayPerPaxEur]);

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
      <MountBadge
        name="SignaturePriceCard"
        detail={`tour=${tour?.id ?? "—"} · price=${priceEur ?? "—"}€ · src=${priceSource}`}
        tone={hasPrice ? "ok" : "warn"}
      />
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
        className="relative overflow-hidden px-1 py-7 text-center sm:px-2"
        style={{
          background: "color-mix(in oklab, var(--ivory) 96%, var(--sand))",
          borderTop: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
          borderBottom: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-[2px] w-12 -translate-x-1/2 rounded-b-full"
          style={{ background: "var(--gold)" }}
        />
        {isRefine ? null : (
          <>
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
          </>
        )}

        {hasPrice ? (
          <>
            <p
              className={`${isRefine ? "mt-2" : "mt-3"} text-[11px] uppercase tracking-[0.22em] font-semibold`}
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
              data-testid="studio-v3-price-card-guests"
            >
              {formatGuestComposition(adults, minorAges, partyCount) ??
                (partyCount != null
                  ? `For ${partyCount} ${partyCount === 1 ? "guest" : "guests"}`
                  : "Per guest")}
            </p>
            {(() => {
              const bands = bandRowsFromJourney(journeyLines);
              const adultUnit =
                bands.length > 0
                  ? (bands.find((b) => b.band === "adult")?.unitEur ?? priceEur)
                  : (perPersonDerived ?? priceEur);
              const showParty = partyTotalEur != null && partyCount != null;
              return (
                <>
                  {showParty ? (
                    <p
                      data-testid="studio-v3-party-total"
                      className="mt-1 text-[44px] sm:text-[52px] leading-none font-bold tabular-nums"
                      style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
                    >
                      €{partyTotalEur}
                      <span
                        className="mt-2 block text-[10.5px] uppercase tracking-[0.22em] font-semibold"
                        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                      >
                        Your investment
                      </span>
                    </p>
                  ) : null}
                  <p
                    data-testid="studio-v3-base-price"
                    data-eur={priceEur ?? ""}
                    data-per-pax-eur={perPersonDerived ?? ""}
                    data-per-pax-real={realPerPax?.real ? "true" : "false"}
                    className={
                      showParty
                        ? "mt-2.5 text-[16px] sm:text-[18px] leading-tight font-semibold tabular-nums"
                        : "mt-1 text-[44px] sm:text-[52px] leading-none font-bold tabular-nums"
                    }
                    style={{
                      fontFamily: showParty ? undefined : "var(--font-display)",
                      color: showParty
                        ? "color-mix(in oklab, var(--charcoal) 72%, transparent)"
                        : "var(--charcoal)",
                    }}
                  >
                    €{adultUnit}
                    <span
                      className={`ml-1.5 align-middle font-semibold uppercase tracking-[0.18em] ${
                        showParty ? "text-[11px]" : "text-[13px]"
                      }`}
                      style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
                    >
                      / adult
                    </span>
                  </p>
                  {bands.filter((b) => b.band !== "adult").length > 0 ? (
                    <p
                      className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.2em] tabular-nums"
                      style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                    >
                      {bands
                        .filter((b) => b.band !== "adult")
                        .map((b) => `€${b.unitEur} / ${b.label}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </>
              );
            })()}
            {journeyRows.length > 0 ? (
              <ul
                data-testid="studio-v3-journey-lines"
                className="mt-3 mx-auto max-w-[280px] space-y-1"
              >
                {journeyRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-baseline justify-between gap-3 text-[12px] tabular-nums"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
                  >
                    <span className="truncate">
                      {row.label}
                      {row.qty > 1 ? (
                        <span
                          className="ml-1"
                          style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
                        >
                          (€{Math.round(row.unitEur).toLocaleString("en-GB")} × {row.qty})
                        </span>
                      ) : null}
                    </span>
                    <span>€{Math.round(row.subtotalEur).toLocaleString("en-GB")}</span>
                  </li>
                ))}
              </ul>
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

        {/* "Why this works" bullets removed — the itinerary spine below
            ("Your day includes") already surfaces the real inclusions, so
            repeating them here added clutter and duplicated the same facts
            in two adjacent blocks. */}

        {/* "Often added" suggestion card removed — at 393px the pill button
            + dismiss link squeezed the label column so hard that titles
            wrapped one word per line, overlapping the add-on chip below.
            The same item is already in the chip list, so the suggestion
            was pure duplication. Selection state on the chip is enough. */}

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
              {isRefine ? (
                "Enhance your experience"
              ) : (
                <>
                  <span style={{ color: "var(--gold)" }}>—</span> Make the day yours
                </>
              )}
            </legend>
            {!isRefine && remainingMinutes != null && remainingMinutes > 0
              ? (() => {
                  const totalBudget = remainingMinutes; // free minutes on the base day
                  const usedPct = Math.min(100, Math.round((addOnsMinutes / totalBudget) * 100));
                  const over = freeMinutes != null && freeMinutes < 0;
                  const overBy = over ? Math.abs(freeMinutes ?? 0) : 0;
                  const barColor = over
                    ? "color-mix(in oklab, #b8541a 75%, transparent)"
                    : "color-mix(in oklab, var(--gold) 80%, transparent)";
                  return (
                    <div
                      data-testid="studio-v3-time-budget"
                      data-addons-minutes={addOnsMinutes}
                      data-free-minutes={freeMinutes ?? ""}
                      className="mb-3 rounded-[4px] px-3 py-2"
                      style={{
                        background: "color-mix(in oklab, var(--ivory) 92%, var(--sand))",
                        border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
                      }}
                    >
                      <div
                        className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-semibold"
                        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
                      >
                        <span>
                          <span style={{ color: "var(--gold)" }}>—</span> Day rhythm
                        </span>
                        <span
                          className="tabular-nums"
                          style={{ color: over ? "#b8541a" : "var(--charcoal)" }}
                        >
                          {addOnsMinutes > 0 ? `+${addOnsMinutes} min` : `${totalBudget} min free`}
                          {over
                            ? ` · over by ${overBy} min`
                            : addOnsMinutes > 0 && freeMinutes != null
                              ? ` · ${freeMinutes} min still free`
                              : ""}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 relative h-1.5 w-full overflow-hidden rounded-full"
                        style={{
                          background: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 transition-[width] duration-[280ms] ease-out"
                          style={{ width: `${usedPct}%`, background: barColor }}
                        />
                      </div>
                      <p
                        className="mt-1.5 text-[10.5px] leading-[1.4]"
                        style={{
                          fontFamily: "var(--font-sans)",
                          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                        }}
                      >
                        Counts stops + driving between them.
                      </p>
                    </div>
                  );
                })()
              : null}
            <ul className="flex flex-col gap-0">
              {availableAddOns.map((a) => {
                const line = addOnEurFor({
                  addOn: a,
                  baseEur: priceEur ?? 0,
                  guests: summaryGuests,
                });
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
                      className="addon-chip flex w-full items-start gap-3 px-1 py-3 min-h-[56px] text-left transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed"
                      style={{
                        background: selected
                          ? "color-mix(in oklab, var(--teal) 4%, transparent)"
                          : "transparent",
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                        borderBottomStyle: "solid",
                        borderBottomWidth: selected ? 2 : 1,
                        borderBottomColor: selected
                          ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                          : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                        boxShadow: "none",
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
                          className="block text-[13.5px]"
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
                            style={{
                              color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                            }}
                            data-testid="addon-budget-locked"
                          >
                            Won't fit this day ({a.durationMinutes}m)
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="shrink-0 flex flex-col items-end text-[13px] font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: "var(--charcoal)", maxWidth: 92 }}
                      >
                        <span className="whitespace-nowrap">
                          +€{line.perUnit}
                          <span className="ml-1 text-[9.5px] font-semibold opacity-60 lowercase tracking-normal">
                            {line.unitLabel.replace(/^per\s+/i, "/ ")}
                          </span>
                        </span>
                        {a.durationMinutes > 0 ? (
                          <span
                            className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] font-semibold whitespace-nowrap"
                            style={{
                              color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                            }}
                          >
                            +{a.durationMinutes} min
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {isRefine ? null : (
              <p
                className="mt-2 text-center text-[10.5px] uppercase tracking-[0.22em] font-semibold"
                style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
              >
                Up to {MAX_ADDONS} add-ons
              </p>
            )}
            <output
              data-testid="studio-v3-add-ons-total"
              aria-live="polite"
              className="mt-3 block text-center text-[11px] uppercase tracking-[0.22em] font-semibold tabular-nums"
              style={{ color: "var(--charcoal)" }}
            >
              {selectedAddOnIds.length > 0 && totalEur != null ? (
                <>
                  {isRefine ? "Per adult, with additions" : "Additions"}{" "}
                  <span style={{ color: "var(--gold)" }}>—</span> €{totalEur}
                  <span className="ml-1 text-[9.5px] tracking-[0.18em] opacity-60">total</span>
                </>
              ) : (
                <span className="sr-only">No add-ons selected</span>
              )}
            </output>
          </fieldset>
        ) : null}

        {/* Refine-only: itemised add-ons breakdown. The full variant
            renders the same rows inside the "Included in your day"
            footer below, so this block is refine-only to avoid
            duplication. */}
        {isRefine && hasPrice && selectedAddOns.length > 0 ? (
          <div
            className="mt-4 mx-auto max-w-[380px] text-left"
            data-testid="studio-v3-add-on-lines-refine"
          >
            <p
              className="text-[9.5px] uppercase tracking-[0.24em] font-bold flex items-center gap-1.5"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span>
              Your additions
            </p>
            <ul className="mt-1.5 flex flex-col gap-1" data-testid="studio-v3-add-on-lines">
              {selectedAddOns.map((a) => {
                const line = addOnEurFor({
                  addOn: a,
                  baseEur: priceEur ?? 0,
                  guests: summaryGuests,
                });
                const isPerPerson = line.unit === "per_person";
                const showQty = isPerPerson && summaryGuests > 1;
                return (
                  <li
                    key={`refine-addon-${a.id}`}
                    data-testid="studio-v3-add-on-line"
                    data-addon-id={a.id}
                    data-per-unit-eur={line.perUnit}
                    data-amount-eur={line.amount}
                    data-unit={line.unit}
                    className="flex items-start justify-between gap-3 text-[11.5px] leading-snug"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
                  >
                    <span className="flex items-start gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full"
                        style={{ background: "var(--gold)" }}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{a.label}</span>
                        <span
                          className="ml-1 tabular-nums"
                          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                        >
                          {showQty
                            ? `(€${line.perUnit} × ${summaryGuests})`
                            : `(${line.unitLabel})`}
                        </span>
                      </span>
                    </span>
                    <span
                      className="shrink-0 tabular-nums text-[11px] font-semibold"
                      style={{ color: "var(--charcoal)" }}
                    >
                      €{line.amount.toLocaleString("en-GB")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* Always keep the resolved investment visible on Refine, even when
            this Signature has no compatible add-ons. This block deliberately
            sits outside the add-on fieldset so an empty pool cannot hide the
            price the traveller is about to confirm. */}
        {(() => {
          const totalForDisplay = partyTotalEur ?? totalEur ?? null;
          if (totalForDisplay == null) return null;
          const showAlways = isRefine;
          const showConditional =
            selectedAddOnIds.length > 0 && partyTotalEur != null && partyCount != null;
          if (!showAlways && !showConditional) return null;
          return (
            <div
              data-testid="studio-v3-final-total"
              data-final-eur={totalForDisplay}
              className="mt-5 mx-auto max-w-[380px] px-1 pt-4 text-center"
              style={{
                background: "transparent",
                borderTop: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
              }}
            >
              <p
                className="text-[11px] uppercase tracking-[0.24em] font-bold"
                style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
              >
                Your day, resolved
              </p>
              <p
                className="mt-1 text-[24px] font-bold tabular-nums leading-none"
                style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
              >
                €{totalForDisplay}
              </p>
              <div
                className="mt-1.5 text-[11px] font-semibold tabular-nums leading-[1.7]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 68%, transparent)" }}
              >
                <PerPersonBands
                  journeyLines={journeyLines}
                  adultUnitEur={
                    bandRowsFromJourney(journeyLines).find((b) => b.band === "adult")?.unitEur ??
                    perPersonDerived ??
                    priceEur ??
                    null
                  }
                  testId="studio-v3-price-card-final-per-person"
                />
              </div>
              <InvestmentDelta delta={investmentDelta} />
              <InvestmentLedger
                baseTotalEur={ledgerBaseEur}
                additionsTotalEur={ledgerAdditionsEur}
                totalEur={totalForDisplay}
              />
              <InvestmentFactors factors={priceFactors} />
            </div>
          );
        })()}

        {/* Itinerary spine and blueprint optionals removed — the storytelling
            reveal on the next step lists the traveller's kept stops in order,
            so repeating them here duplicated the same content in two adjacent
            surfaces. */}

        {/* Included in your day — the single, tight list. Real included[]
            from the resolved Signature (capped) + any add-ons the traveller
            just toggled on, so the block moves with the price above. */}
        {!isRefine && hasPrice && (inclusionFootnote.length > 0 || selectedAddOns.length > 0) ? (
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
              {INCLUDED_HEADER_REFINE}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {inclusionFootnote.slice(0, 4).map((line, i) => (
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
            {selectedAddOns.length > 0 ? (
              <>
                <p
                  className="mt-3 text-[9.5px] uppercase tracking-[0.24em] font-bold flex items-center gap-1.5"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                >
                  <span style={{ color: "var(--gold)" }}>—</span>
                  Your additions
                </p>
                <ul className="mt-1.5 flex flex-col gap-1" data-testid="studio-v3-add-on-lines">
                  {selectedAddOns.map((a) => {
                    const line = addOnEurFor({
                      addOn: a,
                      baseEur: priceEur ?? 0,
                      guests: summaryGuests,
                    });
                    const isPerPerson = line.unit === "per_person";
                    const showQty = isPerPerson && summaryGuests > 1;
                    return (
                      <li
                        key={`inc-addon-${a.id}`}
                        data-testid="studio-v3-add-on-line"
                        data-addon-id={a.id}
                        data-per-unit-eur={line.perUnit}
                        data-amount-eur={line.amount}
                        data-unit={line.unit}
                        className="flex items-start justify-between gap-3 text-[11.5px] leading-snug"
                        style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
                      >
                        <span className="flex items-start gap-2 min-w-0">
                          <span
                            aria-hidden
                            className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full"
                            style={{ background: "var(--gold)" }}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{a.label}</span>
                            <span
                              className="ml-1 tabular-nums"
                              style={{
                                color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                              }}
                            >
                              {showQty
                                ? `(€${line.perUnit} × ${summaryGuests})`
                                : `(${line.unitLabel})`}
                            </span>
                          </span>
                        </span>
                        <span
                          className="shrink-0 tabular-nums text-[11px] font-semibold"
                          style={{ color: "var(--charcoal)" }}
                        >
                          €{line.amount.toLocaleString("en-GB")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </footer>
        ) : null}

        {/* Compact trust facts at the decision point — existing signals only. */}
        {!isRefine && hasPrice ? (
          <ul
            data-testid="studio-v3-decision-trust"
            aria-label="Booking reassurance"
            className="mt-5 mx-auto flex max-w-[380px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px] uppercase tracking-[0.08em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
          >
            <li>Private experience</li>
            <li aria-hidden style={{ color: "var(--gold)" }}>
              ·
            </li>
            <li>Secure payment · Stripe</li>
            <li aria-hidden style={{ color: "var(--gold)" }}>
              ·
            </li>
            <li className="normal-case tracking-[0.01em]">{CANCELLATION.signature.en}</li>
            <li aria-hidden style={{ color: "var(--gold)" }}>
              ·
            </li>
            <li className="normal-case tracking-[0.01em]">Licensed operator {LICENSE_LABEL}</li>
          </ul>
        ) : null}

        <div
          ref={ctaRef}
          className={`${isRefine ? "hidden" : "mt-6 flex flex-col items-center gap-3"}`}
        >
          {hasPrice ? (
            <>
              <button
                type="button"
                onClick={onSecure}
                data-testid="studio-v3-cta-primary"
                data-total-eur={partyTotalEur ?? totalEur ?? ""}
                data-party-total-eur={partyTotalEur ?? ""}
                className="group inline-flex items-center gap-2 px-7 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  background: "var(--charcoal)",
                  color: "var(--ivory)",
                  boxShadow:
                    "0 14px 36px -18px color-mix(in oklab, var(--charcoal) 60%, transparent)",
                }}
              >
                {"See my signature story"}
                <ArrowRight
                  size={14}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
              <a
                href={whatsappHref(
                  `Hi YES — I'm refining a Signature in the Studio${
                    journeyTitle ? ` ("${journeyTitle}")` : ""
                  } and could use a curator's help before I continue.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="studio-v3-cta-secondary"
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
                  background: "transparent",
                  borderBottom: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
                }}
              >
                {CTA_ASK_CURATOR}
              </a>
            </>
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

          {hasPrice && !dateExact ? (
            <p
              className="text-[10.5px] italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
              }}
            >
              You'll pick your date in the next step.
            </p>
          ) : null}
        </div>
      </div>

      {/* Mobile sticky CTA — appears only after the inline CTA scrolls out of view. */}
      {!isRefine && hasPrice && stickyVisible ? (
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
            data-total-eur={partyTotalEur ?? totalEur ?? ""}
            data-party-total-eur={partyTotalEur ?? ""}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
          >
            See my signature story <ArrowRight size={14} aria-hidden />
          </button>
          <p
            className="mt-1.5 text-center text-[9.5px] uppercase tracking-[0.22em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            Nothing is booked yet · Confirm on the next step
          </p>
        </div>
      ) : null}

      {/* Batch C — exit-intent rescue. Offers to save the composition via
          WhatsApp when the traveller is about to leave the reveal. Real save:
          the composed journey title goes into the message body, the YES team
          replies with the confirmed investment. No fabricated urgency. */}
      {!isRefine && hasPrice ? <ExitIntentSave journeyTitle={journeyTitle ?? null} /> : null}
    </section>
  );
}

function ExitIntentSave({ journeyTitle }: { journeyTitle: string | null }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("sv3-exit-intent-dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    let armed = false;
    const armT = window.setTimeout(() => {
      armed = true;
    }, 8000); // arm after ~8s on the reveal so it doesn't trigger on entry
    const trigger = () => {
      if (!armed || dismissed) return;
      setOpen(true);
    };
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") trigger();
    };
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(armT);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dismissed]);

  const dismiss = () => {
    setOpen(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("sv3-exit-intent-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  if (!open || dismissed) {
    return (
      <MountBadge
        name="ExitIntent"
        detail={dismissed ? "dismissed" : "armed (waiting for trigger)"}
      />
    );
  }

  const message = journeyTitle
    ? `Hi YES — save my Signature in progress ("${journeyTitle}"). I'd like to confirm the investment with a curator before I commit.`
    : `Hi YES — save my Signature in progress. I'd like to confirm the investment with a curator before I commit.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sv3-exit-title"
      data-testid="studio-v3-exit-intent"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4"
      style={{ background: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-[6px] px-5 py-5 text-center animate-scale-in"
        style={{
          background: "color-mix(in oklab, var(--ivory) 96%, var(--sand))",
          border: "1px solid color-mix(in oklab, var(--gold) 50%, transparent)",
          boxShadow: "0 28px 60px -28px rgba(46,46,46,0.45)",
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
          <span style={{ color: "var(--gold)" }}>—</span> Before you go
        </p>
        <p
          id="sv3-exit-title"
          className="mt-2 text-[19px] leading-[1.25] italic text-balance"
          style={{ fontFamily: "var(--font-serif)", color: "var(--charcoal)" }}
        >
          Save your Signature, decide later.
        </p>
        <p
          className="mt-2 text-[12.5px] leading-snug"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          A YES curator will hold the composition you just built and reply with the exact investment
          for your dates — no payment, no pressure.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <a
            href={whatsappHref(message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
          >
            Save on WhatsApp <ArrowRight size={14} aria-hidden />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded px-2 py-1"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            Keep exploring
          </button>
        </div>
      </div>
    </div>
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
