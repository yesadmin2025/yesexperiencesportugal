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

  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [pace, setPace] = useState<"relaxed" | "balanced" | "full">("balanced");
  const [composition, setComposition] = useState<TravellerComposition>({
    adults: 2,
    minorAges: [],
  });
  const guests = totalGuests(composition);
  const compositionReady = isCompositionComplete(composition);
  const [language, setLanguage] = useState<"en" | "pt">("en");

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

  const [accessibility, setAccessibility] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

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
  const basePerPax = useMemo(() => {
    const r = resolvePerPaxEur(tour, guests, tierOverrides);
    return r?.eurPerPax ?? tour.priceFrom;
  }, [tour, guests, tierOverrides]);

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

  const requiresManualConfirmation = wineExtension.extra > 0 || wineExtension.hasManualSupplier;

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

      {/* ── 1 · INTRO ───────────────────────────────────────── */}
      <section className="pb-8">
        <div className="container-x max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-end">
            <div>
              <Eyebrow>Tailor this Signature</Eyebrow>
              <SectionTitle as="h1" size="default" spacing="normal">
                Keep the heart of this journey,{" "}
                <SectionTitle.Em>adjust selected details</SectionTitle.Em> to match your rhythm.
              </SectionTitle>
              <p className="mt-5 text-[14.5px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-lg">
                You're tailoring{" "}
                <span className="text-[color:var(--charcoal)]">
                  {tour.title.split("—")[0].trim()}
                </span>
                . The route, story and trusted local guide remain intact — only the details below
                can be adjusted.
              </p>
            </div>

            {/* Tour mini card — visual anchor */}
            <div className="relative aspect-[16/9] sm:aspect-[16/8] overflow-hidden border border-[color:var(--border)]">
              <img
                src={tour.img}
                alt={tour.title}
                width={1600}
                height={900}
                fetchPriority="high"
                decoding="async"
                style={{ objectPosition: tour.focal ?? "50% 50%" }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[color:var(--charcoal-deep)]/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-[color:var(--ivory)]">
                <span className="text-[12px] uppercase tracking-[0.12em] bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] px-2.5 py-1">
                  Signature
                </span>
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/90">
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
        </div>
      </section>

      {/* ── 2 · TAILOR EXPLAINER (indexable, one-time) ───────── */}
      <section aria-label="About Tailor" className="pb-6">
        <div className="container-x max-w-3xl">
          <div className="space-y-4 text-[14.5px] text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              A Signature gives you a complete private day. Tailor allows you to keep its central
              story while adjusting selected parts of the experience.
            </p>
            <p>
              Depending on the Signature and current availability, travellers may be able to change
              a stop, add an activity, adjust the rhythm or refine the balance between wine, coast,
              food, heritage and local culture.
            </p>
            <p>
              Tailor is designed for focused adjustments rather than building an entirely new
              itinerary. For a journey beginning from a blank page, use the YES Studio.
            </p>
            <p className="text-[13px]">
              <Link
                to="/studio-v3"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                Build a journey from the beginning →
              </Link>
              <span className="mx-3 text-[color:var(--charcoal-soft)]/50">·</span>
              <Link
                to="/portugal-travel-designer"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                Discover our Portugal travel design →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── 3 · WHAT STAYS / WHAT YOU CAN ADJUST ──────────────
          Two-column reassurance block. The user must understand:
          "I can adjust this tour a little, without starting from
          zero." Tailored = selected adjustments INSIDE this one
          Signature — never a new itinerary, never stops from other
          tours, never a mix of regions. */}
      <section
        className="py-10 md:py-12 bg-[color:var(--ivory)] border-y border-[color:var(--border)] reveal"
        aria-labelledby="tailor-scope-title"
      >
        <div className="container-x max-w-6xl">
          <h2 id="tailor-scope-title" className="sr-only">
            What stays the same and what you can adjust
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* What stays the same */}
            <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <Lock size={14} className="text-[color:var(--gold)] shrink-0" aria-hidden="true" />
                <span className="text-[12px] uppercase tracking-[0.12em] font-semibold text-[color:var(--charcoal)]">
                  What stays the same
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--charcoal)]">
                The core route, quality and local flow remain intact.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                {[
                  "The real route and order of stops",
                  "The trusted local guide and driver",
                  "The quality of every stop and partner",
                  "The region — only this Signature, no mixing",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check
                      size={13}
                      className="mt-[3px] text-[color:var(--teal)] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What you can adjust */}
            <div className="border border-[color:var(--border)] bg-[color:var(--sand)] p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <Sparkles
                  size={14}
                  className="text-[color:var(--teal)] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-[12px] uppercase tracking-[0.12em] font-semibold text-[color:var(--charcoal)]">
                  What you can adjust
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--charcoal)]">
                Selected details available inside this specific experience.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                {[
                  "Pace and timing",
                  "Optional stops, when available",
                  "Available add-ons for this tour",
                  "Lunch preference, when applicable",
                  "Group size, language and accessibility needs",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Plain-language clarification — sets the right mental model
              before the user touches any control. */}
          <p className="mt-5 text-[12.5px] leading-[1.6] text-[color:var(--charcoal-soft)] italic max-w-2xl">
            You're adjusting this tour a little — not starting from zero. To design a day from
            scratch, open the Studio.
          </p>
        </div>
      </section>

      {/* ── 2 · ADJUSTABLE OPTIONS + 4 · LIVE SUMMARY ─────── */}
      <section className="py-12 md:py-16 reveal">
        <div className="container-x max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_22rem] gap-8 lg:gap-12 items-start">
            {/* ─── Adjustments column ──────────────────── */}
            <div className="space-y-10">
              {/* Date + Pickup */}
              <Group title="When">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Date">
                    <input
                      type="date"
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
                        if (v)
                          gaBookingDateSelected({ tourId: tour.id, surface: "tailor", dateISO: v });
                      }}
                      min={minDateISO}
                      className="w-full bg-transparent border border-[color:var(--border)] px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--gold)] min-h-[48px]"
                    />
                  </Field>
                  <Field label="Pickup time">
                    <Segmented
                      value={pickup}
                      onChange={setPickup}
                      options={[
                        { v: "08:00", l: "08:00" },
                        { v: "09:00", l: "09:00" },
                        { v: "10:00", l: "10:00" },
                      ]}
                    />
                  </Field>
                </div>
              </Group>

              {/* Pace */}
              <Group title="Pace">
                <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                  How the day breathes. The stops stay; only the rhythm changes.
                </p>
                <Segmented
                  value={pace}
                  onChange={setPace}
                  options={[
                    { v: "relaxed", l: "Relaxed" },
                    { v: "balanced", l: "Balanced" },
                    { v: "full", l: "Full" },
                  ]}
                />
              </Group>

              {/* Group */}
              <Group title="Your group">
                <div className="space-y-4">
                  <Field label="Who's travelling">
                    <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-3">
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
                    </div>
                    <p className="mt-1.5 text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                      {compositionReady
                        ? formatCompositionSummary(composition)
                        : "Add an age for every child so we can price honestly."}
                    </p>
                  </Field>
                  <Field label="Guide language">
                    <Segmented
                      value={language}
                      onChange={setLanguage}
                      options={[
                        { v: "en", l: "EN" },
                        { v: "pt", l: "PT" },
                      ]}
                    />
                    <p className="mt-1.5 text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                      Spanish available on request — subject to guide availability.
                    </p>
                  </Field>
                </div>
              </Group>

              {/* Truthful Blueprint — replaces the legacy "Stop variations"
                  panel when we have an accurate Core / Choice / Optional
                  breakdown for this tour. */}
              {blueprint && (
                <Group title="What's included">
                  <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-4 -mt-1">
                    {blueprint.copy?.footnote}
                  </p>

                  {/* Core (default-included; markets, viewpoints & lunches
                      can be skipped so the guide re-shapes the day). */}
                  <p className="mb-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--teal)]">
                    Included by default
                  </p>
                  <p className="text-[12px] text-[color:var(--charcoal-soft)] mb-2">
                    Skip any stop you'd rather trade for time elsewhere — your guide will suggest an
                    alternative or extend the next stop.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0 mb-5">
                    {blueprint.core.map((s) => {
                      const canSkip = !s.lock;
                      const isSkipped = skippedCore.has(s.id);
                      if (!canSkip && s.lock) {
                        const reason = s.lock.customerFacingReason;
                        return (
                          <li
                            key={s.id}
                            className="flex items-stretch gap-3 border border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5 min-h-[56px]"
                            data-lock-reason={s.lock.reasonCode}
                          >
                            <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                              <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                                {s.label}
                              </span>
                              <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mt-1">
                                Signature anchor
                              </span>
                              <span className="text-[12.5px] leading-snug text-[color:var(--charcoal-soft)] mt-1">
                                {reason}
                              </span>
                            </span>
                            <span
                              className="w-9 flex items-center justify-center bg-[color:var(--teal)] text-[color:var(--ivory)]"
                              aria-label={reason}
                              title={reason}
                            >
                              <Lock size={12} />
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => tryToggleSkippedCore(s.id)}
                            aria-pressed={!isSkipped}
                            className={[
                              "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[56px]",
                              isSkipped
                                ? "border-[color:var(--border)] bg-transparent"
                                : "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5",
                            ].join(" ")}
                          >
                            <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                              <span
                                className={[
                                  "text-[13px] leading-snug",
                                  isSkipped
                                    ? "text-[color:var(--charcoal-soft)] line-through"
                                    : "text-[color:var(--charcoal)]",
                                ].join(" ")}
                              >
                                {s.label}
                              </span>
                              <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mt-1">
                                {isSkipped ? "Skipped · time freed" : "Tap to skip"}
                              </span>
                            </span>
                            <span
                              className={[
                                "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                isSkipped ? "bg-[color:var(--border)]" : "bg-[color:var(--teal)]",
                              ].join(" ")}
                              aria-hidden
                            >
                              {isSkipped ? "+" : <Check size={14} />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Choice pool */}
                  {blueprint.choice && (
                    <>
                      <p className="mb-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal)]">
                        {blueprint.choice.label}
                      </p>
                      <p className="text-[12px] text-[color:var(--charcoal-soft)] mb-2">
                        {blueprint.choice.note}
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0 mb-5">
                        {blueprint.choice.options.map((o) => {
                          const on = choiceSelected.has(o.id);
                          // Soft cap: only hard-disable at pickMax. Between
                          // pickMin and pickMax the feasibility engine (via
                          // tryToggleChoice) decides whether the day absorbs
                          // the extra winery.
                          const atLimit = !on && choiceSelected.size >= blueprint.choice!.pickMax;
                          return (
                            <li key={o.id}>
                              <button
                                type="button"
                                disabled={atLimit}
                                onClick={() => tryToggleChoice(o.id)}
                                aria-pressed={on}
                                className={[
                                  "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[56px]",
                                  on
                                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                                    : "border-[color:var(--border)]",
                                  atLimit ? "opacity-50 cursor-not-allowed" : "",
                                ].join(" ")}
                              >
                                <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                                  <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                                    {o.label}
                                  </span>
                                  {o.blurb && (
                                    <span className="text-[12px] text-[color:var(--charcoal-soft)] mt-0.5">
                                      {o.blurb}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={[
                                    "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                    on ? "bg-[color:var(--gold)]" : "bg-[color:var(--border)]",
                                  ].join(" ")}
                                  aria-hidden
                                >
                                  {on ? <Check size={14} /> : "+"}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {/* Optional (subject to time & availability) */}
                  {blueprint.optional.length > 0 && (
                    <>
                      <p className="mb-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                        Optional · subject to time & availability
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0">
                        {blueprint.optional.map((o) => {
                          const on = optionalSelected.has(o.id);
                          return (
                            <li key={o.id}>
                              <button
                                type="button"
                                onClick={() => tryToggleOptional(o.id)}
                                aria-pressed={on}
                                className={[
                                  "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[56px]",
                                  on
                                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                                    : "border-[color:var(--border)]",
                                ].join(" ")}
                              >
                                <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                                  <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                                    {o.label}
                                  </span>
                                  {o.blurb && (
                                    <span className="text-[12px] text-[color:var(--charcoal-soft)] mt-0.5">
                                      {o.blurb}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={[
                                    "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                    on ? "bg-[color:var(--gold)]" : "bg-[color:var(--border)]",
                                  ].join(" ")}
                                  aria-hidden
                                >
                                  {on ? <Check size={14} /> : "+"}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {/* Day timing strip */}
                  {blueprintFeasibility && (
                    <div
                      className={[
                        "mt-5 border px-3 py-2.5 text-[12px]",
                        blueprintFeasibility.feasible
                          ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5 text-[color:var(--charcoal)]"
                          : "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-[color:var(--charcoal)]",
                      ].join(" ")}
                    >
                      <p>
                        <span className="uppercase tracking-[0.12em] text-[12px] mr-2 text-[color:var(--charcoal-soft)]">
                          Day timing
                        </span>
                        ~{Math.round(blueprintFeasibility.totalMinutes / 60)}h of experience
                        {blueprintFeasibility.feasible ? " · fits a full day" : ""}
                      </p>
                      {blueprintFeasibility.warnings.length > 0 && (
                        <ul className="mt-1.5 list-disc pl-4 text-[12.5px] text-[color:var(--charcoal-soft)]">
                          {blueprintFeasibility.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Group>
              )}

              {/* Stops — legacy panel, hidden when a blueprint is present */}
              {!blueprint && (tour.stops ?? []).length > 0 && (
                <Group title="Stop variations">
                  <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-1 -mt-1">
                    Remove a stop you'd rather trade for time elsewhere, or add an optional one
                    listed by the local guide.
                  </p>
                  <p className="mb-3 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal)]">
                    Up to {MAX_EDITS} changes · {editsLeft} left
                  </p>

                  <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0">
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
                            className={[
                              "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[56px]",
                              kept
                                ? "border-[color:var(--teal)]/50 bg-[color:var(--teal)]/5"
                                : "border-[color:var(--border)] opacity-60",
                              disabled ? "cursor-not-allowed" : "",
                            ].join(" ")}
                          >
                            <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                              <span
                                className={[
                                  "text-[13px] leading-snug",
                                  kept
                                    ? "text-[color:var(--charcoal)]"
                                    : "text-[color:var(--charcoal-soft)] line-through",
                                ].join(" ")}
                              >
                                {s.label}
                              </span>
                              <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mt-1">
                                {kept ? "Included" : "Removed"}
                              </span>
                            </span>
                            <span
                              className={[
                                "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                kept ? "bg-[color:var(--teal)]" : "bg-[color:var(--border)]",
                              ].join(" ")}
                              aria-hidden
                            >
                              {kept ? <Check size={14} /> : "–"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Optional add-able stops from Viator (passBy=true) */}
                  {optionalStops.length > 0 && (
                    <>
                      <p className="mt-5 mb-2 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                        Curated add-ons for this journey
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0">
                        {optionalStops.map((label) => {
                          const on = added.has(label);
                          const disabled = !on && editsLeft === 0;
                          return (
                            <li key={"add:" + label}>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggle(setAdded, added, label)}
                                aria-pressed={on}
                                className={[
                                  "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[56px]",
                                  on
                                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                                    : "border-[color:var(--border)]",
                                  disabled ? "opacity-50 cursor-not-allowed" : "",
                                ].join(" ")}
                              >
                                <span className="flex-1 px-3 py-2.5 flex flex-col justify-center">
                                  <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                                    {label}
                                  </span>
                                  <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mt-1">
                                    {on ? "Added" : "Optional"}
                                  </span>
                                </span>
                                <span
                                  className={[
                                    "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                    on ? "bg-[color:var(--gold)]" : "bg-[color:var(--border)]",
                                  ].join(" ")}
                                  aria-hidden
                                >
                                  {on ? <Check size={14} /> : "+"}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </Group>
              )}

              {/* Included service only — optional products must come from
                  explicit supplier data, never title/keyword heuristics. */}
              <Group title="Pickup">
                <div className="mb-3 inline-flex items-center gap-2 border border-[color:var(--teal)]/40 bg-[color:var(--teal)]/8 px-2.5 py-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--teal)]">
                  <Check size={12} /> Hotel pickup included
                </div>
              </Group>

              {/* Accessibility / comfort */}
              <Group title="Accessibility & comfort">
                <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                  Tell us anything that helps your guide prepare.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "mobility", l: "Mobility support" },
                    { id: "stroller", l: "Stroller / pram" },
                    { id: "child-seat", l: "Child seat" },
                    { id: "vegetarian", l: "Vegetarian / vegan" },
                    { id: "allergies", l: "Allergies" },
                    { id: "quiet", l: "Quiet pace" },
                  ].map((c) => {
                    const on = accessibility.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(setAccessibility, accessibility, c.id)}
                        aria-pressed={on}
                        className={[
                          "px-3 py-2 text-[12px] border transition-colors min-h-[40px]",
                          on
                            ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                            : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                        ].join(" ")}
                      >
                        {c.l}
                      </button>
                    );
                  })}
                </div>
              </Group>

              {/* Notes */}
              <Group title="Anything else?">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Anniversary, kids' ages, mobility needs, languages spoken at home…"
                  className="w-full bg-transparent border border-[color:var(--border)] px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--gold)] resize-none"
                />
              </Group>

              {/* 5 · Human guidance */}
              <div className="bg-[color:var(--sand)]/60 border border-[color:var(--border)] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--gold)] text-[color:var(--gold)] shrink-0">
                    <MessageCircle size={14} />
                  </span>
                  <div>
                    <p className="serif text-[17px] leading-snug">Need help deciding?</p>
                    <p className="text-[13px] text-[color:var(--charcoal-soft)] mt-1 leading-relaxed">
                      A local is available in real time. We'll suggest the right pace and add-ons
                      for your group.
                    </p>
                    <a
                      href={whatsappHref(
                        `Hi YES — I'd like to talk to a local about the ${tour.title}.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        gaGenerateLead({ leadSource: "tailor_talk_to_local", method: "whatsapp" })
                      }
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
                    >
                      <MessageCircle size={13} /> Talk to a local
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 4 · LIVE SUMMARY (sticky on desktop) ─── */}
            <aside className="lg:sticky lg:top-24">
              {import.meta.env?.DEV && validation.hasViatorMeta && validation.issueCount > 0 && (
                <div className="mb-3 border border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)]/40 p-3 text-[12px] text-[color:var(--charcoal)]">
                  <p className="font-semibold uppercase tracking-[0.12em] text-[12px] text-[color:var(--charcoal-soft)] mb-1">
                    Viator validation · {validation.issueCount} mismatch
                    {validation.issueCount === 1 ? "" : "es"}
                  </p>
                  {validation.stops.onlyInternal.length > 0 && (
                    <p>Stops not on Viator: {validation.stops.onlyInternal.join(", ")}</p>
                  )}
                  {validation.stops.onlyViator.length > 0 && (
                    <p>Stops missing from tour: {validation.stops.onlyViator.join(", ")}</p>
                  )}
                  {validation.included.onlyInternal.length > 0 && (
                    <p>Inclusions not on Viator: {validation.included.onlyInternal.join(", ")}</p>
                  )}
                  {validation.included.onlyViator.length > 0 && (
                    <p>Inclusions missing from tour: {validation.included.onlyViator.join(", ")}</p>
                  )}
                  <Link to="/admin/viator-validation" className="mt-1 inline-block underline">
                    Open full report →
                  </Link>
                </div>
              )}
              <div className="bg-[color:var(--card)] border border-[color:var(--border)] overflow-hidden">
                <div className="px-5 py-4 bg-[color:var(--charcoal-deep)] text-[color:var(--ivory)] flex items-center justify-between">
                  <Eyebrow tone="onDark">Live summary</Eyebrow>
                  <span className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--gold-soft)]">
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--gold)] opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--gold)]" />
                    </span>
                    Updating
                  </span>
                </div>

                <div className="p-5 space-y-4 text-[13px]">
                  <SummaryRow label="Date" value={date || "Flexible — confirm with guide"} />
                  <SummaryRow
                    label="Timing"
                    value={`${pickup} → ~${estimatedReturn} · ~${formatHours(estimatedHours)}`}
                  />
                  <SummaryRow label="Pace" value={cap(pace)} />
                  <SummaryRow
                    label="Guests"
                    value={`${formatCompositionSummary(composition)} · ${language.toUpperCase()}`}
                  />

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                      Itinerary ({summaryStops.length} of {summaryTotal})
                    </p>
                    <ol className="mt-2 space-y-1.5 list-none p-0">
                      {summaryStops.map((s, i) => (
                        <li key={s.label + i} className="flex gap-2.5">
                          <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal)] w-5 shrink-0 mt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[13px] leading-snug">{s.label}</span>
                        </li>
                      ))}
                      {summaryStops.length === 0 && (
                        <li className="text-[12px] italic text-[color:var(--charcoal-soft)]">
                          Add at least one stop back.
                        </li>
                      )}
                    </ol>
                  </div>

                  {showBandBreakdown && (
                    <PriceBreakdownRows
                      journeyLines={journeyLines}
                      label="Travellers"
                      testId="tailor-price-breakdown"
                    />
                  )}

                  {/* Add lunch — offered only where the canonical product
                      genuinely excludes it (never on the picnic, the winery
                      lunch or the all-inclusive wine day). */}
                  {rules.allowAddLunch && (
                    <button
                      type="button"
                      onClick={() => setLunchAdded((v) => !v)}
                      aria-pressed={lunchAdded}
                      data-testid="tailor-add-lunch"
                      className={[
                        "w-full flex items-center justify-between gap-3 border px-3 py-2.5 text-left transition-colors min-h-[52px]",
                        lunchAdded
                          ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                          : "border-[color:var(--border)]",
                      ].join(" ")}
                    >
                      <span className="flex flex-col">
                        <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                          Add lunch
                        </span>
                        <span className="text-[12px] text-[color:var(--charcoal-soft)] mt-0.5">
                          {lunchAdded
                            ? "Added to your day"
                            : "Lunch is not included in this Signature"}
                        </span>
                      </span>
                      <span className="text-[12px] tabular-nums text-[color:var(--charcoal)] whitespace-nowrap">
                        +<PriceEur amountEur={TAILOR_LUNCH_SUPPLEMENT_EUR} role="per-person" /> pp
                      </span>
                    </button>
                  )}

                  {/* Remove the INCLUDED lunch — Arrábida Wine only.
                      Rendered outside the stop list on purpose: this is a
                      flat −€15 pp credit, not a −5% stop removal, and it
                      never unlocks the 4th winery. */}
                  {rules.allowRemoveLunch && (
                    <button
                      type="button"
                      onClick={() => toggleIncludedLunch()}
                      aria-pressed={lunchRemoved}
                      data-testid="tailor-remove-lunch"
                      className={[
                        "w-full flex items-center justify-between gap-3 border px-3 py-2.5 text-left transition-colors min-h-[52px]",
                        lunchRemoved
                          ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10"
                          : "border-[color:var(--border)]",
                      ].join(" ")}
                    >
                      <span className="flex flex-col">
                        <span className="text-[13px] leading-snug text-[color:var(--charcoal)]">
                          {lunchRemoved ? "Restore included lunch" : "Remove included lunch"}
                        </span>
                        <span className="text-[12px] text-[color:var(--charcoal-soft)] mt-0.5">
                          {lunchRemoved
                            ? "The day runs without the seated lunch."
                            : (rules.lunchIncludedNote ??
                              "A seated lunch is included in this Signature.")}
                        </span>
                      </span>
                      <span className="text-[12px] tabular-nums text-[color:var(--teal)] whitespace-nowrap">
                        −
                        <PriceEur
                          amountEur={TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR}
                          role="per-person"
                        />{" "}
                        pp
                      </span>
                    </button>
                  )}

                  {/* Truthful per-person + party-total split. "Indicative
                      total / adult" was misread as a party total; use the
                      same two-line shape as the Signature price card. */}
                  <div className="pt-3 border-t border-[color:var(--border)] space-y-1.5">
                    <div className="flex items-center justify-end">
                      <PriceCurrencyChip align="end" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                        For {guests} {guests === 1 ? "guest" : "guests"} · per person
                      </span>
                      <span className="serif text-[1.15rem] text-[color:var(--charcoal)] tabular-nums inline-flex items-baseline gap-2">
                        {savingsEur > 0 && (
                          <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--teal)] not-italic">
                            −<PriceEur amountEur={savingsEur} role="per-person" /> pp
                          </span>
                        )}
                        <PriceEur
                          amountEur={Math.round(displayTotalEur / Math.max(1, guests))}
                          role="per-person"
                        />
                        <span className="ml-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                          / pp
                        </span>
                      </span>
                    </div>
                    {supplementsPerPax > 0 && (
                      <p className="text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                        Includes <PriceEur amountEur={supplementsPerPax} role="per-person" /> pp of
                        additions.
                      </p>
                    )}
                    {principalsRemoved > 0 && (
                      <p className="text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                        Adjusted from <PriceEur amountEur={basePerPax} role="per-person" /> —{" "}
                        {principalsRemoved} stop{principalsRemoved === 1 ? "" : "s"} removed.
                      </p>
                    )}
                    {lunchRemovalPerPax > 0 && (
                      <p
                        data-testid="tailor-lunch-removal-line"
                        className="text-[12px] leading-snug text-[color:var(--teal)]"
                      >
                        Included lunch removed — −
                        <PriceEur amountEur={lunchRemovalPerPax} role="per-person" /> pp (
                        <PriceEur amountEur={lunchRemovalPerPax * guests} role="party-total" /> for
                        your party).
                      </p>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                        Party total (indicative)
                      </span>
                      <span className="serif text-[1.4rem] text-[color:var(--charcoal)] tabular-nums">
                        <PriceEur amountEur={Math.round(displayTotalEur)} role="party-total" />
                      </span>
                    </div>
                    <p className="text-[12px] leading-snug text-[color:var(--charcoal-soft)]">
                      Final total confirmed at checkout in euros.
                    </p>
                  </div>

                  {/* Confirmation status is always instant on Tailor —
                      manual gate retired per owner (test-mode + memory:
                      instant confirmation everywhere except Corporate). */}
                  <p className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--teal)] inline-flex items-center gap-1.5">
                    <Check size={12} /> Confirmation status: ready
                  </p>

                  {wineExtension.extra > 0 && removableCoreLabels.length > 0 && (
                    <p className="mt-2 text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                      To fit this longer wine day you can remove{" "}
                      <span className="text-[color:var(--charcoal)]">
                        {removableCoreLabels.slice(0, 3).join(", ")}
                      </span>{" "}
                      — or keep them and we'll confirm timing with your guide.
                    </p>
                  )}

                  {showMinorsWineAdvisory && (
                    <p className="mt-2 text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                      Wine tasting is offered to adults only — minors visit the estate without
                      tasting.
                    </p>
                  )}
                </div>

                {/* 6 · CTA — instant Stripe checkout, or request confirmation
                    when the selection is beyond the Signature baseline. */}
                <div className="p-5 pt-0">
                  <button
                    type="button"
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
                    className="inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 disabled:cursor-not-allowed text-[color:var(--ivory)] px-5 py-4 text-sm tracking-wide transition-all min-h-[52px]"
                  >
                    {checkoutPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Opening checkout…
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Reserve securely
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)] text-center">
                    Instant confirmation
                  </p>
                  <p className="mt-1 inline-flex w-full items-center justify-center gap-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]/80">
                    <Lock size={10} /> Secure checkout
                  </p>
                  <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)] text-center leading-relaxed">
                    {CANCELLATION.custom.en}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[12px] italic text-[color:var(--charcoal-soft)] leading-relaxed flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-[color:var(--gold)]" />
                Looking for full freedom? You can{" "}
                <Link
                  to="/studio-v3"
                  className="not-italic underline decoration-[color:var(--gold)] underline-offset-2 hover:text-[color:var(--teal)]"
                >
                  open the Studio
                </Link>{" "}
                and build a day from scratch instead.
              </p>
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
