import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  /** True while the engine is computing the route. */
  loading: boolean;
  /** Called once the moment finishes (route ready + min display time elapsed). */
  onDone: () => void;
  /** Set to true once the route has been received from the server. */
  ready: boolean;
}

const MIN_DISPLAY_MS = 700;
const PHRASES = [
  "Listening to your choices.",
  "Tracing real roads.",
  "Shaping your starting point.",
];

/**
 * The "magic moment" — a brief, elegant pause between the last selection
 * and the live builder. Shows progressive microcopy + a soft animated route.
 * Never blocks: as soon as the route is ready AND the min display time is
 * reached, onDone fires.
 */
export function PredictiveMoment({ loading, onDone, ready }: Props) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => Math.min(i + 1, PHRASES.length - 1));
    }, 550);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (ready && minElapsed) {
      const t = window.setTimeout(onDone, 220);
      return () => window.clearTimeout(t);
    }
  }, [ready, minElapsed, onDone]);

  return (
    <section
      aria-live="polite"
      className="relative isolate min-h-[70svh] overflow-hidden bg-[color:var(--ivory)] text-[color:var(--charcoal)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-30 motion-reduce:opacity-15"
      >
        <defs>
          <linearGradient id="predictiveLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--gold)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M -50 420 C 220 360, 360 220, 560 240 S 880 360, 1080 220 1280 120 1300 80"
          stroke="url(#predictiveLine)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          className="builder-predictive-line"
        />
      </svg>

      <div className="container-x relative z-10 grid min-h-[70svh] place-items-center py-16">
        <div className="max-w-xl text-center">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            Live preview
          </span>
          <h2 className="serif mt-4 text-[2rem] sm:text-[2.6rem] md:text-[3.1rem] leading-[1.04] tracking-[-0.01em] font-semibold">
            We've shaped a starting point <span className="italic">for you</span>.
          </h2>
          <p className="mt-5 inline-flex items-center justify-center gap-2 text-[14px] text-[color:var(--charcoal)]/70 builder-fade-cycle">
            <Loader2 size={14} className="animate-spin text-[color:var(--gold)]" />
            <span key={phraseIdx} className="builder-microcopy">
              {PHRASES[phraseIdx]}
            </span>
          </p>
          <p className="mt-6 text-[12px] text-[color:var(--text-subtle)] tracking-wide">
            You can adjust everything in a moment.
          </p>
        </div>
      </div>
    </section>
  );
}
