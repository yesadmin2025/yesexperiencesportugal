/**
 * Studio V3 — P3B live investment presentation primitives.
 *
 * PRESENTATION ONLY. Nothing here computes, adjusts or infers a price.
 * Every number rendered is passed in already-resolved from
 * `useResolvedJourney` (the single pricing source of truth) or from the
 * price card's existing preview values. If an input is missing, the
 * surface omits itself rather than guessing.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PriceChangeFactor } from "./priceChangeFactors";

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}

/**
 * Deterministic "live quote" signal: the difference between the total
 * currently displayed and the one displayed immediately before it.
 *
 * Returns `null` on first render, on same-value rerenders and whenever
 * either side is null — so no delta can ever be invented. Auto-clears
 * after ~1.6s; the timer is cleared on unmount.
 */
export function useInvestmentDelta(totalEur: number | null): number | null {
  const [delta, setDelta] = useState<number | null>(null);
  const prevRef = useRef<number | null>(null);
  const seenRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = totalEur;

    if (!seenRef.current) {
      seenRef.current = true;
      return;
    }
    if (prev == null || totalEur == null) return;
    if (prev === totalEur) return;

    setDelta(totalEur - prev);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setDelta(null);
    }, 1600);
  }, [totalEur]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return delta;
}

/** Quiet "Updated +€120 / −€80" whisper. Renders nothing when no real change. */
export function InvestmentDelta({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "−";
  return (
    <>
      <style>{`
        @keyframes sv3InvestmentRise {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sv3-investment-rise {
          animation: sv3InvestmentRise 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .sv3-investment-rise { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <span
      data-testid="studio-v3-investment-delta"
      data-delta-eur={delta}
      aria-live="polite"
      className="mt-2 inline-block text-[11px] uppercase tracking-[0.22em] font-semibold tabular-nums sv3-investment-rise"
      style={{ color: "var(--teal)" }}
    >
      Updated {sign}
      {eur(Math.abs(delta))}
      </span>
    </>
  );
}

/**
 * Three-line bespoke quotation: Journey · Enhancements · Your total.
 * Only rendered when the caller can prove base + enhancements = total
 * from already-resolved values.
 */
export function InvestmentLedger({
  baseTotalEur,
  additionsTotalEur,
  totalEur,
}: {
  baseTotalEur: number | null;
  additionsTotalEur: number | null;
  totalEur: number | null;
}) {
  if (baseTotalEur == null || totalEur == null) return null;
  const additions = additionsTotalEur ?? 0;
  if (Math.abs(baseTotalEur + additions - totalEur) > 1) return null;

  const hair = "color-mix(in oklab, var(--charcoal) 12%, transparent)";
  return (
    <dl
      data-testid="studio-v3-investment-ledger"
      data-base-eur={Math.round(baseTotalEur)}
      data-additions-eur={Math.round(additions)}
      data-total-eur={Math.round(totalEur)}
      className="mt-6 mx-auto w-full max-w-[380px] text-left"
    >
      <div
        className="flex items-baseline justify-between gap-4 py-2.5 border-b"
        style={{ borderColor: hair }}
      >
        <dt className="text-[13px]" style={{ color: "var(--charcoal)" }}>
          Journey
        </dt>
        <dd
          className="text-[14px] font-medium tabular-nums"
          style={{ color: "var(--charcoal)" }}
          data-testid="studio-v3-ledger-journey"
        >
          {eur(baseTotalEur)}
        </dd>
      </div>
      {additions > 0 ? (
        <div
          className="flex items-baseline justify-between gap-4 py-2.5 border-b"
          style={{ borderColor: hair }}
        >
          <dt className="text-[13px]" style={{ color: "var(--charcoal)" }}>
            Enhancements
          </dt>
          <dd
            className="text-[14px] font-medium tabular-nums"
            style={{ color: "var(--charcoal)" }}
            data-testid="studio-v3-ledger-additions"
          >
            +{eur(additions)}
          </dd>
        </div>
      ) : null}
      <div
        className="flex items-baseline justify-between gap-4 pt-3"
        style={{ borderTop: `1px solid color-mix(in oklab, var(--gold) 55%, transparent)` }}
      >
        <dt
          className="text-[11px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: "var(--charcoal)" }}
        >
          Your total
        </dt>
        <dd
          className="text-[19px] font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
          data-testid="studio-v3-ledger-total"
        >
          {eur(totalEur)}
        </dd>
      </div>
    </dl>
  );
}

/** Quiet disclosure listing only the factors the canonical module returned. */
export function InvestmentFactors({
  factors,
}: {
  factors: readonly PriceChangeFactor[];
}) {
  const [open, setOpen] = useState(false);
  if (factors.length === 0) return null;
  return (
    <div
      data-testid="studio-v3-investment-factors"
      data-factor-count={factors.length}
      className="mt-5 mx-auto w-full max-w-[380px] text-left"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-2.5 min-h-[44px] text-[11.5px] uppercase tracking-[0.2em] font-semibold border-t focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{
          borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
        }}
      >
        What shapes this investment
        <ChevronDown
          size={14}
          aria-hidden
          className="transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open ? (
        <ul className="pb-1">
          {factors.map((f) => (
            <li
              key={f.id}
              data-factor-id={f.id}
              className="flex items-start gap-2 py-1.5 text-[13px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
            >
              <span
                aria-hidden
                className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full"
                style={{ background: "var(--gold)" }}
              />
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
