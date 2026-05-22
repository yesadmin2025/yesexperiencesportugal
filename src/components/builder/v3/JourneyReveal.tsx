import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * JourneyReveal — two-beat cinematic interlude shown once all three core
 * choices are made and before emergence.
 *
 * Beat 1 (≈1.6s): editorial title + serif italic subtitle land softly. Pure
 *   identity moment — no chrome, no chips, no map.
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

  useEffect(() => {
    const t1 = window.setTimeout(() => setShow(true), 40);
    const t2 = window.setTimeout(onDone, title || subtitle ? 1800 : 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone, title, subtitle]);

  const hasProposal = Boolean(title || subtitle);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[color:var(--charcoal)]/55 backdrop-blur-md animate-in fade-in duration-500">
      <div
        className={`flex flex-col items-center gap-5 px-6 text-center transition-all duration-[900ms] ease-out ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <Sparkles
          size={20}
          className="text-[color:var(--gold)] animate-pulse"
          style={{ animationDuration: "2.4s" }}
        />

        {hasProposal ? (
          <>
            {title && (
              <h2
                className="text-[26px] sm:text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] text-[color:var(--ivory)] max-w-[20ch]"
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

        <div className="flex items-center gap-1.5 mt-1">
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]/70 animate-pulse" style={{ animationDelay: "180ms" }} />
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]/40 animate-pulse" style={{ animationDelay: "360ms" }} />
        </div>
      </div>
    </div>
  );
}
