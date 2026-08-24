/**
 * FinalRevealStory — cinematic editorial reveal of the day the traveller
 * just refined. Sits between the refine/storyboard phase and Guest Details.
 *
 * Story-first, admin-chrome-free. Add-ons and price live inside a single
 * collapsible "See what's included" details block. Two CTAs: primary
 * "Make this my story in Portugal" (advance to Guest Details), secondary
 * "Save my signature" (hand off to the parent's save handler). Tertiary
 * text link back to refine.
 *
 * Confirmation language: because date selection guarantees availability,
 * every stop and addition shown here is confirmed instantly. Never use
 * "to be confirmed" / "pending" copy on this surface.
 */

import * as React from "react";
import { useEffect } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { findTour } from "@/data/signatureTours";
import { getTourContent } from "@/lib/tourContent";
import { pickupCityLabel } from "./curation";
import {
  CTA_BACK_TO_REFINE,
  CTA_CONTINUE_TO_GUEST_DETAILS,
  CTA_SAVE_SIGNATURE,
  CTA_SEE_INCLUSIONS,
  INCLUSION_HEADER,
  INSTANT_CONFIRMATION,
} from "@/content/signature-day-copy";
import { PriceBreakdownRows } from "@/components/checkout/PriceBreakdownRows";
import { PerPersonBands } from "@/components/checkout/PerPersonBands";
import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";
import { cn } from "@/lib/utils";
import { formatGuestComposition } from "./formatGuests";
import { buildRevealNarrative } from "@/lib/studio-v3/revealNarrative";
import { trackStudio } from "@/lib/studio-analytics";
import { resolvePriceChangeFactors } from "./priceChangeFactors";


import parchmentLetter from "@/assets/studio-v3/reveal-letter-parchment.jpg";

// Friendly region label rendered in the reveal title.
const REGION_LABELS: Record<string, string> = {
  arrabida: "the Arrábida",
  "arrabida-setubal": "the Arrábida",
  sintra: "Sintra & the Atlantic coast",
  "lisbon-coast": "Sintra & the Atlantic coast",
  lisbon: "Lisbon",
  alentejo: "the Alentejo",
  douro: "the Douro",
  centro: "central Portugal",
};
export function regionLabelFor(intent: string | null | undefined): string {
  if (!intent) return "Portugal";
  return REGION_LABELS[intent.toLowerCase()] ?? "Portugal";
}

// The deterministic narrative now lives in `buildRevealNarrative`, which
// reasons through the single Living Atlas bridge instead of branching on
// one answer. See src/lib/studio-v3/revealNarrative.ts.

// Rotating editorial connectives for middle stops. Kept short and quiet.
const MIDDLE_OPENERS = [
  "Then you'll continue towards",
  "Along the way,",
  "As the afternoon opens,",
  "Later,",
  "From there,",
];

function stopSentence(index: number, isLast: boolean, label: string, story: string): string {
  const body = story?.trim() ? ` ${story.trim()}` : "";
  if (index === 0) return `You'll start your day in ${label}.${body}`;
  if (isLast) return `To close the day, ${label}.${body}`;
  const opener = MIDDLE_OPENERS[(index - 1) % MIDDLE_OPENERS.length];
  const glue = opener.endsWith(",") ? " " : " ";
  return `${opener}${glue}${label}.${body}`;
}

// Themed continuation for add-on integration into the narrative.
function addOnContinuation(label: string): string {
  const l = label.toLowerCase();
  if (/(boat|sail|yacht|sea|ocean)/.test(l)) return "the sea";
  if (/(helicopter|heli|flight|aerial)/.test(l)) return "the coast seen from above";
  if (/(chef|dinner|tasting|table|lunch|wine)/.test(l)) return "a long, quiet table";
  if (/(photo|photograph)/.test(l)) return "moments you'll want to keep";
  if (/(spa|massage|wellness)/.test(l)) return "an hour that belongs only to you";
  if (/(horse|ride|equestr)/.test(l)) return "the country at a slower pace";
  if (/(picnic|hamper)/.test(l)) return "a table set under open sky";
  return "something quieter, made just for you";
}

