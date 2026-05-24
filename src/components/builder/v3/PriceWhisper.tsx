import { useEffect, useState } from "react";
import { type DriftLocale } from "@/lib/drift/i18n";

/**
 * PriceWhisper — gently appears once the predictive engine reaches
 * `revealConfidence ≥ 0.6`. Before that, silence (preserves the
 * cinematic rhythm and the "interface disappears" north star).
 *
 * Shows an indicative per-guest range only — never a fabricated total,
 * never a precise quote. Real pricing lives at the Signature page
 * and the Bokun checkout. This is a confidence-building whisper, not
 * a configurator number.
 *
 * Hidden during convergence (the reveal carries its own pricing band)
 * and respects prefers-reduced-motion (no fade animation, just visible).
 */

interface Props {
  revealConfidence: number;
  locale: DriftLocale;
  /** Optional indicative range €min–€max per guest. */
  rangeFrom?: number;
  rangeTo?: number;
}

const LABEL: Record<DriftLocale, string> = {
  en: "indicative",
  pt: "indicativo",
  es: "indicativo",
  fr: "indicatif",
};

const PER_GUEST: Record<DriftLocale, string> = {
  en: "per guest",
  pt: "por pessoa",
  es: "por persona",
  fr: "par personne",
};

export function PriceWhisper({
  revealConfidence,
  locale,
  rangeFrom = 145,
  rangeTo = 320,
}: Props) {
  const visible = revealConfidence >= 0.6;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-[700ms] ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p
        className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          background: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
          backdropFilter: "blur(4px)",
          border: "1px solid color-mix(in oklab, var(--gold) 28%, transparent)",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "color-mix(in oklab, var(--gold) 70%, var(--ivory))",
          }}
        >
          {LABEL[locale]}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--ivory)",
          }}
        >
          €{rangeFrom}–€{rangeTo}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontStyle: "italic",
            color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {PER_GUEST[locale]}
        </span>
      </p>
    </div>
  );
}
