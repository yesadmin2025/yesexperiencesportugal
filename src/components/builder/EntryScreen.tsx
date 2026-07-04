import { Sparkles } from "lucide-react";
import { CtaButton } from "@/components/ui/CtaButton";

interface Props {
  onStart: () => void;
}

/**
 * Step 0 — first impression. Warm ivory canvas, an animated route line,
 * one primary CTA into the flow + one secondary into Signature tours.
 * No form feel, no cards stacked.
 */
export function EntryScreen({ onStart }: Props) {
  return (
    <section
      aria-labelledby="builder-entry-title"
      className="relative isolate overflow-hidden bg-[color:var(--ivory)] text-[color:var(--charcoal)]"
    >
      {/* Subtle moving route line — pure SVG, respects reduced motion */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.18] motion-reduce:opacity-[0.12]"
      >
        <defs>
          <linearGradient id="builderEntryLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--gold)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M -50 420 C 220 360, 360 220, 560 240 S 880 360, 1080 220 1280 120 1300 80"
          stroke="url(#builderEntryLine)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 14"
          className="builder-entry-line"
        />
        <path
          d="M -80 480 C 200 440, 380 320, 600 340 S 920 460, 1140 320"
          stroke="var(--teal)"
          strokeOpacity="0.35"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />
      </svg>

      <div className="container-x relative z-10 grid min-h-[78svh] place-items-center py-16 md:py-24">
        <div className="section-enter max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            Experience studio
          </span>

          <h1
            id="builder-entry-title"
            className="serif mt-5 text-[2.6rem] sm:text-[3.4rem] md:text-[4rem] leading-[1.02] tracking-[-0.02em] font-semibold"
          >
            Portugal is the stage. <span className="italic">You write it.</span>
          </h1>

          <p className="mt-5 max-w-xl mx-auto serif italic text-[1.15rem] sm:text-[1.35rem] leading-[1.3] text-[color:var(--charcoal)]/85">
            Shape it in real time. Confirm instantly. Local guidance whenever you want it.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <CtaButton type="button" onClick={onStart} variant="hairline">
              Start building
            </CtaButton>

            <CtaButton to="/experiences" variant="hairline" className="opacity-70 hover:opacity-100">
              Start from a signature
            </CtaButton>
          </div>

          <p className="mt-6 text-[12px] text-[color:var(--charcoal)]/55 tracking-wide">
            About a minute. You shape it. Confirmed instantly.
          </p>
        </div>
      </div>
    </section>
  );
}
