import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { StudioStop } from "@/hooks/useStudioState";

/**
 * Floating, fade-in suggestions that emerge above the scene. Not cards.
 * Each chip is a single tap to accept into the itinerary.
 */
interface Props {
  suggestions: StudioStop[];
  acceptedKeys: string[];
  onAccept: (stop: StudioStop) => void;
}

export function EmergingChips({ suggestions, acceptedKeys, onAccept }: Props) {
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    setReveal(0);
    if (!suggestions.length) return;
    const timers: number[] = [];
    suggestions.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setReveal((r) => Math.max(r, i + 1)), 120 + i * 140),
      );
    });
    return () => timers.forEach(window.clearTimeout);
  }, [suggestions]);

  const available = suggestions.filter((s) => !acceptedKeys.includes(s.key));

  if (!available.length) return null;

  return (
    <ul className="flex flex-wrap gap-2.5 justify-center" role="list">
      {available.map((s, i) => {
        const visible = i < reveal;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onAccept(s)}
              className={`group inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-3.5 py-2 min-h-[40px] border border-[color:var(--gold)]/45 hover:border-[color:var(--gold)] hover:bg-[color:var(--ivory)] transition-all shadow-[0_4px_18px_rgba(0,0,0,0.25)] ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
              style={{ transitionDuration: "320ms" }}
              aria-label={`Adicionar ${s.label}`}
            >
              <Plus
                size={13}
                className="text-[color:var(--gold)] transition-transform group-hover:rotate-90"
              />
              <span className="text-[12.5px] font-semibold text-[color:var(--charcoal)] tracking-[0.01em]">
                {s.label}
              </span>
              {s.tag && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55 font-medium">
                  · {s.tag}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
