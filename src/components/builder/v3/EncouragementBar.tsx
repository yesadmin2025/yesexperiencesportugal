// EncouragementBar — replaces the bare Meridian hairline with a more
// emotional progress band: a thin teal→gold meridian, plus a single
// whispered encouragement that swaps at three key moments (start /
// middle / late / near reveal). Reduced-motion safe.

import { useEffect, useState } from "react";
import { t, type DriftLocale } from "@/lib/drift/i18n";

interface Props {
  index: number;
  total: number;
  locale: DriftLocale;
}

export function EncouragementBar({ index, total, locale }: Props) {
  const pct = total <= 1 ? 1 : Math.min(1, (index + 1) / total);
  const visibility = pct > 0.78 ? Math.max(0.18, 1 - (pct - 0.78) / 0.22) : 1;

  const key =
    pct >= 0.92 ? "enc.near" : pct >= 0.7 ? "enc.late" : pct >= 0.35 ? "enc.middle" : "enc.start";
  const label = t(key, locale);

  // Fade the label on each change for a calm rhythm.
  const [shown, setShown] = useState(label);
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    setOpacity(0);
    const t1 = window.setTimeout(() => {
      setShown(label);
      setOpacity(0.72);
    }, 280);
    return () => window.clearTimeout(t1);
  }, [label]);

  return (
    <div aria-hidden="true" className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      {/* meridian */}
      <div
        className="h-px"
        style={{
          background: "color-mix(in oklab, var(--ivory) 8%, transparent)",
          opacity: visibility,
        }}
      >
        <div
          className="h-full origin-left transition-[transform,opacity] duration-[1400ms] ease-out"
          style={{
            transform: `scaleX(${pct})`,
            background:
              "linear-gradient(90deg, color-mix(in oklab, var(--ivory) 35%, transparent) 0%, color-mix(in oklab, var(--gold) 60%, transparent) 100%)",
          }}
        />
      </div>
      {/* encouragement whisper */}
      <p
        className="mt-3 text-center italic transition-opacity duration-[700ms] ease-out"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "11.5px",
          letterSpacing: "0.04em",
          color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
          textShadow: "0 1px 12px rgba(0,0,0,0.6)",
          opacity: opacity * visibility,
        }}
      >
        {shown}
      </p>
    </div>
  );
}
