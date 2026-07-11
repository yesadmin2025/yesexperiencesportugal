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
import { pickupCityLabel } from "./curation";
import {
  CTA_BACK_TO_REFINE,
  CTA_CONTINUE_TO_GUEST_DETAILS,
  CTA_SAVE_SIGNATURE,
  CTA_SEE_INCLUSIONS,
  INCLUSION_HEADER,
  INSTANT_CONFIRMATION,
  REVEAL_TITLE,
} from "@/content/signature-day-copy";
import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";
import { cn } from "@/lib/utils";
import parchmentLetter from "@/assets/studio-v3/reveal-letter-parchment.jpg";

// Roman numerals for chapter markers — the reveal reads like a bound book,
// not a checklist. Falls back to arabic beyond XII so we never render blank.
const ROMAN = [
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII",
];
function romanFor(i: number): string {
  return ROMAN[i] ?? String(i + 1);
}

export interface FinalRevealStoryProps {
  readonly state: StudioV3State;
  readonly selectedAddOns: SelectedAddOnSummary["items"];
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
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
  const stops = keptStops.map((s) => ({
    label: s.label,
    story: s.story,
    kind: "stop" as const,
  }));
  const addOnBeats = selectedAddOns.map((a) => ({
    label: a.label,
    story: "",
    kind: "addition" as const,
  }));
  const timeline = [...stops, ...addOnBeats];

  const dateLabel = formatDate(state.dateExact);
  const pickupLabel = pickupCityLabel(state.pickup);
  const guestsLabel =
    typeof state.guests === "number" && state.guests > 0
      ? state.guests === 1
        ? "1 guest"
        : `${state.guests} guests`
      : null;

  const included: string[] = (() => {
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
        <div
          className="relative w-full aspect-[8/3] sm:aspect-[5/3]"
        >
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
              background:
                "linear-gradient(to bottom, transparent, var(--ivory))",
            }}
          />
        </div>

        {/* Letter body */}
        <div className="px-6 pt-2 pb-10 sm:px-9">
          {/* Hero */}
          <header className="text-center">
            <Eyebrow>The final story</Eyebrow>
            <h2
              id="studio-v3-final-reveal-title"
              className="mt-3 text-[26px] leading-[1.15] [text-wrap:balance]"
              style={{
                fontFamily: "var(--font-editorial)",
                color: "var(--charcoal)",
                fontWeight: 500,
              }}
            >
              <span className="italic" style={{ color: "var(--teal)" }}>
                {REVEAL_TITLE}
              </span>
            </h2>
            <p
              className="mt-3 mx-auto max-w-[38ch] text-[15px] leading-[1.6] [text-wrap:pretty]"
              style={{
                color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                fontFamily: "var(--font-editorial)",
              }}
            >
              <span className="italic">{title}</span>
            </p>
            {(dateLabel || guestsLabel || pickupLabel) ? (
              <p
                className="mt-3 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                {[dateLabel, pickupLabel, guestsLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <span
              aria-hidden
              className="mt-6 inline-block h-px w-16"
              style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
            />
          </header>

          {/* Chaptered story — book paragraphs */}
          <ol
            className="mt-8 space-y-7"
            data-testid="studio-v3-final-reveal-timeline"
          >
            {timeline.map((beat, i) => (
              <li key={`${beat.kind}-${i}-${beat.label}`} className="relative pl-8">
                <span
                  aria-hidden
                  className="absolute left-0 top-[2px] w-6 text-[12px] tracking-[0.12em] tabular-nums"
                  style={{
                    fontFamily: "var(--font-editorial)",
                    color: "var(--gold)",
                    fontWeight: 600,
                    fontStyle: "italic",
                  }}
                >
                  {romanFor(i)}.
                </span>
                <h3
                  className="text-[17px] leading-[1.3]"
                  style={{
                    fontFamily: "var(--font-editorial)",
                    color: "var(--charcoal)",
                    fontWeight: 500,
                  }}
                >
                  {beat.label}
                  {beat.kind === "addition" ? (
                    <span
                      className="ml-2 text-[10px] uppercase tracking-[0.22em] align-middle"
                      style={{ color: "var(--teal)" }}
                    >
                      · your addition
                    </span>
                  ) : null}
                </h3>
                {beat.story ? (
                  <p
                    className="mt-2 max-w-[52ch] text-[14.5px] leading-[1.7] [text-wrap:pretty]"
                    style={{
                      fontFamily: "var(--font-editorial)",
                      color: "color-mix(in oklab, var(--charcoal) 76%, transparent)",
                    }}
                  >
                    {beat.story}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
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
          <span aria-hidden style={{ color: "var(--gold)" }}>+</span>
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
              <ul className="space-y-1.5 text-[13.5px]" style={{ color: "var(--charcoal)" }}>
                {selectedAddOns.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span>· {a.label}</span>
                    <span className="tabular-nums" style={{ color: "var(--teal)" }}>
                      {formatEur(a.priceEur)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div
            className="pt-3 border-t flex justify-between items-baseline"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--charcoal)" }}>
              Total
            </span>
            <span
              className="text-[20px] tabular-nums"
              style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            >
              {formatEur(totalEur)}
              {perPaxEur != null ? (
                <span className="ml-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
                  · {formatEur(perPaxEur)} / guest
                </span>
              ) : null}
            </span>
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
            onClick={onContinue}
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
