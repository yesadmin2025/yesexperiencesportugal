import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AmbientStage } from "./AmbientStage";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { StudioDict, StudioLocale } from "@/hooks/useStudioLocale";

/**
 * AmbientPrologue — BEAT 1: ARRIVAL.
 *
 * Fullscreen cinematic Portugal. No eyebrow tags. No rotating prose. No
 * pulsing CTA. One single static line, in serif italic, breathing on top
 * of real footage. After a long, deliberate pause a near-invisible
 * "enter" affordance surfaces at the bottom — but the entire canvas is
 * tappable. The traveller feels invited, not onboarded.
 */

const CONTINUE_DELAY_MS = 4200;
const PROLOGUE_CLIP =
  "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4";

interface Props {
  locale: StudioLocale;
  onLocaleChange: (l: StudioLocale) => void;
  t: StudioDict;
  onAwaken: (seed?: string) => void;
  onExit?: () => void;
}

export function AmbientPrologue({ locale, onLocaleChange, t, onAwaken, onExit }: Props) {
  const [showContinue, setShowContinue] = useState(false);
  const interactedRef = useRef(false);

  useEffect(() => {
    const tm = window.setTimeout(() => setShowContinue(true), CONTINUE_DELAY_MS);
    return () => window.clearTimeout(tm);
  }, []);

  const awaken = (fast = false) => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    try {
      if (fast) sessionStorage.setItem("studio.fastPace", "1");
      else sessionStorage.removeItem("studio.fastPace");
    } catch {
      /* sessionStorage unavailable */
    }
    onAwaken();
  };

  // Two-line static arrival copy — first line, soft break, second line.
  const lines = t.arrivalLine.split("\n");

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[color:var(--charcoal)] cursor-pointer"
      onClick={() => {
        if (showContinue) awaken(false);
      }}
      role="button"
      tabIndex={0}
      aria-label={t.arrivalContinue}
    >
      {/* Real cinematic Portugal — deep veil for editorial calm */}
      <AmbientStage mood={null} veil="deep" videoUrl={PROLOGUE_CLIP} />

      {/* Soft top vignette so the corner controls remain legible without a bar */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, oklch(0.18 0.02 240 / 0.55) 0%, transparent 100%)",
        }}
      />

      {/* Minimal top — back + locale, both very quiet */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        {onExit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExit();
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-1 text-[10.5px] uppercase tracking-[0.26em] font-semibold text-[color:var(--ivory)]/55 hover:text-[color:var(--ivory)] transition-colors"
            aria-label={t.back}
          >
            <ArrowLeft size={12} />
            {t.back}
          </button>
        ) : (
          <span />
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <LocaleSwitcher locale={locale} onChange={onLocaleChange} tone="light" collapsed />
        </div>
      </header>

      {/* The single static line. Serif italic. Drops in once, then breathes. */}
      <div className="absolute inset-0 z-20 flex items-center justify-center px-8 text-center pointer-events-none">
        <h1
          className="font-serif italic text-[26px] sm:text-[34px] md:text-[40px] leading-[1.24] tracking-[-0.005em] text-[color:var(--ivory)] max-w-[22ch] drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] arrival-in"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {lines.map((ln, i) => (
            <span key={i} className="block">
              {ln}
            </span>
          ))}
        </h1>
      </div>

      {/* Quiet bottom continue — appears only after a long pause. No pulse, no chip. */}
      <div className="absolute inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),2rem)] flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            awaken(false);
          }}
          className={`group inline-flex flex-col items-center gap-2 px-4 py-2 min-h-[44px] transition-opacity duration-[1100ms] ease-out ${
            showContinue ? "opacity-90 hover:opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!showContinue}
          tabIndex={showContinue ? 0 : -1}
        >
          <span
            className="text-[10.5px] uppercase tracking-[0.42em] font-medium text-[color:var(--ivory)]/80 group-hover:text-[color:var(--ivory)]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {t.arrivalContinue}
          </span>
          <span
            aria-hidden="true"
            className="block h-px w-8 bg-[color:var(--ivory)]/55 group-hover:bg-[color:var(--gold)] transition-colors"
          />
        </button>

        {/* Two-pace entry — discreet faster path for travellers who want to see quickly */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            awaken(true);
          }}
          className={`inline-flex items-center min-h-[36px] px-2 text-[10px] tracking-[0.32em] uppercase font-medium text-[color:var(--ivory)]/55 hover:text-[color:var(--gold)] transition-[opacity,color] duration-[1100ms] ease-out ${
            showContinue ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!showContinue}
          tabIndex={showContinue ? 0 : -1}
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {t.arrivalFast}
        </button>

        {/* Pro / Travel agent entry — bypasses the cinematic studio and opens the
            production builder with full transparency (real stops, price per pax,
            shareable link). Intentionally tiny and at the very bottom. */}
        <a
          href="/builder?mode=pro"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center min-h-[32px] px-2 text-[9.5px] tracking-[0.32em] uppercase font-medium text-[color:var(--ivory)]/40 hover:text-[color:var(--gold)] transition-[opacity,color] duration-[1100ms] ease-out ${
            showContinue ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!showContinue}
          tabIndex={showContinue ? 0 : -1}
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {t.arrivalPro} →
        </a>
      </div>

      <style>{`
        @keyframes arrivalIn {
          from { opacity: 0; transform: translateY(10px); filter: blur(3px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .arrival-in { animation: arrivalIn 1600ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 320ms; }
        @media (prefers-reduced-motion: reduce) {
          .arrival-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
