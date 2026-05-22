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
    // Hold longer when there is real editorial copy to land — silence is
    // part of the rhythm; this is the inevitability beat, not a spinner.
    const t2 = window.setTimeout(onDone, hasProposal ? 2600 : 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone, hasProposal]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center animate-in fade-in duration-[900ms]"
      style={{ background: "oklch(0.15 0.02 240 / 0.78)" }}
    >
      <div
        className={`flex flex-col items-center gap-5 px-6 text-center transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {/* Single editorial hairline — no icon, no pulse. */}
        <span
          aria-hidden="true"
          className="block h-px w-10 bg-[color:var(--gold)]/70"
        />

        {hasProposal ? (
          <>
            {title && (
              <h2
                className="text-[26px] sm:text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] text-[color:var(--ivory)] max-w-[20ch]"
                style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="font-serif italic text-[16px] sm:text-[19px] leading-snug text-[color:var(--ivory)]/85 max-w-[32ch]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {subtitle}
              </p>
            )}
          </>
        ) : (
          <p
            className="font-serif italic text-[22px] sm:text-[26px] leading-tight text-[color:var(--ivory)] max-w-[22ch]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {cue}
          </p>
        )}
      </div>
    </div>
  );
}