export interface FinalRevealStoryProps {
  readonly state: StudioV3State;
  readonly selectedAddOns: SelectedAddOnSummary["items"];
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
  /**
   * Canonical age-banded per-traveller lines from `useResolvedJourney`.
   * When present, the inclusions drawer renders one row per adult/child
   * with the band-adjusted unit price before the total. Null → adults-only
   * flat pricing.
   */
  readonly journeyLines?:
    | import("@/lib/checkout/journeyDisplay").CheckoutJourneyLine[]
    | readonly import("@/lib/checkout/journeyDisplay").CheckoutJourneyLine[]
    | null;
  readonly onContinue: () => void;
  readonly onSaveSignature: () => void;
  readonly onBack: () => void;
  readonly saving?: boolean;
  readonly className?: string;
  readonly testId?: string;
  /**
   * The stops the traveller actually composed (from resolveStudioV3Route
   * in StudioV3). Used as the storytelling source when the traveller did
   * not refine (editedRoutePoints === null). Prevents the reveal from
   * listing every stop in the wider Signature catalog.
   */
  readonly composedStops?: ReadonlyArray<{ label: string; story: string }>;
}

function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

export function FinalRevealStory({
  state,
  selectedAddOns,
  perPaxEur,
  totalEur,
  journeyLines,
  onContinue,
  onSaveSignature,
  onBack,
  saving = false,
  className,
  testId,
  composedStops,
}: FinalRevealStoryProps) {
  const tour = state.tourId ? findTour(state.tourId) : null;
  const title = state.journeyTitle ?? tour?.title ?? "Your private Portugal day";

  // Defensive: when this reveal mounts (phase transition into storytelling),
  // reset window scroll to the top so the parchment header is guaranteed to
  // paint above the fold on mobile — regression fix for the "reveal renders
  // blank on 393×588" audit finding (walker landed scrolled below the letter).
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Editorial timeline — always reflect the traveller's kept set.
  // Priority: refined stops (editedRoutePoints) → composed stops (what
  // Studio actually surfaced pre-refine) → tour catalog (deep-link edge
  // case only). Never widen beyond what the traveller was shown.
  const keptStops =
    state.editedRoutePoints && state.editedRoutePoints.length > 0
      ? state.editedRoutePoints
      : composedStops && composedStops.length > 0
        ? composedStops
        : (tour?.stops ?? []).map((s) => ({ label: s.label, story: s.story ?? "" }));
  const stops = keptStops.map((s) => ({ label: s.label, story: s.story }));

  // One real photograph opens the reveal: the first kept moment when the
  // catalog holds an image for it, otherwise the tour's own hero. Never a
  // stock or generated image, and never a blocker — if nothing resolves,
  // the reveal simply stays text-first.
  const openingStopLabel = stops[0]?.label ?? null;
  const openingCatalogStop = openingStopLabel
    ? (tour?.stops ?? []).find(
        (s) => s.label.toLowerCase().trim() === openingStopLabel.toLowerCase().trim(),
      )
    : undefined;
  const openingImage = openingCatalogStop ? stopImage(openingCatalogStop) : (tour?.img ?? null);
  const openingAlt = openingCatalogStop
    ? `${openingCatalogStop.label}, ${tour?.region ?? "Portugal"}`
    : tour
      ? `${tour.title}, ${tour.region ?? "Portugal"}`
      : "";

  const region = regionLabelFor(state.destinationIntent);
  const narrative = buildRevealNarrative({
    feeling: state.feeling,
    interests: state.interests,
    rhythm: state.rhythm,
    destinationIntent: state.destinationIntent,
    refinement: state.refinement,
    region,
    addOnLabels: selectedAddOns.map((a) => a.label),
  });
  const intro = narrative.intro;

  // Privacy-safe reveal analytics: tour id + signal count only, never PII.
  const signalCount = narrative.signals.length;
  const analyticsTourId = state.tourId ?? null;
  useEffect(() => {
    void import("@/lib/analytics-ga4").then((m) =>
      m.gaStudioFinalRevealViewed({ tourId: analyticsTourId, signalCount }),
    );
  }, [analyticsTourId, signalCount]);

  const handleContinue = () => {
    void import("@/lib/analytics-ga4").then((m) =>
      m.gaStudioFinalCtaInitiated({ tourId: analyticsTourId }),
    );
    onContinue();
  };

  // Weave add-ons into the narrative. Distribute them evenly across stops
  // (after which stop each add-on appears). If we have more add-ons than
  // stops, remaining ones tail the final stop.
  type Paragraph =
    | { kind: "stop"; text: string; key: string }
    | { kind: "addon"; text: string; key: string };
  const paragraphs: Paragraph[] = [];
  const addOnQueue = selectedAddOns.map((a, i) => ({ a, i }));
  const insertionPoints =
    stops.length > 1
      ? addOnQueue.map((_, idx) =>
          Math.min(
            stops.length - 1,
            Math.floor((idx + 1) * (stops.length / (addOnQueue.length + 1))),
          ),
        )
      : addOnQueue.map(() => 0);

  stops.forEach((s, i) => {
    const isLast = i === stops.length - 1;
    paragraphs.push({
      kind: "stop",
      text: stopSentence(i, isLast, s.label, s.story),
      key: `stop-${i}-${s.label}`,
    });
    addOnQueue.forEach(({ a, i: ai }, qIdx) => {
      if (insertionPoints[qIdx] === i) {
        paragraphs.push({
          kind: "addon",
          text: `Because you've chosen the ${a.label}, this is where your day opens to ${addOnContinuation(a.label)}.`,
          key: `addon-${ai}-${a.id}`,
        });
      }
    });
  });

  // Never show an empty date. When the traveller stayed flexible we say so
  // explicitly — silence reads as a bug, "Flexible date" reads as a choice.
  const dateLabel =
    formatDate(state.dateExact) ??
    (state.dateMode === "flexible"
      ? "Flexible date"
      : state.dateMode === "undecided"
        ? "Date to confirm"
        : null);
  const pickupLabel = pickupCityLabel(state.pickup);
  const guestsLabel = formatGuestComposition(state.adults, state.minorAges, state.guests);
  const partySize =
    typeof state.guests === "number" && state.guests > 0
      ? state.guests
      : (state.adults ?? 0) + (state.minorAges?.length ?? 0) || 1;

  // Only real, product-backed price factors are disclosed.
  const priceFactors = React.useMemo(
    () => resolvePriceChangeFactors({ tour, selectedAddOns }),
    [tour, selectedAddOns],
  );
  // `price_expanded` is a once-per-mounted-reveal signal, not a toggle count.
  const priceExpandedTracked = React.useRef(false);


  const included: string[] = (() => {
    if (tour?.id) {
      const c = getTourContent(tour.id);
      if (c.included.length > 0) return c.included;
    }
    if (tour?.included && tour.included.length > 0) return tour.included;
    return [
      "Private licensed guide",
      "Private door-to-door transport",
      "All confirmed entries listed above",
    ];
  })();

  return (
    <section
      data-testid={testId ?? "studio-v3-final-reveal"}
      data-studio-v3-screen="storytelling"
      aria-labelledby="studio-v3-final-reveal-title"
      className={cn(
        "w-full max-w-[620px] mx-auto px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+7rem)]",
        className,
      )}
    >
      {/* Editorial "letter from a book" card */}
      <article
        data-testid="studio-v3-final-reveal-letter"
        className="relative overflow-hidden rounded-[6px]"
        style={{
          background: "var(--ivory)",
          border: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
          boxShadow:
            "0 1px 0 color-mix(in oklab, var(--charcoal) 6%, transparent), 0 24px 60px -32px color-mix(in oklab, var(--charcoal) 32%, transparent)",
        }}
      >
        {/* Parchment top-plate — the paper the story is written on.
            Mobile keeps a shorter 8:3 aspect so the editorial title and
            first chapter of the reveal sit above the fold on 393×588
            viewports (regression fix for audit BLOCKER #1). Desktop keeps
            the taller 5:3 crop for cinematic weight. */}
        <div className="relative w-full aspect-[8/3] sm:aspect-[5/3]">
          <img
            src={parchmentLetter}
            alt="Handwritten letter on aged parchment paper, sealed in deep teal wax"
            width={1200}
            height={720}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24"
            style={{
              background: "linear-gradient(to bottom, transparent, var(--ivory))",
            }}
          />
        </div>

        {/* Letter body */}
        <div className="px-6 pt-2 pb-10 sm:px-9">
          {/* Hero */}
          <header className="text-center">
            <Eyebrow>Your Signature</Eyebrow>
            <h2
              id="studio-v3-final-reveal-title"
              data-testid="studio-v3-final-reveal-headline"
              className="mt-3 text-[26px] leading-[1.15] [text-wrap:balance]"
              style={{
                fontFamily: "var(--font-editorial)",
                color: "var(--charcoal)",
                fontWeight: 500,
              }}
            >
              Your{" "}
              <span className="italic" style={{ color: "var(--teal)" }}>
                Portugal
              </span>{" "}
              is ready.
            </h2>
            <p
              className="mt-3 text-[13.5px] leading-[1.6] mx-auto max-w-[38ch]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
            >
              A private day shaped from what matters to you.
            </p>
            {dateLabel || guestsLabel || pickupLabel ? (
              <p
                data-testid="studio-v3-final-reveal-facts"
                className="mt-4 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                {[region, dateLabel, pickupLabel, guestsLabel].filter(Boolean).join(" · ")}
              </p>
            ) : (
              <p
                data-testid="studio-v3-final-reveal-facts"
                className="mt-4 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                {region}
              </p>
            )}
            {narrative.signals.length > 0 ? (
              <ul
                data-testid="studio-v3-final-reveal-signals"
                className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
              >
                {narrative.signals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-full border px-3 py-1.5 text-[11px] leading-[1.3]"
                    style={{
                      color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                      borderColor: "color-mix(in oklab, var(--gold) 50%, transparent)",
                      background: "color-mix(in oklab, var(--gold) 7%, transparent)",
                    }}
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            ) : null}
            <span
              aria-hidden
              className="mt-6 inline-block h-px w-16"
              style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
            />
          </header>

          {/* Narrative — one flowing story, no list, no chapter markers */}
          <div
            className="mt-8 space-y-5 mx-auto max-w-[54ch]"
            data-testid="studio-v3-final-reveal-timeline"
          >
            <p
              className="text-[15.5px] leading-[1.75] [text-wrap:pretty]"
              style={{
                fontFamily: "var(--font-editorial)",
                color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
              }}
            >
              {intro}
            </p>
            {paragraphs.map((p) => (
              <p
                key={p.key}
                className={cn(
                  "text-[15px] leading-[1.75] [text-wrap:pretty]",
                  p.kind === "addon" && "italic",
                )}
                style={{
                  fontFamily: "var(--font-editorial)",
                  color:
                    p.kind === "addon"
                      ? "var(--teal)"
                      : "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                }}
              >
                {p.text}
              </p>
            ))}
          </div>
        </div>
      </article>

      {/* Reassurance — replaces removed pending/status copy */}
      <p
        className="mt-10 text-center text-[12.5px] italic"
        style={{
          fontFamily: "var(--font-editorial)",
          color: "color-mix(in oklab, var(--charcoal) 68%, transparent)",
        }}
      >
        {INSTANT_CONFIRMATION}
      </p>

      {/* The investment is a decision-critical fact, so it stays visible.
          Detailed inclusions remain progressive disclosure below. */}
      {totalEur != null ? (
        <div
          data-testid="studio-v3-final-reveal-investment"
          className="mt-7 px-4 py-4 text-center rounded-[4px]"
          style={{
            background: "color-mix(in oklab, var(--gold) 10%, var(--ivory))",
            border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.24em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
          >
            {`Estimated for ${partySize} ${partySize === 1 ? "guest" : "guests"}`}
          </p>
          <p
            className="mt-1 text-[25px] leading-none tabular-nums"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
          >
            {formatEur(totalEur)}
          </p>
          <div
            className="mt-1.5 text-[11px] font-semibold tabular-nums leading-[1.7]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 66%, transparent)" }}
          >
            <PerPersonBands
              journeyLines={journeyLines}
              adultUnitEur={perPaxEur}
              testId="studio-v3-reveal-final-per-person"
            />
          </div>

          {priceFactors.length > 0 ? (
            <details
              data-testid="studio-v3-price-change-factors"
              className="mt-3 text-left"
              onToggle={(e) => {
                if (!(e.currentTarget as HTMLDetailsElement).open) return;
                if (priceExpandedTracked.current) return;
                priceExpandedTracked.current = true;
                trackStudio("price_expanded", { phase: "confirmation", guests: partySize });
              }}
            >
              <summary
                className="min-h-[44px] flex items-center justify-center cursor-pointer text-[11px] uppercase tracking-[0.2em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ color: "var(--teal)" }}
              >
                What can change this price
              </summary>
              <ul
                className="mt-2 space-y-1.5 text-[12px] leading-[1.6] list-disc pl-5"
                style={{ color: "color-mix(in oklab, var(--charcoal) 74%, transparent)" }}
              >
                {priceFactors.map((f) => (
                  <li key={f.id} data-price-factor={f.id}>
                    {f.text}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

        </div>
      ) : null}


      {/* Collapsible inclusions + price */}
      <details
        className="mt-8 border-t border-b py-4"
        style={{ borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
        data-testid="studio-v3-final-reveal-inclusions"
      >
        <summary
          className="cursor-pointer list-none flex items-center justify-between text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "var(--charcoal)" }}
        >
          <span>{CTA_SEE_INCLUSIONS}</span>
          <span aria-hidden style={{ color: "var(--gold)" }}>
            +
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              {INCLUSION_HEADER}
            </p>
            <ul className="space-y-1.5 text-[13.5px]" style={{ color: "var(--charcoal)" }}>
              {included.map((it) => (
                <li key={it}>· {it}</li>
              ))}
            </ul>
          </div>
          {selectedAddOns.length > 0 ? (
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.22em] mb-2"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                Your additions
              </p>
              <ul
                className="space-y-1.5 text-[13.5px]"
                style={{ color: "var(--charcoal)" }}
                data-testid="studio-v3-add-on-lines"
              >
                {selectedAddOns.map((a) => {
                  const guests =
                    typeof state.guests === "number" && state.guests > 0 ? state.guests : 1;
                  const isPerPerson = a.unit === "per_person";
                  const showQty = isPerPerson && guests > 1;
                  return (
                    <li
                      key={a.id}
                      data-testid="studio-v3-add-on-line"
                      data-addon-id={a.id}
                      data-per-unit-eur={a.perUnit}
                      data-amount-eur={a.amount}
                      data-unit={a.unit}
                      className="flex justify-between gap-3"
                    >
                      <span className="min-w-0">
                        · {a.label}
                        <span
                          className="ml-1 tabular-nums"
                          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                        >
                          {showQty ? `(${formatEur(a.perUnit)} × ${guests})` : `(${a.unitLabel})`}
                        </span>
                      </span>
                      <span
                        className="text-right tabular-nums font-medium"
                        style={{ color: "var(--charcoal)" }}
                      >
                        {formatEur(a.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <PriceBreakdownRows
            journeyLines={journeyLines ?? null}
            label="Travellers"
            testId="studio-v3-reveal-price-breakdown"
          />

          <div
            className="pt-3 border-t flex justify-between items-baseline"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <span
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "var(--charcoal)" }}
            >
              Total
            </span>
            <span
              className="text-[20px] tabular-nums"
              style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            >
              {formatEur(totalEur)}
            </span>
          </div>
          <div
            className="flex justify-end text-[11px] uppercase tracking-[0.2em] text-right leading-[1.6]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            <PerPersonBands
              journeyLines={journeyLines}
              adultUnitEur={perPaxEur}
              testId="studio-v3-reveal-inclusions-per-person"
            />
          </div>
        </div>
      </details>

      {/* CTAs — primary continue + ghost save (P1 audit #5: Save moves
          from right-aligned gold underline to a peer ghost pill beside
          the primary so both share the pill family and the primary
          voice reads first). Back stays tertiary. */}
      <div className="mt-8 flex flex-col items-stretch gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleContinue}
            data-testid="studio-v3-final-reveal-continue"
            className="flex-1 min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full px-6 text-[13px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-colors"
            style={{ background: "var(--gold)", color: "var(--charcoal)" }}
          >
            {CTA_CONTINUE_TO_GUEST_DETAILS}
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={onSaveSignature}
            disabled={saving}
            data-testid="studio-v3-final-reveal-save"
            className="sm:flex-none min-h-[52px] inline-flex items-center justify-center rounded-full border px-6 text-[12px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-60 transition-colors"
            style={{
              color: "var(--teal)",
              borderColor: "color-mix(in oklab, var(--teal) 45%, transparent)",
              background: "transparent",
            }}
          >
            {saving ? "Saving…" : CTA_SAVE_SIGNATURE}
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          data-testid="studio-v3-final-reveal-back"
          className="w-full min-h-[44px] inline-flex items-center justify-center text-[12.5px] tracking-[0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          }}
        >
          ← {CTA_BACK_TO_REFINE}
        </button>
      </div>
    </section>
  );
}

export default FinalRevealStory;
