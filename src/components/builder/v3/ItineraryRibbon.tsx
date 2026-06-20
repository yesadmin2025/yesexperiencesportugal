import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import type { StudioStop } from "@/hooks/useStudioState";
import { fmtMinutes } from "@/components/builder/types";

/**
 * The emerging itinerary — emotional, not technical. Travellers see the
 * blurb (a sensory phrase), never the internal stop name. Numbered in
 * Georgia italic; the world rearranges silently on removal.
 */

interface Props {
  stops: StudioStop[];
  totalMinutes: number;
  fallbackPhrase: string;
  removeLabel: string;
  titleLabel: string;
  onRemove: (key: string) => void;
}

function ribbonPhrase(s: StudioStop, index: number, fallback: string): string {
  const tag = s.tag?.trim().toLowerCase();
  const byTag: Record<string, string> = {
    wine: "provar devagar, sem pressa",
    gastronomy: "sentar à mesa com tempo",
    coast: "seguir a luz junto ao mar",
    nature: "respirar onde tudo abranda",
    heritage: "entrar numa história antiga",
    wellness: "abrir espaço para silêncio",
  };
  if (tag && byTag[tag]) return byTag[tag];
  return [fallback, "um momento que começa a revelar-se", "uma pausa escolhida pelo teu ritmo"][
    index % 3
  ];
}

export function ItineraryRibbon({
  stops,
  totalMinutes,
  fallbackPhrase,
  removeLabel,
  titleLabel,
  onRemove,
}: Props) {
  const [recentKey, setRecentKey] = useState<string | null>(null);

  useEffect(() => {
    if (stops.length === 0) return;
    const last = stops[stops.length - 1];
    setRecentKey(last.key);
    const t = window.setTimeout(() => setRecentKey(null), 800);
    return () => window.clearTimeout(t);
  }, [stops]);

  if (stops.length === 0) return null;

  return (
    <aside
      className="rounded-[4px] bg-[color:var(--ivory)]/92 backdrop-blur-md border border-[color:var(--ivory)]/40 shadow-[0_8px_28px_rgba(0,0,0,0.28)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
      aria-label={titleLabel}
    >
      <div className="px-4 py-3 border-b border-[color:var(--charcoal)]/10 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
          {titleLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--charcoal)]/70">
          <Clock size={11} aria-hidden="true" />
          {fmtMinutes(totalMinutes)}
        </span>
      </div>
      <ol className="divide-y divide-[color:var(--charcoal)]/8 max-h-[40vh] overflow-y-auto">
        {stops.map((s, i) => {
          const phrase = ribbonPhrase(s, i, fallbackPhrase);
          return (
            <li
              key={s.key}
              className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                recentKey === s.key ? "bg-[color:var(--gold)]/8" : "bg-transparent"
              }`}
            >
              <span
                className="font-serif italic text-[color:var(--gold)] text-[20px] leading-none mt-0.5 min-w-[20px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13.5px] italic text-[color:var(--charcoal)] leading-snug"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {phrase}
                </p>
                <p className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/45 font-semibold">
                  {fmtMinutes(s.duration_minutes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(s.key)}
                className="opacity-40 hover:opacity-100 text-[color:var(--charcoal)] hover:text-[color:var(--gold)] transition-opacity min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                aria-label={removeLabel}
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
