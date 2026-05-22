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
  onAccept: (stop: StudioStop) => void;
}

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

export function EmergingChips({ suggestions, acceptedKeys, fallbackPhrase, addLabel, onAccept }: Props) {
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

  const available = suggestions.filter((s) => !acceptedKeys.includes(s.key));
  if (!available.length) return null;

  return (
    <ul className="flex flex-col gap-2.5 items-center" role="list">
      {available.map((s, i) => {
        const visible = i < reveal;
        const phrase = emotionalPhrase(s, fallbackPhrase, i);
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onAccept(s)}
              className={`group inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/94 backdrop-blur px-4 py-3 min-h-[46px] max-w-[82vw] border border-[color:var(--gold)]/40 hover:border-[color:var(--gold)] hover:bg-[color:var(--ivory)] shadow-[0_8px_26px_rgba(0,0,0,0.28)] transition-all ease-out`}
              style={{
                transitionDuration: "420ms",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
                filter: visible ? "blur(0)" : "blur(2px)",
              }}
              aria-label={`${addLabel}: ${phrase}`}
            >
              <Sparkles
                size={13}
                className="text-[color:var(--gold)] shrink-0 transition-transform group-hover:scale-110"
              />
              <span
                className="text-[13px] italic font-medium text-[color:var(--charcoal)] tracking-[0.01em] leading-snug line-clamp-2 text-left"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {phrase}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
