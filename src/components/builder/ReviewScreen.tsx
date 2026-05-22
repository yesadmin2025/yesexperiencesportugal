import { Check, MessageCircle, X } from "lucide-react";
import { fmtMinutes, type RouteUI, type RoutedStopUI, type Who, builderWaHref } from "./types";
import type { BuilderImageRef } from "@/hooks/useBuilderImages";
import { BuilderImage } from "./BuilderImage";
import { BuilderMap } from "./BuilderMap";
import { CtaButton } from "@/components/ui/CtaButton";
import { ReferenceUploader, type ToneResult } from "./ReferenceUploader";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { PacingChip } from "./PacingChip";
import { ShareExport } from "./ShareExport";

interface Props {
  route: RouteUI;
  stops: RoutedStopUI[];
  guests: number;
  narrative: string;
  reviewThumbs?: BuilderImageRef[];
  /** Labels of bounded "Add to your day" elements selected by the user. */
  selectedElementLabels?: string[];
  /** "Who" selection — used by silent AI pacing advisor. */
  who?: Who;
  onConfirm: () => void;
  onBack: () => void;
  onReset?: () => void;
  onToneReady?: (tone: ToneResult) => void;
}

const TRUST_POINTS = [
  "Private experience",
  "Local guidance",
  "Realistic, achievable route",
  "Instant confirmation",
];

const INCLUDED = [
  "Private driver-host",
  "All planned stops",
  "Curated tastings & visits",
  "Personalised story for the day",
];

const FLEXIBLE = [
  "Final stop order",
  "Lunch & wine choices",
  "Pace adjustments",
  "Adding a celebration moment",
];

/**
 * Step "Final review" — last beat before checkout. Restates everything in
 * one clean editorial layout, surfaces trust, and offers a final call to
 * either confirm (Stripe) or talk to a local first (WhatsApp).
 */
