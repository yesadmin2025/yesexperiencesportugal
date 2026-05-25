import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Zap } from "lucide-react";

/**
 * StudioConversionHud — thin, always-visible conversion band sitting at
 * the top of the Studio (Drift) experience.
 *
 * Strict scoped override of the Studio "no UI" rule: brand wants a stronger
 * conversion signal during the cinematic flow without breaking immersion.
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Step 4 of 11  ●●●●○○○○○○○   ·   62% match   ·  €145+ /guest    │
 *   │                                                       Reserve → │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * - Tiny, ivory-on-charcoal, blends with the cinematic backdrop.
 * - Tap the chip → jumps straight to the pro stepper (`?legacy=stepper`),
 *   so power users / travel agents can skip ahead at any point.
 *
 * Studio v4 changes:
 *  - Step label is now "Step X of Y" (legible, mirrors reference site)
 *  - Optional indicative `pricePerGuestFrom` chip appears once confidence ≥ 0.4
 *  - Match % threshold lowered so users see momentum sooner
 */
interface Props {
  index: number;
  total: number;
  /** 0..1 — predictive engine confidence (revealConfidence). */
  confidence: number;
  /** Optional indicative starting price per guest in EUR — shown as "€145+ /guest". */
  pricePerGuestFrom?: number;
  /** Optional label like "Step" so we can localise later. */
  stepLabel?: string;
  ofLabel?: string;
  /** When true, shows a small ⚡ Fast badge — Studio v4 / Fase 7. */
  fast?: boolean;
}

export function StudioConversionHud({
  index,
  total,
  confidence,
  pricePerGuestFrom,
  stepLabel = "Step",
  ofLabel = "of",
  fast = false,
}: Props) {
  const stepNumber = Math.min(total, Math.max(1, index + 1));
  const pct = Math.max(0, Math.min(1, (index + 1) / Math.max(1, total)));
  const matchPct = Math.round(confidence * 100);
  const dots = Math.min(7, total);
  const showMatch = matchPct >= 10;
  const showPrice = typeof pricePerGuestFrom === "number" && confidence >= 0.4;

  return (
    <div
      role="region"
      aria-label="Studio progress and quick reserve"
      className="absolute top-9 inset-x-2 z-[45] flex items-center justify-between gap-2 rounded-full px-3 py-1.5 pointer-events-auto motion-safe:animate-[fade-in_0.7s_ease-out_both]"
      style={{
        background: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid color-mix(in oklab, var(--ivory) 12%, transparent)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.32)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="text-[10px] tabular-nums font-semibold whitespace-nowrap"
          style={{ color: "color-mix(in oklab, var(--ivory) 92%, transparent)" }}
          aria-label={`${stepLabel} ${stepNumber} ${ofLabel} ${total}`}
        >
          <span
            className="mr-1 uppercase tracking-[0.18em] text-[9px] font-bold"
            style={{ color: "color-mix(in oklab, var(--gold) 70%, var(--ivory))" }}
          >
            {stepLabel}
          </span>
          {stepNumber}
          <span className="opacity-60"> {ofLabel} </span>
          {total}
        </span>
        {fast && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[8.5px] uppercase tracking-[0.18em] font-bold whitespace-nowrap"
            style={{
              background: "color-mix(in oklab, var(--gold) 90%, transparent)",
              color: "var(--charcoal)",
            }}
            aria-label="Fast mode — about 60 seconds"
          >
            <Zap size={9} strokeWidth={2.6} aria-hidden="true" />
            60s
          </span>
        )}
        <span className="flex items-center gap-[3px]" aria-hidden="true">

          {Array.from({ length: dots }, (_, i) => (
            <span
              key={i}
              className="block h-[3px] w-[6px] rounded-full transition-colors"
              style={{
                background:
                  i / dots < pct
                    ? "var(--gold)"
                    : "color-mix(in oklab, var(--ivory) 22%, transparent)",
              }}
            />
          ))}
        </span>
        {showMatch && (
          <span
            className="hidden xs:inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums whitespace-nowrap"
            style={{ color: "color-mix(in oklab, var(--gold) 78%, var(--ivory))" }}
            aria-label={`${matchPct}% match`}
          >
            <Sparkles size={10} aria-hidden="true" /> {matchPct}%
          </span>
        )}
        {showPrice && (
          <span
            className="hidden sm:inline-flex items-baseline gap-1 text-[10px] font-semibold tabular-nums whitespace-nowrap"
            style={{ color: "color-mix(in oklab, var(--ivory) 88%, transparent)" }}
            aria-label={`From ${pricePerGuestFrom} euro per guest, indicative`}
          >
            <span aria-hidden="true" className="opacity-50">·</span>
            €{pricePerGuestFrom}+
            <span className="opacity-60 not-italic">/guest</span>
          </span>
        )}
      </div>

      <Link
        to="/builder"
        search={{ legacy: "stepper" } as never}
        aria-label="Skip to reserve in the full builder"
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
        style={{
          background: "var(--gold)",
          color: "var(--charcoal)",
        }}
      >
        Reserve
        <ArrowRight size={10} aria-hidden="true" />
      </Link>
    </div>
  );
}
