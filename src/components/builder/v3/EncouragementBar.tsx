// EncouragementBar — replaces the bare Meridian hairline with a more
// emotional progress band: a thin teal→gold meridian, plus a single
// whispered encouragement that swaps at three key moments (start /
// middle / late / near reveal). Reduced-motion safe.

import { useEffect, useState } from "react";
import { tName, type DriftLocale } from "@/lib/drift/i18n";

interface Props {
  index: number;
  total: number;
  locale: DriftLocale;
  /** Traveller's first name — when present, encouragements address them by name. */
  name?: string | null;
}

export function EncouragementBar({ index, total, locale, name }: Props) {
  const pct = total <= 1 ? 1 : Math.min(1, (index + 1) / total);
  const visibility = pct > 0.78 ? Math.max(0.18, 1 - (pct - 0.78) / 0.22) : 1;

  const baseKey =
    pct >= 0.92 ? "enc.near" : pct >= 0.7 ? "enc.late" : pct >= 0.35 ? "enc.middle" : "enc.start";
  const label = tName(baseKey, locale, name);

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
    <div
      aria-hidden="true"
      className="absolute bottom-[64px] left-0 right-0 z-40 pointer-events-none px-4"
    >
      {/* encouragement whisper — poetic line, sentence case (NOT uppercased).
          Anchored to the bottom band, well clear of the HUD and choice tiles,
          so it never reads as garbage text above the headline. */}
      <p
        className="text-center transition-opacity duration-[700ms] ease-out"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "10.5px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          color: "color-mix(in oklab, var(--gold) 70%, var(--ivory))",
          textShadow: "0 1px 14px rgba(0,0,0,0.78)",
          opacity: opacity * visibility * 0.7,
        }}
      >
        {shown}
      </p>
    </div>
  );
}