export function ReviewScreen({
  route,
  stops,
  guests,
  narrative,
  reviewThumbs,
  selectedElementLabels,
  who,
  onConfirm,
  onBack,
  onReset,
  onToneReady,
}: Props) {
  const thumbs = (reviewThumbs ?? []).slice(0, 4);
  const totalEur = route.pricePerPersonEur * guests;
  const sessionId = useBuilderSessionId();

  return (
    <section className="bg-[color:var(--ivory)] text-[color:var(--charcoal)]">
      {/* Full-bleed map hero — leads the review with the actual route */}
      <div className="relative h-[52vh] min-h-[360px] w-full overflow-hidden border-b border-[color:var(--charcoal)]/10">
        <BuilderMap
          stops={stops}
          regionCenter={{ lat: route.region.lat, lng: route.region.lng }}
          regionKey={route.region.key}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color:var(--ivory)] via-[color:var(--ivory)]/70 to-transparent h-24" />
        <div className="absolute left-0 right-0 bottom-3 px-4 sm:px-6">
          <div className="container-x">
            <div className="flex flex-wrap gap-1.5">
              {stops.map((s, i) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ivory)] border border-[color:var(--charcoal)]/12 px-2.5 py-1 text-[11.5px] font-semibold text-[color:var(--charcoal)] shadow-sm"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--teal)] text-[9.5px] text-[color:var(--ivory)] tabular-nums">
                    {i + 1}
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-x py-10 md:py-16 builder-reveal">
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
          Final review
        </span>
        <h2 className="serif mt-3 text-[2rem] sm:text-[2.6rem] md:text-[3rem] leading-[1.04] tracking-[-0.01em] font-semibold">
          Your experience is <span className="italic">ready</span>.
        </h2>
        {narrative && (
          <p className="mt-4 max-w-2xl serif italic text-[1.1rem] sm:text-[1.25rem] leading-[1.4] text-[color:var(--charcoal)]/85">
            {narrative}
          </p>
        )}

        {who && (
          <div className="mt-5">
            <PacingChip route={route} who={who} />
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: details */}
          <div className="flex flex-col gap-6">
            <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                Your route
              </p>
              <p className="mt-1 serif text-[1.25rem] font-semibold leading-[1.15] text-[color:var(--charcoal)]">
                {route.region.label}
              </p>
              <ol className="mt-4 flex flex-col gap-2.5">
                {stops.map((s, i) => (
                  <li key={s.key} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--teal)] text-[11px] font-bold text-[color:var(--ivory)] tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold leading-tight text-[color:var(--charcoal)]">
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[color:var(--charcoal)]/60">
                        {fmtMinutes(s.duration_minutes)} on stop
                        {i > 0 && s.driveMinutesFromPrev > 0
                          ? ` · ${fmtMinutes(s.driveMinutesFromPrev)} drive`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {thumbs.length > 0 && (
              <div className="-mx-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {thumbs.map((t, i) => (
                  <BuilderImage
                    key={`${t.url}-${i}`}
                    src={t.url}
                    alt={t.alt}
                    ratio="4/5"
                    overlay
                    className="border border-[color:var(--charcoal)]/10"
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Stops" value={String(stops.length)} />
              <Stat label="Duration" value={fmtMinutes(route.totals.experienceMinutes)} />
              <Stat label="Pace" value={route.pace} capitalize />
              <Stat label="Guests" value={String(guests)} />
            </div>

            {/* Concierge-confirmed elements — only shown if user picked any */}
            {selectedElementLabels && selectedElementLabels.length > 0 && (
              <div className="rounded-[2px] border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                    Added to your day
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/55">
                    Concierge confirms
                  </p>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {selectedElementLabels.map((label) => (
                    <li
                      key={label}
                      className="inline-flex items-start gap-2 text-[13.5px] text-[color:var(--charcoal)]/90"
                    >
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="mt-0.5 shrink-0 text-[color:var(--gold)]"
                      />
                      <span className="font-semibold">{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] leading-snug text-[color:var(--charcoal)]/65">
                  Pricing & availability for these are confirmed by our concierge after you book — no surprises.
                </p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Block title="What's included" items={INCLUDED} />
              <Block title="What can still change" items={FLEXIBLE} muted />
            </div>

            {sessionId && (
              <ReferenceUploader
                sessionId={sessionId}
                onToneReady={onToneReady}
              />
            )}
          </div>

          {/* Right: trust + price + CTAs */}
          <aside className="flex flex-col gap-5 self-start lg:sticky lg:top-24">
            <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40 p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                Estimated investment
              </p>
              <p className="mt-2 serif text-[2.4rem] leading-none font-semibold tabular-nums">
                €{totalEur}
              </p>
              <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/65">
                €{route.pricePerPersonEur} per guest · {guests} guest
                {guests > 1 ? "s" : ""}
              </p>

              <ul className="mt-5 flex flex-col gap-2">
                {TRUST_POINTS.map((t) => (
                  <li
                    key={t}
                    className="inline-flex items-start gap-2 text-[13px] text-[color:var(--charcoal)]/85"
                  >
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0 text-[color:var(--gold)]"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <CtaButton
              type="button"
              onClick={onConfirm}
              variant="primary"
              className="w-full"
            >
              Confirm your experience
            </CtaButton>

            <CtaButton
              href={builderWaHref(
                `Hi! I'd like to talk to a local before confirming this experience: ${route.region.label}, ${stops.length} stops, ${guests} guest${guests > 1 ? "s" : ""}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              className="w-full"
              icon={null}
              iconLeading={<MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />}
            >
              Talk to a local before confirming
            </CtaButton>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onBack}
                className="text-[12px] underline underline-offset-4 text-[color:var(--charcoal)]/55 hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded-sm px-1 py-0.5"
              >
                ← Keep adjusting
              </button>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  aria-label="Start over — clears your selections"
                  className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55 hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded-sm px-1 py-0.5 transition-colors"
                >
                  <X size={12} aria-hidden="true" />
                  Start over
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] px-3 py-2.5">
      <p className="text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/55">
        {label}
      </p>
      <p
        className={[
          "mt-1 serif text-[1.15rem] font-semibold text-[color:var(--charcoal)] tabular-nums",
          capitalize ? "capitalize" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function Block({
  title,
  items,
  muted,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((it) => (
          <li
            key={it}
            className={[
              "text-[13px] leading-snug",
              muted ? "text-[color:var(--charcoal)]/65" : "text-[color:var(--charcoal)]/85",
            ].join(" ")}
          >
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
