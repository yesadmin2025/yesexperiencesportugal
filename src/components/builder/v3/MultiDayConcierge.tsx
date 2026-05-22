import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { StudioDict } from "@/hooks/useStudioLocale";
import type { Intention, Mood, Who } from "@/components/builder/types";
import { BUILDER_WA_NUMBER } from "@/components/builder/types";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { useStudioLocale } from "@/hooks/useStudioLocale";
import { composeStudioMoment } from "@/server/studioNarrative.functions";

/**
 * MultiDayConcierge — elevated, in-Studio white-glove scene shown when the
 * traveller chooses a multi-day journey. NOT a fallback. Stays in the
 * cinematic stage (no modal, no chrome switch) and uses memory chips of the
 * choices already made to prove the system remembers them.
 */

interface Props {
  t: StudioDict;
  mood: Mood | null;
  who: Who | null;
  intention: Intention | null;
  onBack: () => void;
}

const HERO_CLIP = "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4";

function labelFor<T extends string>(opts: { value: T; label: string }[], v: T | null) {
  if (!v) return null;
  return opts.find((o) => o.value === v)?.label ?? null;
}

export function MultiDayConcierge({ t, mood, who, intention, onBack }: Props) {
  const moodLabel = labelFor(t.moodOptions, mood);
  const whoLabel = labelFor(t.whoOptions, who as Who | null);
  const intentionLabel = labelFor(t.intentionOptions, intention);
  const chips = [moodLabel, whoLabel, intentionLabel].filter(Boolean) as string[];

  const sessionId = useBuilderSessionId();
  const { locale } = useStudioLocale();
  const composeFn = useServerFn(composeStudioMoment);
  const [editorLine, setEditorLine] = useState<string | null>(null);
  const firedRef = useRef(false);

  /* Private-editor voice — single quiet AI line under the title. Fires
     once per mount, never repeats. Reduced-motion users see fallback copy. */
  useEffect(() => {
    if (!sessionId || firedRef.current) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    firedRef.current = true;
    let cancelled = false;
    composeFn({
      data: {
        sessionId,
        mode: "narrative",
        locale,
        mood,
        who,
        intention,
        journeyType: "multi",
        narrativeStage: "recognition",
        confidence: 0.7,
        acceptedCount: 0,
      },
    })
      .then((r) => {
        if (cancelled) return;
        if (r.mode === "narrative" && r.fragment) setEditorLine(r.fragment);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId, locale, mood, who, intention, composeFn]);

  const waText = encodeURIComponent(
    `Olá! Quero desenhar uma viagem de vários dias em Portugal.\n` +
      chips.map((c) => `• ${c}`).join("\n"),
  );
  const waHref = `https://wa.me/${BUILDER_WA_NUMBER}?text=${waText}`;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[color:var(--charcoal)] animate-in fade-in duration-[700ms]">
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.45, filter: "saturate(0.78) contrast(1.04) brightness(0.7)" }}
      >
        <source src={HERO_CLIP} type="video/mp4" />
      </video>
      <span className="absolute inset-0 bg-gradient-to-b from-[color:var(--charcoal)]/55 via-[color:var(--charcoal)]/35 to-[color:var(--charcoal)]/85" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <button
          type="button"
          onClick={onBack}
          className="self-start inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/65 hover:text-[color:var(--ivory)] transition-colors"
        >
          <ArrowLeft size={11} />
          {t.conciergeBack}
        </button>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-3 duration-[900ms]">
          <span className="inline-flex items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-[0.34em] font-bold text-[color:var(--gold)]">
            <Sparkles size={12} />
            Concierge
          </span>
          <h2
            className="mt-3 text-[26px] sm:text-[32px] font-semibold leading-[1.12] text-[color:var(--ivory)]"
            style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
          >
            {t.conciergeTitle}
          </h2>
          <p
            className="mt-4 text-[14px] sm:text-[15px] italic leading-snug text-[color:var(--ivory)]/75"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t.conciergeSub}
          </p>

          {editorLine && (
            <p
              className="mt-3 text-[13.5px] sm:text-[14.5px] italic leading-snug text-[color:var(--ivory)]/65 max-w-[34ch] mx-auto animate-in fade-in duration-[900ms]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              aria-live="polite"
            >
              {editorLine}
            </p>
          )}

          {chips.length > 0 && (
            <ul
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="Memory of your choices"
            >
              {chips.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] px-3 py-1.5 rounded-full border border-[color:var(--gold)]/55 bg-[color:var(--ivory)]/[0.04] backdrop-blur-sm"
                  style={{
                    boxShadow: "0 0 0 1px color-mix(in oklab, var(--gold) 18%, transparent) inset",
                  }}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col items-stretch gap-2.5">
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-[3px] bg-[color:var(--ivory)] text-[color:var(--charcoal)] px-5 py-3 text-[12.5px] uppercase tracking-[0.22em] font-bold transition-all hover:bg-[color:var(--gold)]/95 active:scale-[0.985] shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
            >
              <MessageCircle size={14} />
              {t.conciergeBegin}
            </a>
            <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/55 mt-2">
              {t.conciergeTrust}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
