/**
 * StudioConversionHud — invisible-by-default progress signal.
 *
 * Studio Philosophy v6 (canonical): the interface progressively disappears.
 * The previous chip ("STEP 4 of 14 · ●●●●○○○○ · 62% match · €145+ /guest")
 * was configurator/OTA chrome — exactly what the Bible forbids. It also
 * duplicated information already whispered by `PriceWhisper`,
 * `EncouragementBar` and the live story.
 *
 * Now this component is a single 1px gold hairline anchored to the very
 * top edge of the frame. It grows from left to right as chapters advance.
 * No numbers, no dots, no labels, no shadow, no blur. The cinematic
 * backdrop is what the user is meant to see.
 *
 * Props are kept stable so callers don't need to change.
 */
interface Props {
  index: number;
  total: number;
  /** Kept for API stability — not surfaced in the cinematic frame. */
  confidence?: number;
  pricePerGuestFrom?: number;
  stepLabel?: string;
  ofLabel?: string;
  fast?: boolean;
}

export function StudioConversionHud({ index, total }: Props) {
  const safeTotal = Math.max(1, total);
  const stepNumber = Math.min(safeTotal, Math.max(1, index + 1));
  const pct = Math.max(0, Math.min(1, stepNumber / safeTotal));

  return (
    <div
      role="progressbar"
      aria-label="Journey progress"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="absolute top-0 inset-x-0 z-[45] pointer-events-none h-[2px] motion-safe:animate-[fade-in_0.9s_ease-out_both]"
    >
      <div
        className="h-full origin-left transition-[width] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `${pct * 100}%`,
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--gold) 0%, transparent) 0%, color-mix(in oklab, var(--gold) 70%, transparent) 35%, var(--gold) 100%)",
          boxShadow: "0 0 10px color-mix(in oklab, var(--gold) 45%, transparent)",
        }}
      />
    </div>
  );
}
