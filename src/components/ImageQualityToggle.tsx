import { Zap, Sparkles } from "lucide-react";
import { useImageQuality, type ImageQuality } from "@/hooks/use-image-quality";

/**
 * Compact two-state segmented control to switch imported tour images between
 * `fast` (smaller, quicker) and `crisp` (larger, sharper). Layout, card
 * dimensions and `sizes` attribute are untouched — only the proxy width hint
 * changes, so toggling never shifts the page.
 */
export function ImageQualityToggle({ className = "" }: { className?: string }) {
  const { quality, setQuality } = useImageQuality();

  const opt = (value: ImageQuality, label: string, icon: React.ReactNode, hint: string) => {
    const active = quality === value;
    return (
      <button
        key={value}
        type="button"
        aria-pressed={active}
        title={hint}
        onClick={() => setQuality(value)}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors",
          active
            ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
            : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
        ].join(" ")}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Image quality"
      className={[
        "inline-flex items-center border border-[color:var(--border)] bg-[color:var(--ivory)]",
        className,
      ].join(" ")}
    >
      <span className="px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] border-r border-[color:var(--border)]">
        Photos
      </span>
      {opt("fast", "Fast", <Zap size={11} />, "Smaller images — quicker to load")}
      {opt("crisp", "Crisp", <Sparkles size={11} />, "Larger images — sharper on retina")}
    </div>
  );
}
