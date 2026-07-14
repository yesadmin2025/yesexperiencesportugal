import { useEffect, useState } from "react";

/**
 * JourneyReveal — two-beat cinematic interlude shown once all three core
 * choices are made and before emergence.
 *
 * Studio philosophy: AI presence is invisible, not decorative. No pulsing
 * Sparkles, no breathing dot-cluster, no backdrop blur — those are chatbot
 * tells. The reveal earns its weight from typography, silence, and a single
 * editorial hairline.
 *
 * Beat 1 (≈1.6s): editorial title + serif italic subtitle land softly.
 * Beat 2 (≈0.6s): fade out, hand off to the emergence layer.
 *
 * Title/subtitle come from the cached `proposal` when available; otherwise
 * the simple awakening cue is used as a calm fallback.
 */
interface Props {
  cue: string;
  title?: string | null;
  subtitle?: string | null;
  onDone: () => void;
}

export function JourneyReveal({ cue, title, subtitle, onDone }: Props) {
  const [show, setShow] = useState(false);
  const hasProposal = Boolean(title || subtitle);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShow(true), 80);
    // Cinema breathes before information appears. Hold proposal copy in
    // stillness for ~3.4s so the title/subtitle land emotionally before
    // the itinerary emerges. Fallback cue stays shorter.
    const t2 = window.setTimeout(onDone, hasProposal ? 3400 : 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone, hasProposal]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center animate-in fade-in duration-[900ms]"
      // Lighter veil — the cinematic backdrop (already painted by AmbientStage)
      // should breathe through. A reveal should feel like raising a curtain,
      // not lowering one.
      style={{ background: "oklch(0.15 0.02 240 / 0.58)" }}
    >
      <div
        className={`flex flex-col items-center gap-6 px-6 text-center transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {/* Single editorial hairline — no icon, no pulse. */}
        <span aria-hidden="true" className="block h-px w-10 bg-[color:var(--gold)]/70" />

        {hasProposal ? (
          <>
            {title && (
              <h2
                className="text-[28px] sm:text-[38px] font-semibold leading-[1.05] tracking-[-0.012em] text-[color:var(--ivory)] max-w-[20ch]"
                style={{
                  fontFamily: "Montserrat, system-ui, sans-serif",
                  textShadow: "0 1px 22px rgba(0,0,0,0.55)",
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="italic text-[16.5px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)]/88 max-w-[32ch]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  textShadow: "0 1px 18px rgba(0,0,0,0.55)",
                }}
              >
                {subtitle}
              </p>
            )}
            <span aria-hidden="true" className="block h-px w-6 bg-[color:var(--ivory)]/35 mt-1" />
          </>
        ) : (
          <p
            className="italic text-[22px] sm:text-[26px] leading-tight text-[color:var(--ivory)] max-w-[22ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 18px rgba(0,0,0,0.55)",
            }}
          >
            {cue}
          </p>
        )}
      </div>
    </div>
  );
}
