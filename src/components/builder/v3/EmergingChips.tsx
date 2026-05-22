import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { StudioStop } from "@/hooks/useStudioState";

/**
 * Floating, fade-in suggestions that emerge above the scene.
 *
 * IMPORTANT — emotional surface, not a catalog: travellers don't know stop
 * names. Each chip shows the editorial blurb (or a soft fallback phrase),
 * never the internal label. The label is preserved only for accessibility.
 */
interface Props {
  suggestions: StudioStop[];
  acceptedKeys: string[];
  fallbackPhrase: string;
  addLabel: string;
  cues?: { early: string; growing: string; settled: string };
  onAccept: (stop: StudioStop) => void;
}

const CARD_CLIPS = [
  "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
  "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
  "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
] as const;

const PHRASES_BY_TAG: Record<string, string> = {
  wine: "provar devagar, sem pressa",
  gastronomy: "sentar à mesa com tempo",
  coast: "seguir a luz junto ao mar",
  nature: "respirar onde tudo abranda",
  heritage: "entrar numa história antiga",
  wellness: "abrir espaço para silêncio",
  romantic: "guardar um momento só vosso",
  family: "partilhar algo leve e bonito",
};

function emotionalPhrase(s: StudioStop, fallback: string, index: number): string {
  const tag = s.tag?.trim().toLowerCase();
  if (tag && PHRASES_BY_TAG[tag]) return PHRASES_BY_TAG[tag];
  const fallbackPhrases = [
    "seguir uma sensação luminosa",
    "deixar a viagem respirar",
    "descobrir um momento escondido",
    "ficar mais um pouco",
  ];
  return fallbackPhrases[index % fallbackPhrases.length] ?? fallback;
}

export function EmergingChips({ suggestions, acceptedKeys, fallbackPhrase, addLabel, cues, onAccept }: Props) {
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    setReveal(0);
    if (!suggestions.length) return;
    const timers: number[] = [];
    suggestions.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setReveal((r) => Math.max(r, i + 1)), 140 + i * 160),
      );
    });
    return () => timers.forEach(window.clearTimeout);
  }, [suggestions]);

  // Card-count ramp — fewer choices as confidence grows. The Studio should
  // feel knowing, not interactive. Each card still requires an explicit tap;
  // no auto-accept, no countdown, no pressure.
  const accepted = acceptedKeys.length;
  const stage: "early" | "growing" | "settled" =
    accepted >= 4 ? "settled" : accepted >= 2 ? "growing" : "early";
  const maxCards = stage === "settled" ? 1 : 2;
  const available = suggestions
    .filter((s) => !acceptedKeys.includes(s.key))
    .slice(0, maxCards);
  if (!available.length) return null;

  const eyebrow = cues?.[stage];

  return (
    <ul className="flex flex-col gap-2.5 items-center" role="list">
      {eyebrow && (
        <li
          aria-hidden="true"
          className="text-[10.5px] uppercase tracking-[0.32em] font-medium text-[color:var(--ivory)]/72 transition-opacity duration-700"
          style={{ opacity: reveal > 0 ? 1 : 0 }}
        >
          {eyebrow}
        </li>
      )}
      {available.map((s, i) => {
        const visible = i < reveal;
        const phrase = emotionalPhrase(s, fallbackPhrase, i);
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onAccept(s)}
              className="group relative overflow-hidden rounded-[5px] min-h-[86px] w-[min(86vw,380px)] border border-[color:var(--ivory)]/25 shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition-all ease-out hover:-translate-y-0.5 hover:border-[color:var(--gold)]/70"
              style={{
                transitionDuration: "420ms",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
                filter: visible ? "blur(0)" : "blur(2px)",
              }}
              aria-label={`${addLabel}: ${phrase}`}
            >
              <video
                aria-hidden="true"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                style={{ filter: "saturate(0.78) contrast(1.02) brightness(0.76)" }}
              >
                <source src={CARD_CLIPS[i % CARD_CLIPS.length]} type="video/mp4" />
              </video>
              <span className="absolute inset-0 bg-gradient-to-r from-[color:var(--charcoal)]/78 via-[color:var(--charcoal)]/38 to-transparent" />
              <span className="relative z-10 flex h-full min-h-[86px] items-center gap-2 px-4 text-left">
                <Sparkles
                  size={13}
                  className="text-[color:var(--gold)] shrink-0 transition-transform group-hover:scale-110"
                />
                <span
                  className="text-[14px] italic font-medium text-[color:var(--ivory)] tracking-[0.01em] leading-snug line-clamp-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {phrase}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
