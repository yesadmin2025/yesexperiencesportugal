import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

function emotionalPhrase(s: StudioStop, fallback: string): string {
  if (s.blurb && s.blurb.trim().length > 0) {
    const trimmed = s.blurb.trim();
    return trimmed.length > 62 ? trimmed.slice(0, 60).replace(/[\s,.;:!?]+$/, "") + "…" : trimmed;
  }
  if (s.tag && s.tag.trim().length > 0) return s.tag.trim().toLowerCase();
  return fallback;
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
    <ul className="flex flex-wrap gap-2 justify-center" role="list">
      {available.map((s, i) => {
        const visible = i < reveal;
        const phrase = emotionalPhrase(s, fallbackPhrase);
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onAccept(s)}
              className={`group inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-3.5 py-2 min-h-[40px] max-w-[78vw] border border-[color:var(--gold)]/45 hover:border-[color:var(--gold)] hover:bg-[color:var(--ivory)] shadow-[0_4px_18px_rgba(0,0,0,0.25)] transition-all ease-out`}
              style={{
                transitionDuration: "420ms",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
                filter: visible ? "blur(0)" : "blur(2px)",
              }}
              aria-label={`${addLabel}: ${s.label}`}
            >
              <Plus
                size={13}
                className="text-[color:var(--gold)] shrink-0 transition-transform group-hover:rotate-90"
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
