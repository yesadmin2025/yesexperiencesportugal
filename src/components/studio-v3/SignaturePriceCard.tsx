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
        region: tour?.region ?? null,
        stopCount,
        durationLabel,
      }),
    [tour?.region, stopCount, durationLabel],
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const toggleAddOn = (id: string) =>
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
          <span style={{ color: "var(--gold)" }}>—</span> Your Signature
        </p>

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
              Private experience · final details confirmed with you
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

        <div className="mt-6 flex flex-col items-center gap-2.5">
          {hasPrice ? (
            <button
              type="button"
              onClick={onSecure}
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Reserve instantly <ArrowRight size={14} aria-hidden />
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
            Refine details
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
