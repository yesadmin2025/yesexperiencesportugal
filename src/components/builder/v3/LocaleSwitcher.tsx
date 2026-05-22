import { Globe } from "lucide-react";
import { LOCALE_LABELS, type StudioLocale } from "@/hooks/useStudioLocale";

interface Props {
  locale: StudioLocale;
  onChange: (l: StudioLocale) => void;
  tone?: "light" | "dark";
}

/**
 * Discreet floating locale switcher. PT · EN · ES · FR.
 * Tap-target ≥44px, stays out of the cinematic frame.
 */
export function LocaleSwitcher({ locale, onChange, tone = "light" }: Props) {
  const items: StudioLocale[] = ["pt", "en", "es", "fr"];
  const isLight = tone === "light";
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-1 rounded-full backdrop-blur px-2 py-1 border ${
        isLight
          ? "bg-[color:var(--ivory)]/15 border-[color:var(--ivory)]/25"
          : "bg-[color:var(--charcoal)]/55 border-[color:var(--ivory)]/15"
      }`}
    >
      <Globe size={12} className={isLight ? "text-[color:var(--ivory)]/70 ml-1" : "text-[color:var(--ivory)]/60 ml-1"} aria-hidden="true" />
      {items.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={`inline-flex items-center justify-center min-w-[34px] min-h-[34px] px-1.5 rounded-full text-[10.5px] uppercase tracking-[0.22em] font-bold transition-colors ${
              active
                ? "bg-[color:var(--gold)]/85 text-[color:var(--charcoal)]"
                : isLight
                ? "text-[color:var(--ivory)]/75 hover:text-[color:var(--ivory)]"
                : "text-[color:var(--ivory)]/65 hover:text-[color:var(--ivory)]"
            }`}
          >
            {LOCALE_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
