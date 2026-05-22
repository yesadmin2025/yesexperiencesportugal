import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AmbientStage } from "./AmbientStage";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { StudioDict, StudioLocale } from "@/hooks/useStudioLocale";

/**
 * AmbientPrologue — the passive cinematic entry.
 *
 * The world breathes for the first ~6 seconds without asking anything.
 * Poetic lines rotate softly. Mood fragments drift in the background as
 * optional taps. Only after the atmosphere has settled does a gentle
 * "whisper" invitation appear at the bottom. Nothing is mandatory —
 * tapping a fragment, the invitation, or anywhere on the scene awakens
 * the composer with a seed phrase (or empty, if just tapped through).
 */

const LINE_ROTATE_MS = 4200;
const INVITATION_DELAY_MS = 5400;
const PROLOGUE_CLIP = "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4";

interface Props {
  locale: StudioLocale;
  onLocaleChange: (l: StudioLocale) => void;
  t: StudioDict;
  onAwaken: (seed?: string) => void;
  onExit?: () => void;
}

export function AmbientPrologue({ locale, onLocaleChange, t, onAwaken, onExit }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const interactedRef = useRef(false);

  useEffect(() => {
    setLineIdx(0);
    setShowInvite(false);
    const t1 = window.setTimeout(() => setShowInvite(true), INVITATION_DELAY_MS);
    const rotate = window.setInterval(
      () => setLineIdx((i) => (i + 1) % t.prologueLines.length),
      LINE_ROTATE_MS,
    );
    return () => {
      window.clearTimeout(t1);
      window.clearInterval(rotate);
    };
  }, [t.prologueLines.length]);

  const awaken = (seed?: string) => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    onAwaken(seed);
  };

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[color:var(--charcoal)]"
      // Tap anywhere on the canvas awakens (after invitation surfaces, to avoid pre-empting drift).
      onClick={() => {
        if (showInvite) awaken();
      }}
    >
      {/* Atmospheric base — real Portuguese footage, slow breathing gradient underneath */}
      <AmbientStage mood={null} veil="deep" videoUrl={PROLOGUE_CLIP} />

      {/* Slow breathing radial glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none ambient-breathe"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, oklch(0.55 0.06 80 / 0.18) 0%, transparent 55%)",
        }}
      />

      {/* Top bar — locale switcher + back */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
        {onExit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExit();
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/65 hover:text-[color:var(--ivory)] transition-colors"
            aria-label={t.back}
          >
            <ArrowLeft size={12} />
            {t.back}
          </button>
        ) : (
          <span />
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <LocaleSwitcher locale={locale} onChange={onLocaleChange} tone="light" />
        </div>
      </header>

      {/* Drifting mood fragments — sparse optional taps, never a wall of words */}
      <div aria-hidden={!fragmentsReady} className="absolute inset-0 z-10 pointer-events-none">
        {fragments.map((f) => (
          <button
            key={f.word}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              awaken(f.word);
            }}
            tabIndex={fragmentsReady ? 0 : -1}
            className={`pointer-events-auto absolute select-none font-serif italic text-[color:var(--ivory)]/38 hover:text-[color:var(--gold)] hover:scale-[1.06] transition-all duration-300 ${
              fragmentsReady ? "ambient-drift opacity-100" : "opacity-0"
            }`}
            style={{
              top: f.top,
              left: f.left,
              fontSize: `${f.size}px`,
              transitionDelay: fragmentsReady ? `${f.delayMs}ms` : "0ms",
              fontFamily: "Georgia, 'Times New Roman', serif",
              animationDuration: `${f.driftSec}s`,
              animationDelay: `${f.delayMs}ms`,
              textShadow: "0 1px 10px rgba(0,0,0,0.65)",
            }}
            aria-label={f.word}
          >
            {f.word}
          </button>
        ))}
      </div>

      {/* Centerpiece — eyebrow + rotating poetic line */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.34em] font-bold text-[color:var(--gold)]/90">
          <Sparkles size={11} aria-hidden="true" />
          {t.eyebrow}
        </span>
        <h1
          key={lineIdx}
          className="mt-6 font-serif italic text-[28px] sm:text-[40px] leading-[1.14] text-[color:var(--ivory)] max-w-[20ch] drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)] ambient-line"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          aria-live="polite"
        >
          {t.prologueLines[lineIdx]}
        </h1>
      </div>

      {/* Soft invitation — appears only after the atmosphere has settled */}
      <div className="absolute inset-x-0 bottom-0 z-30 p-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] flex flex-col items-center gap-2">
        <div
          className={`transition-all duration-[700ms] ease-out ${
            showInvite ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              awaken();
            }}
            className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-5 py-3 text-[12px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)] shadow-[0_10px_36px_rgba(0,0,0,0.4)] border border-[color:var(--gold)]/45 hover:border-[color:var(--gold)] hover:bg-[color:var(--ivory)] transition-all min-h-[48px] ambient-pulse"
          >
            <Sparkles size={14} className="text-[color:var(--gold)]" />
            {t.whisperInvite}
          </button>
          <p className="mt-3 text-center text-[11px] tracking-[0.06em] text-[color:var(--ivory)]/55 italic font-serif" style={{ fontFamily: "Georgia, serif" }}>
            {t.whisperHelper}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes studioBreathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes studioDrift {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes studioLineIn {
          from { opacity: 0; transform: translateY(8px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes studioPulse {
          0%, 100% { box-shadow: 0 10px 36px rgba(0,0,0,0.4), 0 0 0 0 rgba(201,168,76,0); }
          50% { box-shadow: 0 10px 36px rgba(0,0,0,0.4), 0 0 0 8px rgba(201,168,76,0.18); }
        }
        .ambient-breathe { animation: studioBreathe 7s ease-in-out infinite; }
        .ambient-drift { animation: studioDrift 14s ease-in-out infinite; }
        .ambient-line { animation: studioLineIn 900ms ease-out both; }
        .ambient-pulse { animation: studioPulse 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ambient-breathe, .ambient-drift, .ambient-pulse { animation: none; }
          .ambient-line { animation: none; }
        }
      `}</style>
    </div>
  );
}
