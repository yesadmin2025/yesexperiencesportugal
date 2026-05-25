import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * StudioConversionHud — thin, always-visible conversion band sitting at
 * the top of the Studio (Drift) experience.
 *
 * Strict scoped override of the Studio "no UI" rule: brand wants stronger
 * conversion signal during the cinematic flow without breaking immersion.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Drift  ●●●○○○○○○○○  4 / 11   ·   Match 62%   ·   Reserve → │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * - Tiny, ivory-on-charcoal, blends with the cinematic backdrop.
 * - Tap the chip → jumps straight to the pro stepper (`?legacy=stepper`),
 *   so power users / travel agents can skip ahead at any point.
 */
interface Props {
  index: number;
  total: number;
  /** 0..1 — predictive engine confidence (revealConfidence). */
  confidence: number;
}

export function StudioConversionHud({ index, total, confidence }: Props) {
  const stepNumber = Math.min(total, Math.max(1, index + 1));
  const pct = Math.max(0, Math.min(1, (index + 1) / Math.max(1, total)));
  const matchPct = Math.round(confidence * 100);
  const dots = Math.min(12, total);

  return (
    <div
      role="region"
      aria-label="Studio progress and quick reserve"
      className="absolute top-2 inset-x-2 z-[45] flex items-center justify-between gap-2 rounded-full px-3 py-1.5 pointer-events-auto"
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
          className="hidden sm:inline text-[9px] uppercase tracking-[0.22em] font-bold"
          style={{ color: "color-mix(in oklab, var(--gold) 70%, var(--ivory))" }}
        >
          Drift
        </span>
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
        <span
          className="text-[10px] tabular-nums font-semibold"
          style={{ color: "color-mix(in oklab, var(--ivory) 88%, transparent)" }}
          aria-label={`Step ${stepNumber} of ${total}`}
        >
          {stepNumber}/{total}
        </span>
        {matchPct >= 12 && (
          <span
            className="hidden xs:inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums"
            style={{ color: "color-mix(in oklab, var(--gold) 78%, var(--ivory))" }}
            aria-label={`Match ${matchPct}%`}
          >
            <Sparkles size={10} aria-hidden="true" /> {matchPct}%
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
