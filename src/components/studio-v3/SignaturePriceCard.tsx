// Premium price card for the Studio V3 reveal.
//
// Anchored entirely in real, tour-specific data:
//   - priceFrom in EUR (derived from the canonical operations dataset)
//   - duration label from signatureTours[tourId].durationHours
//   - real stop count from the resolved/edited route
//
// Up to three add-ons can be opted into. Add-ons are region-mapped and
// priced as a % of the base "from" anchor — never invented numbers.
// Only add-ons whose itinerary thresholds (stops / duration) are met
// surface, so we never promise something the day can't hold.
//
// If the base price is missing, the card degrades gracefully to
// "Price on request" + a WhatsApp escape hatch. No fabricated numbers.

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { VIATOR_META } from "@/data/signatureToursViator";
import {
  addOnEurFromBase,
  selectSignatureAddOns,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import type { SignatureTour } from "@/data/signatureTours";
import { whatsappHref } from "@/components/WhatsAppFab";
import { recordStudioV3RevealPremium } from "@/lib/studio-v3-telemetry";

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
}

export function SignaturePriceCard({
  tour,
  stopCount,
  dateExact,
  onSecure,
  onRefine,
  journeyTitle,
}: SignaturePriceCardProps) {
  const meta = tour ? VIATOR_META[tour.id] : null;
  const priceEur = useMemo(() => {
    if (!meta?.priceFromUSD || meta.priceFromUSD <= 0) return null;
    return usdToEurAnchor(meta.priceFromUSD);
  }, [meta]);

  const durationLabel = tour?.durationHours ?? tour?.duration ?? null;
  const hasPrice = priceEur != null;

  const availableAddOns = useMemo<SignatureAddOn[]>(
    () =>
      selectSignatureAddOns({
        resolvedTour: tour,
        stopCount,
        durationLabel,
      }),
    [tour, stopCount, durationLabel],
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [pendingAddOnId, setPendingAddOnId] = useState<string | null>(null);
  const MAX_ADDONS = 3;
  const atCap = selectedAddOnIds.length >= MAX_ADDONS;
  const toggleAddOn = (id: string) => {
    const isSelected = selectedAddOnIds.includes(id);
    if (!isSelected && atCap) return; // gated
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
  const totalEur = hasPrice && priceEur ? priceEur + addOnsTotalEur : null;

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

  return (
    <section
      data-testid="studio-v3-price-card"
      data-has-price={hasPrice ? "true" : "false"}
      className="mx-auto mt-10 w-full max-w-[460px] px-5"
      aria-label="Your Signature — investment"
    >
      <div
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
          <span style={{ color: "var(--gold)" }}>—</span> {journeyTitle ? "Your Signature" : "The journey you composed"}
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
              From
            </p>
            <p
              className="mt-1 text-[40px] leading-none font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
            >
              €{priceEur}
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
              A private day, just for you — driver, guide and every detail handled. You only show up.
            </p>
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
              This Signature is bespoke — a YES curator confirms the
              investment before anything is reserved.
            </p>
          </>
        )}

        <ul
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          {durationLabel ? (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="block h-1 w-1 rounded-full" style={{ background: "var(--gold)" }} />
              {durationLabel}
            </li>
          ) : null}
          {stopCount > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="block h-1 w-1 rounded-full" style={{ background: "var(--gold)" }} />
              {stopCount} {stopCount === 1 ? "moment" : "moments"}
            </li>
          ) : null}
          {dateExact ? (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="block h-1 w-1 rounded-full" style={{ background: "var(--gold)" }} />
              {formatPriceDate(dateExact)}
            </li>
          ) : null}
        </ul>

        {hasPrice && availableAddOns.length > 0 ? (
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
                const disabled = !selected && atCap;
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
                        border: `1px solid ${
                          selected
                            ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                            : "color-mix(in oklab, var(--charcoal) 12%, transparent)"
                        }`,
                        opacity: disabled ? 0.45 : 1,
                      }}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full transition-transform duration-200"
                        style={{
                          background: selected ? "var(--gold)" : "transparent",
                          border: `1px solid ${
                            selected ? "var(--gold)" : "color-mix(in oklab, var(--charcoal) 30%, transparent)"
                          }`,
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
                  Total <span style={{ color: "var(--gold)" }}>—</span> €{totalEur}
                  <span className="ml-1 text-[9.5px] tracking-[0.18em] opacity-60">/ pp</span>
                </>
              ) : (
                <span className="sr-only">No add-ons selected</span>
              )}
            </output>
          </fieldset>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-2.5">
          {hasPrice ? (
            <button
              type="button"
              onClick={onSecure}
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Yes — make this day mine <ArrowRight size={14} aria-hidden />
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
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Request the investment <ArrowRight size={14} aria-hidden />
            </a>
          )}
          <button
            type="button"
            onClick={onRefine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 68%, transparent)" }}
          >
            Adjust a few things first
          </button>
        </div>
      </div>
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
