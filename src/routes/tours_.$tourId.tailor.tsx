import { trackEvent } from "@/lib/analytics-events";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  Sparkles,
  MessageCircle,
  Lock,
  Info,
  Loader2,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { findTour, type SignatureTour, type TourStop } from "@/data/signatureTours";
import { getViatorMeta } from "@/data/signatureToursViator";
import { lookupStop } from "@/data/stopGeo";
import { bookableIncluded, validateTour, logTourValidation } from "@/lib/viatorValidation";
import { useEffect } from "react";
import { whatsappHref } from "@/components/WhatsAppFab";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PriceEur } from "@/components/ui/PriceEur";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStripeEnvironment } from "@/lib/stripe";
import { FinalDetailsDialog, type GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import {
  ChargeSummaryLine,
  type ChargeQuote,
} from "@/components/checkout/ChargeSummaryLine";
import {
  BrandedCheckoutDrawer,
  type CheckoutSummary,
} from "@/components/checkout/BrandedCheckoutDrawer";
import { getTailorBlueprint, type BlueprintStop } from "@/data/tailorBlueprints";
import { DWELL_MINIMUM_MIN, evaluateDay, type FeasibilityStop } from "@/lib/feasibility";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { resolvePerPaxEur, resolveJourneyPricing } from "@/data/signatureTourPricing";
import { tailorAdjustedPerPax, tailorFinalPerPax } from "@/config/pricing";
import {
  canSelectWineries,
  dedicatedLunchStopId,
  lunchRemovalEur,
  principalEligibleStopIds,
  principalRemovalCount,
  tailorRules,
  tailorSupplementsEur,
} from "@/data/tailorRules";


import { TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR, TAILOR_LUNCH_SUPPLEMENT_EUR } from "@/config/pricing";

import { jsonLdScript, breadcrumbLd, tourTailorProductLd } from "@/lib/jsonld";
import { CANCELLATION } from "@/config/business-nap";
import { resolveClientIncludedItems } from "@/lib/checkout/inclusions";
import { PriceBreakdownRows } from "@/components/checkout/PriceBreakdownRows";
import { hasCompleteJourneyPricing } from "@/lib/checkout/journeyDisplay";
import { CompositionField } from "@/components/booking/CompositionField";
import {
  formatCompositionSummary,
  isCompositionComplete,
  totalGuests,
  type TravellerComposition,
} from "@/lib/checkout/composition";
import {
  gaAddPaymentInfo,
  gaAddToCartSignature,
  gaBeginCheckout,
  gaGenerateLead,
  buildTourItem,
  gaReserveCtaClick,
  gaBookingDateSelected,
  gaBookingCompositionSet,
  gaBookingValidationBlocked,
  gaCheckoutDrawerOpened,
} from "@/lib/analytics-ga4";
import { signatureDurationLabel } from "@/lib/tourContent";
import {
  getOperatingRule,
  computeMinDateISO,
  validateDateISO,
  type OperatingRule,
} from "@/lib/availability";

/* ════════════════════════════════════════════════════════════════
 * /tours/$tourId/tailor — Tailor a Signature
 *
 * A calmer, focused flow that lets a guest adjust *only* the details
 * available inside one specific Signature. The core route, story and
 * local guide stay locked. Live summary updates as the user adjusts.
 * ════════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/tours_/$tourId/tailor")({
  loader: ({ params }) => {
    const tour = findTour(params.tourId);
    if (!tour) throw notFound();
    return { tour };
  },
  head: ({ params, loaderData }) => {
    const url = `https://yesexperiencesportugal.com/tours/${params.tourId}/tailor`;
    const t = loaderData?.tour;
    if (!t)
      return {
        meta: [
          { title: "Tailor a Signature — YES experiences Portugal" },
          // Same directive as the resolved branch: out of the SERPs, but
          // crawlable and link-following.
          { name: "robots", content: "noindex, follow" },
        ],
        links: [{ rel: "canonical", href: url }],
      };

    const img = t.img?.startsWith("http") ? t.img : `https://yesexperiencesportugal.com${t.img}`;
    const shortTitle = t.title.split("—")[0].trim();
    const pageTitle =
      `Tailor "${shortTitle}" — YES Portugal`.length <= 60
        ? `Tailor "${shortTitle}" — YES Portugal`
        : `Tailor "${shortTitle.slice(0, 33)}…" — YES Portugal`;
    return {
      meta: [
        { title: pageTitle },
        {
          name: "description",
          content: `Adjust selected details inside the ${t.title} Signature — pace, timing, group needs and small additions, without redesigning the day.`,
        },
        { property: "og:title", content: `Tailor this Signature — ${t.title}` },
        {
          property: "og:description",
          content: "Keep the heart of this journey, adjust selected details to match your rhythm.",
        },
        { property: "og:image", content: img },
        { property: "twitter:image", content: img },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        // Tailor is a customization surface, not an entry point — keep it out
        // of the SERPs while still letting crawlers follow internal links.
        { name: "robots", content: "noindex, follow" },
      ],
      // Self-referencing canonical: the Tailor URL is the only URL serving this
      // content. Duplicate-content risk is already handled by `noindex`, and a
      // cross-canonical to the Signature page conflicts with it (Google ignores
      // one of the two signals). Signature pages keep their own self-canonical.
      links: [
        { rel: "canonical", href: url },

        // LCP preload — the tour mini-card hero <img> below the fold-in intro.
        { rel: "preload", as: "image", href: t.img, fetchPriority: "high" },
      ],
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Signature Experiences", path: "/experiences" },
            { name: t.title, path: `/tours/${params.tourId}` },
            { name: "Tailor", path: `/tours/${params.tourId}/tailor` },
          ]),
        ),
        jsonLdScript(
          tourTailorProductLd({
            id: params.tourId,
            title: t.title,
            blurb: t.blurb,
            img: t.img,
            priceFrom: (t as { priceFrom?: number }).priceFrom,
            currency: "EUR",
            region: (t as { region?: string }).region ?? null,
            durationHours: signatureDurationLabel(
              t.id,
              (t as { durationHours?: string }).durationHours ?? null,
            ),
          }),
        ),
      ],
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-4xl" data-mixed-emphasis="exempt">
            Signature not found
          </h1>
          <p className="mt-4 text-[color:var(--charcoal-soft)]">
            That Signature Experience doesn't exist anymore.
          </p>
          <Link
            to="/experiences"
            className="mt-8 inline-flex items-center gap-2 border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-3 text-sm"
          >
            <ArrowLeft size={14} /> Back to all experiences
          </Link>
        </div>
      </section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-3xl" data-mixed-emphasis="exempt">
            Something went sideways
          </h1>
          <p className="mt-3 text-[color:var(--charcoal-soft)] text-sm">{error.message}</p>
        </div>
      </section>
    </SiteLayout>
  ),
  component: TailorPage,
});

/* ────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────── */
function TailorPage() {
  useMarketingMotion();
  const { tour } = Route.useLoaderData();
  const meta = getViatorMeta(tour.id);
  const validation = useMemo(() => validateTour(tour, meta), [tour, meta]);
  const inc = useMemo(() => bookableIncluded(tour, meta), [tour, meta]);
  useEffect(() => {
    logTourValidation(validation);
  }, [validation]);

  // ─── State (only adjustable details) ────────────────────────
  const [date, setDate] = useState("");
  const [rule, setRule] = useState<OperatingRule | null>(null);
  useEffect(() => {
    let active = true;
    getOperatingRule(tour.id).then((r) => {
      if (active) setRule(r);
    });
    return () => {
      active = false;
    };
  }, [tour.id]);
  const minDateISO = computeMinDateISO(rule?.minLeadHours ?? 24);

  /**
   * Operational defaults. Pickup time, guide language and every other
   * operational preference are collected in the shared FinalDetailsDialog
   * after reserve intent — they are not decisions for the editor surface.
   */
  const [pickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [pace, setPace] = useState<"relaxed" | "balanced" | "full">("balanced");
  const [composition, setComposition] = useState<TravellerComposition>({
    adults: 2,
    minorAges: [],
  });
  const guests = totalGuests(composition);
  const compositionReady = isCompositionComplete(composition);
  const [language] = useState<"en" | "pt">("en");


  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  // ─── Tailor Blueprint (truthful core / choice / optional) ────
  // When a blueprint exists for this tour, it REPLACES the legacy
  // "Stop variations" panel below — the legacy panel reads from
  // tour.stops which is the full Viator list and overstates what the
  // anchor price actually includes.
  const blueprint = useMemo(() => getTailorBlueprint(tour.id), [tour.id]);
  const [choiceSelected, setChoiceSelected] = useState<Set<string>>(() => {
    // Pre-select the minimum required (`pickMin`) by default.
    const bp = getTailorBlueprint(tour.id);
    if (!bp?.choice) return new Set();
    return new Set(bp.choice.options.slice(0, bp.choice.pickMin).map((o) => o.id));
  });
  const [optionalSelected, setOptionalSelected] = useState<Set<string>>(new Set());
  // Skippable core stops — market, viewpoints, generic lunches — can be
  // traded for time elsewhere. True anchors (workshops, wineries) have
  // `skippable: false` in the blueprint and never appear here.
  const [skippedCore, setSkippedCore] = useState<Set<string>>(new Set());

  const blueprintFeasibility = useMemo(() => {
    if (!blueprint) return null;
    const toFs = (s: BlueprintStop): FeasibilityStop => ({
      id: s.id,
      label: s.label,
      category: s.category,
      dwellMinutesOverride: s.dwellMinutesOverride,
    });
    const stops: FeasibilityStop[] = [
      ...blueprint.core.filter((s) => !skippedCore.has(s.id)).map(toFs),
      ...(blueprint.choice
        ? blueprint.choice.options.filter((o) => choiceSelected.has(o.id)).map(toFs)
        : []),
      ...blueprint.optional.filter((o) => optionalSelected.has(o.id)).map(toFs),
    ];
    return evaluateDay({ stops });
  }, [blueprint, choiceSelected, optionalSelected, skippedCore]);

  /**
   * Guarded plan mutation — pre-evaluates the projected day against the
   * shared feasibility rules (dwell + drive caps, boat/wine/monument
   * limits). Additions that would push the plan into `feasible: false`
   * are refused with a toast and the state is left unchanged. Removals
   * (un-checking a stop, skipping a core stop) always go through — they
   * can only relax the day.
   */
  const projectFeasibility = (
    nextSkippedCore: Set<string>,
    nextChoice: Set<string>,
    nextOptional: Set<string>,
  ) => {
    if (!blueprint) return null;
    const toFs = (s: BlueprintStop): FeasibilityStop => ({
      id: s.id,
      label: s.label,
      category: s.category,
      dwellMinutesOverride: s.dwellMinutesOverride,
    });
    const stops: FeasibilityStop[] = [
      ...blueprint.core.filter((s) => !nextSkippedCore.has(s.id)).map(toFs),
      ...(blueprint.choice
        ? blueprint.choice.options.filter((o) => nextChoice.has(o.id)).map(toFs)
        : []),
      ...blueprint.optional.filter((o) => nextOptional.has(o.id)).map(toFs),
    ];
    return evaluateDay({ stops });
  };

  const tryToggleSkippedCore = (id: string) => {
    const next = new Set(skippedCore);
    const isSkipping = !next.has(id);
    if (isSkipping) next.add(id);
    else {
      // Un-skipping = adding a stop back → guard against overload.
      next.delete(id);
      const proj = projectFeasibility(next, choiceSelected, optionalSelected);
      if (proj && !proj.feasible) {
        toast.error(proj.warnings[0] ?? "That would push the day past its limit.");
        return;
      }
    }
    setSkippedCore(next);
    // The dedicated included-lunch stop and the "Remove included lunch"
    // action are ONE decision in two places. Keep them in lockstep so the
    // itinerary and the −€15 pp credit can never disagree — and so the
    // lunch is never counted again by the −5% ladder.
    if (id === dedicatedLunchStopId(tour.id)) setLunchRemoved(isSkipping);
  };


  const tryToggleChoice = (id: string) => {
    const on = choiceSelected.has(id);
    const next = new Set(choiceSelected);
    if (on) {
      // Guard against dropping below the base product's pickMin.
      if (blueprint?.choice && next.size <= blueprint.choice.pickMin) {
        toast.error(
          `This tour needs at least ${blueprint.choice.pickMin} — swap one instead of removing it.`,
        );
        return;
      }
      next.delete(id);
    } else {
      next.add(id);
      // Canonical winery ladder: max 4, and the 4th needs a stop removed.
      const option0 = blueprint?.choice?.options.find((o) => o.id === id);
      // Only Signatures with an owner-approved winery supplement ladder may
      // INCREASE the winery count. Everywhere else the traveller swaps at
      // the blueprint baseline — we never hand out an unpriced extra stop.
      if (
        option0?.category === "winery" &&
        !rules.wineries &&
        blueprint?.choice &&
        choiceSelected.size >= blueprint.choice.pickMin
      ) {
        toast.error(
          `This Signature includes ${blueprint.choice.pickMin} — swap one instead of adding another.`,
        );
        return;
      }

      if (option0?.category === "winery") {
        const coreWineries = (blueprint?.core ?? []).filter(
          (s) => s.category === "winery" && !skippedCore.has(s.id),
        ).length;
        const chosenWineries = (blueprint?.choice?.options ?? []).filter(
          (o) => o.category === "winery" && next.has(o.id),
        ).length;
        const gate = canSelectWineries(tour.id, coreWineries + chosenWineries, skippedCore.size);
        if (!gate.allowed) {
          toast.error(gate.message);
          return;
        }
      }
      const proj = projectFeasibility(skippedCore, next, optionalSelected);
      if (proj && !proj.feasible) {
        toast.error(proj.warnings[0] ?? "Adding that stop overloads the day.");
        return;
      }
      // Consequence preview — surface the estimated time cost so the
      // traveller sees WHY the day just changed. Uses approved supplier
      // visit + tasting minutes when populated, else the category default.
      const option = blueprint?.choice?.options.find((o) => o.id === id);
      if (option) {
        const approved = (option.visitMinutes ?? 0) + (option.tastingMinutes ?? 0);
        const added = approved > 0 ? approved : DWELL_MINIMUM_MIN[option.category];
        toast.success(
          `Adding ${option.label} adds about ${added} min to your day.${
            approved > 0 ? "" : " Estimated — supplier will confirm timing."
          }`,
        );
      }
    }
    setChoiceSelected(next);
  };

  const tryToggleOptional = (id: string) => {
    const on = optionalSelected.has(id);
    const next = new Set(optionalSelected);
    if (on) next.delete(id);
    else {
      next.add(id);
      const proj = projectFeasibility(skippedCore, choiceSelected, next);
      if (proj && !proj.feasible) {
        toast.error(proj.warnings[0] ?? "Adding that stop overloads the day.");
        return;
      }
    }
    setOptionalSelected(next);
  };

  // Optional stops surfaced by Viator (passBy=true). Filtered for
  // geographic sanity: Viator's passBy list includes hub cities used
  // as orientation (e.g. "Lisbon" on a Southwest Coast tour). Drop
  // anything > ~120 km from this tour's own centre so we never offer
  // a nonsensical add-on. Capped at MAX_EDITS combined add/remove.
  const MAX_EDITS = 3;
  const optionalStops = useMemo(() => {
    const raw = (meta?.stops ?? []).filter((s) => s.passBy).map((s) => s.name);
    // Resolve this tour's geographic anchor from its own real stops.
    const anchorHit = (tour.stops ?? [])
      .map((s: TourStop) => lookupStop(s.label))
      .find((h: ReturnType<typeof lookupStop>) => h !== null);
    if (!anchorHit) return raw;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };
    return raw.filter((label) => {
      const hit = lookupStop(label);
      // Unknown geography → hide (silence beats a wrong option).
      if (!hit) return false;
      return distanceKm(anchorHit, hit) <= 120;
    });
  }, [meta, tour.stops]);
  const editsUsed = skipped.size + added.size;
  const editsLeft = Math.max(0, MAX_EDITS - editsUsed);

  /**
   * Accessibility / dietary / free-form notes are collected in the shared
   * FinalDetailsDialog ("Anything we should know?"). The editor keeps no
   * stale local copies — the FinalDetails payload is the single source.
   */



  // ─── Derived live summary values ────────────────────────────
  const keptStops = useMemo(
    () => (tour.stops ?? []).filter((s: TourStop) => !skipped.has(s.label)),
    [tour.stops, skipped],
  );

  // When a blueprint exists, the Live summary must reflect the actual
  // current selection (fixed core minus skipped-core + chosen wineries +
  // optional viewpoints the user added) — not the full Viator pool.
  const summaryStops = useMemo<{ label: string }[]>(() => {
    if (!blueprint) return keptStops.map((s: TourStop) => ({ label: s.label }));
    return [
      ...blueprint.core.filter((s) => !skippedCore.has(s.id)),
      ...(blueprint.choice ? blueprint.choice.options.filter((o) => choiceSelected.has(o.id)) : []),
      ...blueprint.optional.filter((o) => optionalSelected.has(o.id)),
    ];
  }, [blueprint, keptStops, skippedCore, choiceSelected, optionalSelected]);

  // Denominator: what a fully-satisfied plan would contain right now
  // (core kept + required choice count + optionals the user picked).
  const summaryTotal = useMemo(() => {
    if (!blueprint) return (tour.stops ?? []).length;
    const coreKept = blueprint.core.filter((s) => !skippedCore.has(s.id)).length;
    // Use the traveller's current selection count so the summary reflects
    // reality once they scale a wine-forward tour up to pickMax.
    const choiceTarget = blueprint.choice ? choiceSelected.size : 0;
    return coreKept + choiceTarget + optionalSelected.size;
  }, [blueprint, tour.stops, skippedCore, choiceSelected, optionalSelected]);

  const estimatedHours = useMemo(() => {
    const base = parseHours(tour.durationHours);
    const paceDelta = pace === "relaxed" ? 1 : pace === "full" ? -0.5 : 0;
    const skippedDelta = -0.5 * skipped.size;
    return Math.max(3, Math.round((base + paceDelta + skippedDelta) * 10) / 10);
  }, [tour.durationHours, pace, skipped]);

  const estimatedReturn = useMemo(
    () => addHoursToTime(pickup, estimatedHours),
    [pickup, estimatedHours],
  );

  // Per-stop deltas retired in Batch B — Tailor pricing now flows through
  // the SSOT `tailorAdjustedPerPax` helper: each principal stop the guest
  // removes reduces the direct per-pax by a fixed step (5%), capped at
  // −15% and floored at the operational minimum (70% of direct). Optional
  // additions no longer inflate the base price — they're handled as
  // add-ons / manual confirmation lines.
  const { data: tierOverrides } = useTourPriceTiers();
  const baseResolution = useMemo(
    () => resolvePerPaxEur(tour, guests, tierOverrides),
    [tour, guests, tierOverrides],
  );
  /**
   * No approved tier for this EXACT party size. `priceFrom` is only a
   * generic pre-composition anchor, so we must not quote or charge it.
   */
  const tierUnavailable = baseResolution == null;
  const basePerPax = baseResolution?.eurPerPax ?? tour.priceFrom;


  const [lunchAdded, setLunchAdded] = useState(false);
  /**
   * Arrábida Wine only: the canonical product INCLUDES lunch, so the
   * default is `false` (lunch kept). Removing it is a flat −€15 pp credit
   * — never a −5% stop removal, never a negative supplement.
   */
  const [lunchRemoved, setLunchRemoved] = useState(false);

  /**
   * Single entry point for the included-lunch decision. Drives BOTH the
   * dedicated −€15 pp credit and the itinerary stop, so the same lunch can
   * never be represented twice (and never earn the −5% ladder as well).
   */
  const toggleIncludedLunch = () => {
    const stopId = dedicatedLunchStopId(tour.id);
    if (stopId && blueprint?.core.some((s) => s.id === stopId)) {
      tryToggleSkippedCore(stopId);
      return;
    }
    setLunchRemoved((v) => !v);
  };



  /**
   * −5% ladder count. The dedicated included-lunch stop is EXCLUDED: its
   * removal is priced by the flat −€15 pp credit only, so the same lunch
   * can never earn both credits.
   */
  const principalsRemoved = useMemo(
    () =>
      blueprint
        ? principalRemovalCount(tour.id, skippedCore)
        : principalRemovalCount(tour.id, skipped),
    [blueprint, skippedCore, skipped, tour.id],
  );


  // ─── Authorized Tailor supplements (Canonical Bible v1.1) ───
  // Only two levers exist beyond stop removal: "add lunch" (+€35 pp, and
  // only where lunch is genuinely excluded) and extra wineries (+€20 pp,
  // Setúbal & Arrábida only, max 4, the 4th requiring a stop removal).
  const rules = useMemo(() => tailorRules(tour.id), [tour.id]);

  /** Total wineries currently in the day (kept core + chosen options). */
  const wineriesSelected = useMemo(() => {
    if (!blueprint) return 0;
    const core = blueprint.core.filter(
      (s) => s.category === "winery" && !skippedCore.has(s.id),
    ).length;
    const chosen = (blueprint.choice?.options ?? []).filter(
      (o) => o.category === "winery" && choiceSelected.has(o.id),
    ).length;
    return core + chosen;
  }, [blueprint, skippedCore, choiceSelected]);

  const supplementsPerPax = useMemo(
    () =>
      tailorSupplementsEur(tour.id, {
        lunchAdded,
        wineriesSelected: rules.wineries ? wineriesSelected : undefined,
      }),
    [tour.id, lunchAdded, rules.wineries, wineriesSelected],
  );

  const reducedPerPax = useMemo(
    () => tailorAdjustedPerPax(basePerPax, principalsRemoved),
    [basePerPax, principalsRemoved],
  );

  /** Flat lunch-removal credit (Arrábida Wine only). Outside cap + floor. */
  const lunchRemovalPerPax = useMemo(
    () => lunchRemovalEur(tour.id, lunchRemoved),
    [tour.id, lunchRemoved],
  );

  const estimatedPrice = useMemo(
    () => tailorFinalPerPax(basePerPax, principalsRemoved, supplementsPerPax, lunchRemovalPerPax),
    [basePerPax, principalsRemoved, supplementsPerPax, lunchRemovalPerPax],
  );

  const savingsEur = Math.max(0, basePerPax - reducedPerPax);

  // The journey resolver prefers real Viator tier data over `priceFrom`,
  // so passing the Tailor-adjusted per-pax as an anchor alone would be
  // ignored (every Signature has tiers). Pin every tier to the adjusted
  // per-pax so the displayed per-person / party total match the reduction
  // the guest sees — and what the edge function charges.
  const tailorTierOverride = useMemo(
    () => ({
      [tour.id]: {
        1: estimatedPrice,
        2: estimatedPrice,
        3: estimatedPrice,
        4: estimatedPrice,
        5: estimatedPrice,
        6: estimatedPrice,
        7: estimatedPrice,
        8: estimatedPrice,
      } as Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>,
    }),
    [tour.id, estimatedPrice],
  );

  // Age-banded journey pricing — mirrors the reserve-handler math so the
  // summary shows adults vs each minor at their band-adjusted unit price.
  // Silent (null) when minor ages are incomplete; adults-only parties fall
  // back to the single "Indicative total" row.
  const minorAgesComplete = useMemo(
    () =>
      composition.minorAges.length === 0 ||
      composition.minorAges.every(
        (age) =>
          typeof age === "number" &&
          Number.isFinite(age) &&
          Number.isInteger(age) &&
          age >= 0 &&
          age <= 17,
      ),
    [composition.minorAges],
  );
  const journeyPricing = useMemo(() => {
    if (!minorAgesComplete) return null;
    return resolveJourneyPricing(
      { id: tour.id, priceFrom: estimatedPrice },
      composition.adults,
      composition.minorAges,
      tailorTierOverride,
    );
  }, [
    tour.id,
    estimatedPrice,
    tailorTierOverride,
    composition.adults,
    composition.minorAges,
    minorAgesComplete,
  ]);
  const journeyLines = journeyPricing?.lines ?? null;
  const showBandBreakdown =
    composition.minorAges.length > 0 && hasCompleteJourneyPricing(journeyLines);
  const displayTotalEur = journeyPricing?.totalEur ?? estimatedPrice * guests;

  /**
   * Canonical total-first quote for "Your version". Pure presentation of
   * the same numbers the reserve handler sends to Stripe — no new math.
   */
  const versionQuote = useMemo<ChargeQuote | null>(() => {
    if (!compositionReady || !minorAgesComplete) return null;
    return {
      totalEur: displayTotalEur,
      perPaxAdultEur: estimatedPrice,
      hasMinors: composition.minorAges.length > 0,
      adults: composition.adults,
      minors: composition.minorAges.length,
      adjustments: lunchRemovalPerPax
        ? [{ label: "Included lunch removed", amountEur: -lunchRemovalPerPax * guests }]
        : undefined,
    };
  }, [
    compositionReady,
    minorAgesComplete,
    displayTotalEur,
    estimatedPrice,
    composition.adults,
    composition.minorAges.length,
    lunchRemovalPerPax,
    guests,
  ]);

  // ─── Wine-extension state ───────────────────────────────────
  // A "wine extension" = the traveller picked MORE wineries than the
  // Signature's baseline `pickMin`. Because per-winery extension pricing
  // has not been supplier-approved for every estate, extended selections
  // fall to the manual-confirmation path — we don't invent a delta.
  const wineExtension = useMemo(() => {
    if (!blueprint?.choice) return { extra: 0, hasManualSupplier: false };
    const extra = Math.max(0, choiceSelected.size - blueprint.choice.pickMin);
    // Any selected option that explicitly requires manual confirmation.
    const hasManualSupplier = blueprint.choice.options.some(
      (o) => choiceSelected.has(o.id) && o.confirmationStatus === "manual",
    );
    return { extra, hasManualSupplier };
  }, [blueprint, choiceSelected]);

  // An extra winery only blocks instant checkout when it is NOT covered by
  // an approved supplement ladder. Arrábida Wine's +€20 pp extras are
  // priced, so they stay instantly bookable (exact estate assignment is
  // operational and never promised here).
  const requiresManualConfirmation =
    (wineExtension.extra > 0 && !rules.wineries) || wineExtension.hasManualSupplier;


  // Blueprint contains a winery selection surface (choice or core).
  const hasWinerySurface = useMemo(() => {
    if (!blueprint) return false;
    if (blueprint.core.some((s) => s.category === "winery")) return true;
    if (blueprint.choice?.options.some((o) => o.category === "winery")) return true;
    return false;
  }, [blueprint]);
  const hasMinors = composition.minorAges.length > 0;
  const showMinorsWineAdvisory = hasWinerySurface && hasMinors;

  // Removable-stop suggestions when the day is at capacity — surfaced
  // as advice only. Never auto-removed; the traveller decides.
  const removableCoreLabels = useMemo(() => {
    if (!blueprint) return [] as string[];
    return blueprint.core.filter((s) => !s.lock && !skippedCore.has(s.id)).map((s) => s.label);
  }, [blueprint, skippedCore]);

  /* ── Presentation truth (no pricing or eligibility changes) ──
   * `principalEligibleStopIds` is the SAME authoritative set the −5%
   * ladder uses, so a moment only advertises a reduction when removing it
   * genuinely earns one. Everything else removes time, never money.
   */
  const principalEligible = useMemo(() => principalEligibleStopIds(tour.id), [tour.id]);

  /**
   * Public winery vocabulary. Estate names are operational data — the
   * traveller chooses how MANY winery visits the day holds, never which
   * partner. Assignment happens after booking.
   */
  const wineryLabel = (index: number) => `Winery visit ${index}`;

  /** Ordered winery options, so count ↔ selection stays deterministic. */
  const wineryOptions = useMemo(
    () => (blueprint?.choice?.options ?? []).filter((o) => o.category === "winery"),
    [blueprint],
  );
  const canAdjustWineryCount = Boolean(rules.wineries) && wineryOptions.length > 0;
  const addWineryVisit = () => {
    const next = wineryOptions.find((o) => !choiceSelected.has(o.id));
    if (next) tryToggleChoice(next.id);
  };
  const removeWineryVisit = () => {
    const last = [...wineryOptions].reverse().find((o) => choiceSelected.has(o.id));
    if (last) tryToggleChoice(last.id);
  };

  /**
   * The day as an ordered list of moments. Core stops keep blueprint
   * order; chosen options follow. Winery entries are shown generically.
   */
  const moments = useMemo(() => {
    if (!blueprint) return [];
    let wineryIndex = 0;
    const core = blueprint.core.map((s) => {
      const isWinery = s.category === "winery";
      if (isWinery) wineryIndex += 1;
      return {
        id: s.id,
        label: isWinery ? wineryLabel(wineryIndex) : s.label,
        locked: Boolean(s.lock),
        lockReason: s.lock?.customerFacingReason ?? null,
        removed: skippedCore.has(s.id),
        earnsReduction: principalEligible.has(s.id),
      };
    });
    const chosen = (blueprint.choice?.options ?? [])
      .filter((o) => choiceSelected.has(o.id))
      .map((o) => {
        const isWinery = o.category === "winery";
        if (isWinery) wineryIndex += 1;
        return {
          id: o.id,
          label: isWinery ? wineryLabel(wineryIndex) : o.label,
          locked: true,
          lockReason: isWinery ? null : "Chosen for this day.",
          removed: false,
          earnsReduction: false,
        };
      });
    return [...core, ...chosen];
  }, [blueprint, skippedCore, choiceSelected, principalEligible]);


  // ─── Helpers ────────────────────────────────────────────────
  const toggle = <T extends string>(setter: (s: Set<T>) => void, current: Set<T>, val: T) => {
    const next = new Set(current);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  // ─── Instant booking — Stripe checkout ──────────────────────
  // Tailored selection is sent to the same `create-signature-checkout`
  // edge function as the Studio reveal. Server resolves the per-pax
  // price; we pass `estimatedPrice` as the anchor so add-on / stop
  // deltas flow through when no tier row exists.
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const navigate = useNavigate();

  const handleReserve = async (details: GuestDetails) => {
    if (checkoutPending) return;
    // Exact-tier truth gate — the server refuses this party size, so never
    // open a checkout against the generic "from" anchor.
    if (tierUnavailable) {
      toast.error(
        "This Signature isn't published for this party size — a YES curator will confirm your investment.",
      );
      return;
    }
    setCheckoutPending(true);

    // Open the drawer immediately so a branded skeleton appears while
    // the edge function is in flight — avoids "blank screen" feel.
    const metaForSummary = getViatorMeta(tour.id);
    const stopLabels = keptStops.map((s: TourStop) => s.label);
    [...added].forEach((label) => stopLabels.push(label));
    // Age-band aware total — mirrors the server pricing so summary and
    // Stripe line items agree for families with minors. Tailored uses
    // estimatedPrice (adult tier + selection deltas) as the adult unit;
    // apply band % for minors via a shim tour so resolver keys off it.
    const summaryJourney = resolveJourneyPricing(
      { id: tour.id, priceFrom: estimatedPrice },
      details.adults,
      details.minorAges,
      // Pin tiers to the Tailor-adjusted per-pax so the resolver can't
      // fall back to full Viator tier pricing.
      tailorTierOverride,
    );
    const totalForSummary = summaryJourney?.totalEur ?? Math.round(estimatedPrice * details.guests);
    setCheckoutSummary({
      tourTitle: `Tailored — ${tour.title.split("—")[0].trim()}`,
      region: tour.region,
      durationHours: tour.durationHours,
      guests: details.guests,
      adults: details.adults,
      minorAges: [...details.minorAges],
      dateExact: details.tourDate || null,
      startTime: details.startTime ?? null,
      pickupLabel: details.pickupAddress || pickup,
      pricePerPaxEur: estimatedPrice,
      totalEur: totalForSummary,
      heroSrc: metaForSummary?.localGallery?.[0]?.src ?? metaForSummary?.gallery?.[0] ?? tour.img,
      beats: stopLabels.slice(0, 4),
      flowLabel: "Tailored",
    });

    setDetailsOpen(false);
    setCheckoutOpen(true);
    // GA4 add_to_cart + begin_checkout — Tailored reserve intent.
    try {
      gaAddToCartSignature({ tour, guests: details.guests, perPaxEur: estimatedPrice });
      const item = buildTourItem(tour, {
        quantity: details.guests,
        tier: "tailored",
        itemCategory: "Signature",
      });
      item.price = estimatedPrice;
      gaBeginCheckout({ items: [item], valueEur: Math.round(estimatedPrice * details.guests) });
      trackEvent("checkout_started", {
        experience_id: tour.id,
        experience_type: "tailor",
        group_size: details.guests,
        value: Math.round(estimatedPrice * details.guests),
        currency: "EUR",
      });
    } catch {
      /* silent */
    }
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          tourId: tour.id,
          tourTitle: tour.title,
          guests: details.guests,
          adults: details.adults,
          minorAges: details.minorAges,
          stopLabels: stopLabels.slice(0, 8),
          includedItems: resolveClientIncludedItems(metaForSummary, tour),
          // Display-only: what the guest actually booked / opted out of.
          // Never priced — the server re-derives every euro itself.
          itinerary: stopLabels.slice(0, 20).map((label: string) => ({ label })),
          removedOptions: [
            ...(blueprint
              ? blueprint.core.filter((s) => skippedCore.has(s.id)).map((s) => s.label)
              : []),
            ...(rules.allowRemoveLunch === true && lunchRemoved ? ["Included lunch removed"] : []),
          ],

          pickupLabel: details.pickupAddress || pickup,
          dateExact: details.tourDate || null,
          journeyTitle: `Tailored — ${tour.title.split("—")[0].trim()}`,
          priceFromEur: basePerPax,
          principalsRemoved,
          // Stable stop ids so the server can re-derive the −5% ladder
          // itself and exclude the dedicated included-lunch stop.
          skippedCoreStopIds: blueprint
            ? blueprint.core.filter((s) => skippedCore.has(s.id)).map((s) => s.id)
            : [],

          tailorLunchAdded: lunchAdded,
          tailorExtraWineries: rules.wineries
            ? Math.max(0, wineriesSelected - rules.wineries.included)
            : 0,
          // Boolean intent only — the server derives the €15 itself.
          tailorLunchRemoved: rules.allowRemoveLunch === true && lunchRemoved,

          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          environment: getStripeEnvironment(),
          tailored: true,
          flow: "tailor",
          uiMode: "embedded",
          guestDetails: {
            ...details,
            hotelPickupIncluded: true,
            pace,
            accessibility: [...accessibility],
            notes,
            skippedCoreStops: blueprint
              ? blueprint.core.filter((s) => skippedCore.has(s.id)).map((s) => s.label)
              : [],
          },
        },
      });
      if (error) throw error;
      const resp = (data ?? {}) as { clientSecret?: string; publishableKey?: string };
      if (!resp.clientSecret || !resp.publishableKey) {
        throw new Error("Embedded checkout unavailable");
      }
      setClientSecret(resp.clientSecret);
      setPublishableKey(resp.publishableKey);
      trackEvent("checkout_session_created", {
        experience_id: tour.id,
        experience_type: "tailor",
        group_size: details.guests,
        value: Math.round(estimatedPrice * details.guests),
        currency: "EUR",
      });
      // GA4 add_payment_info — payment surface ready.
      try {
        const item = buildTourItem(tour, {
          quantity: details.guests,
          tier: "tailored",
          itemCategory: "Signature",
        });
        item.price = estimatedPrice;
        gaAddPaymentInfo({
          paymentType: "stripe",
          items: [item],
          valueEur: Math.round(estimatedPrice * details.guests),
        });
      } catch {
        /* silent */
      }
    } catch (e) {
      console.error("Tailor checkout failed", e);
      trackEvent("checkout_session_failed", {
        experience_id: tour.id,
        experience_type: "tailor",
        group_size: details.guests,
      });
      toast.error("Checkout unavailable right now. Please try again in a moment.");
      setCheckoutOpen(false);
    } finally {
      setCheckoutPending(false);
    }
  };

  return (
    <SiteLayout>
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <SiteBreadcrumbs
        containerClassName="container-x max-w-6xl"
        className="bg-transparent pt-24 pb-0"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Signature Experiences", path: "/experiences" },
          { name: tour.title, path: `/tours/${tour.id}` },
          { name: "Tailor this day", path: `/tours/${tour.id}/tailor` },
        ]}
      />
      <section className="pt-3 pb-3">
        <div className="container-x max-w-6xl">
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <ArrowLeft size={12} /> Back to this Signature
          </Link>
        </div>
      </section>

      {/* ── 1 · INTRO — one line of context, then the editor ── */}
      <section className="pb-6">
        <div className="container-x max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:gap-10">
            <div>
              <Eyebrow>Tailor this Signature</Eyebrow>
              <SectionTitle as="h1" size="default" spacing="tight">
                {tour.title.split("—")[0].trim()},{" "}
                <SectionTitle.Em>your version</SectionTitle.Em>
              </SectionTitle>
              <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                Keep the day as designed, or change a few moments. Your guide, route order and
                region stay as they are.
              </p>
            </div>

            <div className="relative aspect-[16/9] overflow-hidden border border-[color:var(--border)]">
              <img
                src={tour.img}
                alt={tour.title}
                width={1600}
                height={900}
                fetchPriority="high"
                decoding="async"
                style={{ objectPosition: tour.focal ?? "50% 50%" }}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[color:var(--charcoal-deep)]/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/90">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={11} /> {tour.region}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={11} /> {signatureDurationLabel(tour.id, tour.durationHours)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2 · EDITOR (Moments · Rhythm · Enhance) + YOUR VERSION ── */}
      <section className="py-8 md:py-12 reveal">
        <div className="container-x max-w-6xl">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
            {/* ─── Editor column ─────────────────────────── */}
            <div className="space-y-10">
              {/* Booking context — compact, not a form wall */}
              <div
                data-testid="tailor-booking-context"
                className="grid gap-3 border border-[color:var(--border)] bg-[color:var(--ivory)] p-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center"
              >
                <input
                  type="date"
                  aria-label="Date"
                  value={date}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && rule) {
                      const check = validateDateISO(v, rule);
                      if (!check.ok) {
                        gaBookingValidationBlocked({
                          tourId: tour.id,
                          surface: "tailor",
                          reason: `date_${check.reason}`,
                        });
                        const msg =
                          check.reason === "weekday_closed"
                            ? "This tour doesn't run on that day. Please pick another date."
                            : check.reason === "blackout"
                              ? "That date is unavailable. Please pick another."
                              : "Please choose a date at least 24 hours from now.";
                        toast.error(msg);
                        return;
                      }
                    }
                    setDate(v);
                    if (v) gaBookingDateSelected({ tourId: tour.id, surface: "tailor", dateISO: v });
                  }}
                  min={minDateISO}
                  className="min-h-[48px] w-full border border-[color:var(--border)] bg-transparent px-3 py-3 text-sm focus:border-[color:var(--gold)] focus:outline-none"
                />
                <div className="min-w-0">
                  <CompositionField
                    value={composition}
                    onChange={(next) => {
                      setComposition(next);
                      gaBookingCompositionSet({
                        tourId: tour.id,
                        surface: "tailor",
                        adults: next.adults,
                        minors: next.minorAges.length,
                      });
                    }}
                    compact
                  />
                  {!compositionReady && (
                    <p className="mt-1.5 text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                      Add an age for every child so we can price honestly.
                    </p>
                  )}
                </div>
              </div>

              {/* ── MOMENTS ─────────────────────────────── */}
              <Group title="Moments">
                {blueprint ? (
                  <ol data-testid="tailor-moments" className="m-0 list-none space-y-2 p-0">
                    {moments.map((m, i) => {
                      const index = String(i + 1).padStart(2, "0");
                      if (m.locked) {
                        return (
                          <li
                            key={m.id}
                            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border border-[color:var(--border)] px-3 py-3"
                          >
                            <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--charcoal-soft)]">
                              {index}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                                {m.label}
                              </span>
                              <span className="mt-0.5 block text-[12px] text-[color:var(--charcoal-soft)]">
                                Part of this Signature
                              </span>
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => tryToggleSkippedCore(m.id)}
                            aria-pressed={m.removed}
                            data-testid="tailor-moment-toggle"
                            className={[
                              "grid min-h-[56px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                              m.removed
                                ? "border-[color:var(--border)] bg-transparent"
                                : "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5",
                            ].join(" ")}
                          >
                            <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--charcoal-soft)]">
                              {index}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={[
                                  "block text-[13.5px] leading-snug",
                                  m.removed
                                    ? "text-[color:var(--charcoal-soft)] line-through"
                                    : "text-[color:var(--charcoal)]",
                                ].join(" ")}
                              >
                                {m.label}
                              </span>
                              {m.removed && (
                                <span className="mt-0.5 block text-[12px] text-[color:var(--teal)]">
                                  More time elsewhere
                                  {m.earnsReduction ? " · −5%" : ""}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                              {m.removed ? "Undo" : "Remove"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <ol data-testid="tailor-moments" className="m-0 list-none space-y-2 p-0">
                    {(tour.stops ?? []).map((s: TourStop, i: number) => {
                      const kept = !skipped.has(s.label);
                      const disabled = kept && editsLeft === 0;
                      return (
                        <li key={s.label + i}>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggle(setSkipped, skipped, s.label)}
                            aria-pressed={!kept}
                            data-testid="tailor-moment-toggle"
                            className={[
                              "grid min-h-[56px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                              kept
                                ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5"
                                : "border-[color:var(--border)]",
                              disabled ? "cursor-not-allowed opacity-60" : "",
                            ].join(" ")}
                          >
                            <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--charcoal-soft)]">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={[
                                  "block text-[13.5px] leading-snug",
                                  kept
                                    ? "text-[color:var(--charcoal)]"
                                    : "text-[color:var(--charcoal-soft)] line-through",
                                ].join(" ")}
                              >
                                {s.label}
                              </span>
                              {!kept && (
                                <span className="mt-0.5 block text-[12px] text-[color:var(--teal)]">
                                  More time elsewhere
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                              {kept ? "Remove" : "Undo"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {/* Non-winery choice pools stay a real, named choice
                    (public monuments), presented as one swap. */}
                {blueprint?.choice &&
                  blueprint.choice.options.some((o) => o.category !== "winery") && (
                    <div className="mt-4">
                      <p className="mb-2 text-[12px] text-[color:var(--charcoal-soft)]">
                        {blueprint.choice.label}
                      </p>
                      <ul className="grid list-none gap-2.5 p-0 sm:grid-cols-2">
                        {blueprint.choice.options
                          .filter((o) => o.category !== "winery")
                          .map((o) => {
                            const on = choiceSelected.has(o.id);
                            const atLimit = !on && choiceSelected.size >= blueprint.choice!.pickMax;
                            return (
                              <li key={o.id}>
                                <button
                                  type="button"
                                  disabled={atLimit}
                                  onClick={() => tryToggleChoice(o.id)}
                                  aria-pressed={on}
                                  className={[
                                    "grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                                    on
                                      ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                                      : "border-[color:var(--border)]",
                                    atLimit ? "cursor-not-allowed opacity-50" : "",
                                  ].join(" ")}
                                >
                                  <span className="min-w-0 text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                                    {o.label}
                                  </span>
                                  <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                                    {on ? "Chosen" : "Swap"}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}

                {blueprintFeasibility && (
                  <p className="mt-3 text-[12px] text-[color:var(--charcoal-soft)]">
                    ~{Math.round(blueprintFeasibility.totalMinutes / 60)}h of experience
                    {blueprintFeasibility.feasible ? " · fits the day" : ""}
                  </p>
                )}
              </Group>

              {/* ── RHYTHM ──────────────────────────────── */}
              <Group title="Rhythm">
                <div data-testid="tailor-rhythm">
                  <Segmented
                    value={pace}
                    onChange={setPace}
                    options={[
                      { v: "relaxed", l: "Relaxed" },
                      { v: "balanced", l: "Balanced" },
                      { v: "full", l: "Full" },
                    ]}
                  />
                  <p className="mt-2 text-[12.5px] text-[color:var(--charcoal-soft)]">
                    {pace === "relaxed"
                      ? "Longer stays, fewer transitions."
                      : pace === "full"
                        ? "More moments, tighter timing."
                        : "A natural flow through the day."}
                  </p>
                </div>
              </Group>

              {/* ── ENHANCE ─────────────────────────────── */}
              {(rules.allowAddLunch ||
                rules.allowRemoveLunch ||
                canAdjustWineryCount ||
                (blueprint?.optional.length ?? 0) > 0) && (
                <Group title="Enhance">
                  <div data-testid="tailor-enhance" className="space-y-2.5">
                    {canAdjustWineryCount && (
                      <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-[color:var(--border)] px-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                            Winery visits
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[color:var(--charcoal-soft)]">
                            {rules.wineries!.included} included · each extra +
                            <PriceEur
                              amountEur={rules.wineries!.supplementEur}
                              role="per-person"
                            />{" "}
                            pp
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={removeWineryVisit}
                            aria-label="One winery visit fewer"
                            data-testid="tailor-winery-decrease"
                            className="h-11 w-11 border border-[color:var(--border)] text-[color:var(--charcoal)]"
                          >
                            −
                          </button>
                          <span
                            data-testid="tailor-winery-count"
                            className="w-8 text-center text-[14px] tabular-nums text-[color:var(--charcoal)]"
                          >
                            {wineriesSelected}
                          </span>
                          <button
                            type="button"
                            onClick={addWineryVisit}
                            aria-label="One winery visit more"
                            data-testid="tailor-winery-increase"
                            className="h-11 w-11 border border-[color:var(--border)] text-[color:var(--charcoal)]"
                          >
                            +
                          </button>
                        </span>
                      </div>
                    )}

                    {rules.allowAddLunch && (
                      <button
                        type="button"
                        onClick={() => setLunchAdded((v) => !v)}
                        aria-pressed={lunchAdded}
                        data-testid="tailor-add-lunch"
                        className={[
                          "grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                          lunchAdded
                            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                            : "border-[color:var(--border)]",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="block text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                            {lunchAdded ? "Lunch added" : "Add a seated lunch"}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[color:var(--charcoal-soft)]">
                            +
                            <PriceEur
                              amountEur={TAILOR_LUNCH_SUPPLEMENT_EUR}
                              role="per-person"
                            />{" "}
                            pp
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                          {lunchAdded ? "Remove" : "Add"}
                        </span>
                      </button>
                    )}

                    {rules.allowRemoveLunch && (
                      <button
                        type="button"
                        onClick={() => toggleIncludedLunch()}
                        aria-pressed={lunchRemoved}
                        data-testid="tailor-remove-lunch"
                        className={[
                          "grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                          lunchRemoved
                            ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10"
                            : "border-[color:var(--border)]",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="block text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                            {lunchRemoved ? "Lunch removed" : "Included lunch"}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[color:var(--charcoal-soft)]">
                            −
                            <PriceEur
                              amountEur={TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR}
                              role="per-person"
                            />{" "}
                            pp if removed
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                          {lunchRemoved ? "Restore" : "Remove"}
                        </span>
                      </button>
                    )}

                    {(blueprint?.optional ?? []).map((o) => {
                      const on = optionalSelected.has(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => tryToggleOptional(o.id)}
                          aria-pressed={on}
                          data-testid="tailor-optional-toggle"
                          className={[
                            "grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                            on
                              ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                              : "border-[color:var(--border)]",
                          ].join(" ")}
                        >
                          <span className="min-w-0">
                            <span className="block text-[13.5px] leading-snug text-[color:var(--charcoal)]">
                              {o.label}
                            </span>
                            {o.blurb && (
                              <span className="mt-0.5 block text-[12px] text-[color:var(--charcoal-soft)]">
                                {o.blurb}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                            {on ? "Remove" : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Group>
              )}

              {showMinorsWineAdvisory && (
                <p className="text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                  Wine tasting is offered to adults only — minors visit the estate without tasting.
                </p>
              )}
            </div>

            {/* ─── YOUR VERSION ──────────────────────────── */}
            <aside className="lg:sticky lg:top-24">
              {import.meta.env?.DEV && validation.hasViatorMeta && validation.issueCount > 0 && (
                <div className="mb-3 border border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)]/40 p-3 text-[12px] text-[color:var(--charcoal)]">
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                    Viator validation · {validation.issueCount} mismatch
                    {validation.issueCount === 1 ? "" : "es"}
                  </p>
                  <Link to="/admin/viator-validation" className="mt-1 inline-block underline">
                    Open full report →
                  </Link>
                </div>
              )}

              <div
                data-testid="tailor-your-version"
                className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              >
                <Eyebrow>Your version</Eyebrow>
                <p className="mt-2 text-[13px] leading-snug text-[color:var(--charcoal)]">
                  {summaryStops.length} {summaryStops.length === 1 ? "moment" : "moments"} ·{" "}
                  {cap(pace)} rhythm
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                  {date || "Date to choose"} · {formatCompositionSummary(composition)}
                </p>

                <ChargeSummaryLine className="mt-3" quote={versionQuote} />

                <button
                  type="button"
                  data-testid="tailor-reserve-cta"
                  onClick={() => {
                    gaReserveCtaClick({
                      tourId: tour.id,
                      surface: "tailor",
                      ctaLocation: "final",
                    });
                    if (!compositionReady) {
                      gaBookingValidationBlocked({
                        tourId: tour.id,
                        surface: "tailor",
                        reason: "composition_incomplete",
                      });
                      return;
                    }
                    if (summaryStops.length === 0) {
                      gaBookingValidationBlocked({
                        tourId: tour.id,
                        surface: "tailor",
                        reason: "no_stops",
                      });
                      return;
                    }
                    gaCheckoutDrawerOpened({ tourId: tour.id, surface: "tailor" });
                    setDetailsOpen(true);
                  }}
                  disabled={checkoutPending || summaryStops.length === 0 || !compositionReady}
                  className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 bg-[color:var(--teal)] px-5 py-4 text-sm tracking-wide text-[color:var(--ivory)] transition-all hover:bg-[color:var(--teal-2)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Opening checkout…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Reserve this version
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[12px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  Instant confirmation · {CANCELLATION.custom.en}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <FinalDetailsDialog
        priceQuote={({ adults, minorAges }) => {
          // Never quote a price we can't charge instantly.
          if (requiresManualConfirmation) return null;
          // Same resolver + pinned tiers as handleReserve → Stripe.
          const j = resolveJourneyPricing(
            { id: tour.id, priceFrom: estimatedPrice },
            adults,
            minorAges,
            tailorTierOverride,
          );
          if (!j) return null;
          return {
            totalEur: j.totalEur,
            perPaxAdultEur: j.perPaxAdultEur,
            hasMinors: minorAges.length > 0,
            adults,
            minors: minorAges.length,
            journeySubtotalEur: j.totalEur,
            addOnsEur: 0,
            adjustments:
              lunchRemovalPerPax > 0
                ? [
                    {
                      label: "Included lunch removed",
                      amountEur: -lunchRemovalPerPax * (adults + minorAges.length),
                    },
                  ]
                : undefined,
          };
        }}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        submitting={checkoutPending}
        tourId={tour.id}
        initial={{
          tourDate: date,
          adults: composition.adults,
          minorAges: [...composition.minorAges],
          language,
        }}
        onConfirm={async (d) => {
          await handleReserve(d);
        }}
      />

      <BrandedCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={(o) => {
          setCheckoutOpen(o);
          if (!o) setClientSecret(null);
        }}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        summary={
          checkoutSummary ?? {
            tourTitle: `Tailored — ${tour.title.split("—")[0].trim()}`,
            guests,
            adults: composition.adults,
            minorAges: [...composition.minorAges],
            pricePerPaxEur: estimatedPrice,
            totalEur: Math.round(estimatedPrice * guests),
            flowLabel: "Tailored",
          }
        }
        onComplete={(sid) => {
          setCheckoutOpen(false);
          navigate({
            to: "/booking-confirmed",
            search: { session_id: sid ?? undefined, tour: tour.id },
          });
        }}
      />
    </SiteLayout>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Small UI primitives
 * ──────────────────────────────────────────────────────────── */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  // Micro-labels ("When", "Pace", "Your group") are grouping labels, not
  // document headings — they render at 10px, far below the page's heading
  // scale. Exposed as a labelled group so assistive tech still announces
  // the grouping without polluting the heading outline.
  return (
    <div role="group" aria-label={title}>
      <p
        aria-hidden="true"
        className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] mb-3"
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr border border-[color:var(--border)]">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            className={[
              "px-3 py-3 text-[12px] uppercase tracking-[0.2em] transition-colors min-h-[48px]",
              on
                ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
            ].join(" ")}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            className={[
              "px-3.5 py-2 text-[12px] border transition-colors min-h-[40px]",
              on
                ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
            ].join(" ")}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center border border-[color:var(--border)] min-h-[48px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-4 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
        aria-label="Decrease traveller count"
      >
        −
      </button>
      <span className="flex-1 text-center text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-4 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
        aria-label="Increase traveller count"
      >
        +
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] shrink-0">
        {label}
      </span>
      <span className="text-[12.5px] text-[color:var(--charcoal)] text-right leading-snug">
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Utilities
 * ──────────────────────────────────────────────────────────── */
function parseHours(s: string): number {
  // "7–9h" → 8, "8h" → 8, "9–10h" → 9.5
  const nums = s.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0) return 7;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function addHoursToTime(hhmm: string, hoursToAdd: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m + Math.round(hoursToAdd * 60);
  const hh = Math.floor((totalMin / 60) % 24);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatHours(h: number): string {
  if (Number.isInteger(h)) return `${h}h`;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min === 0 ? `${whole}h` : `${whole}h${String(min).padStart(2, "0")}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
