import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { BuilderImage } from "./BuilderImage";

interface StepHeadProps {
  num: number;
  eyebrow: string;
  title: string;
  onBack?: () => void;
  /** Optional total step count — renders editorial chapter marker "01 / 06". */
  totalChapters?: number;
  /** Optional Georgia italic sub-line under the title — emotional framing. */
  italicSub?: string;
}

export function StepHead({ num, eyebrow, title, onBack, totalChapters, italicSub }: StepHeadProps) {
  const chapterMark =
    totalChapters && num > 0
      ? `${String(num).padStart(2, "0")} / ${String(totalChapters).padStart(2, "0")}`
      : null;
  return (
    <div className="flex flex-col gap-3 builder-reveal">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/60 hover:text-[color:var(--charcoal)] hover:border-[color:var(--charcoal)]/30 transition-colors"
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
          <Sparkles size={12} aria-hidden="true" />
          {eyebrow}
        </span>
        {chapterMark && (
          <span
            aria-hidden="true"
            className="ml-auto inline-flex items-center text-[10px] uppercase tracking-[0.3em] font-semibold tabular-nums text-[color:var(--charcoal)]/45"
          >
            <span className="mr-2 h-px w-6 bg-[color:var(--charcoal)]/15" />
            {chapterMark}
          </span>
        )}
      </div>
      <h2 className="serif text-[1.7rem] sm:text-[2.2rem] md:text-[2.6rem] leading-[1.05] tracking-[-0.01em] font-semibold text-[color:var(--charcoal)]">
        {title}
      </h2>
      {italicSub && (
        <p
          className="-mt-1 max-w-[34ch] font-serif italic text-[15px] sm:text-[16px] leading-[1.45] text-[color:var(--charcoal)]/65"
          style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
        >
          {italicSub}
        </p>
      )}
    </div>
  );
}

interface MoodCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  /** Static fallback asset bundled with the app. */
  cover: string;
  /** Optional real image URL pulled from experience_images (preferred). */
  realCover?: { url: string; alt: string } | null;
}

export function MoodCard({ selected, onClick, label, sub, cover, realCover }: MoodCardProps) {
  const src = realCover?.url ?? cover;
  const alt = realCover?.alt ?? "";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative overflow-hidden rounded-[2px] text-left transition-all duration-300",
        "border",
        selected
          ? "border-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/40 -translate-y-[2px] shadow-[0_18px_36px_-18px_rgba(46,46,46,0.45)]"
          : "border-[color:var(--charcoal)]/10 hover:-translate-y-[2px] hover:shadow-[0_14px_28px_-16px_rgba(46,46,46,0.35)]",
      ].join(" ")}
    >
      <BuilderImage
        src={src}
        alt={alt}
        ratio="4/5"
        overlay
        rounded={false}
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      >
        {selected && (
          <span className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--gold)] text-[color:var(--charcoal)]">
            <Check size={14} strokeWidth={2.5} />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-4 sm:p-5 text-[color:var(--ivory)]">
          <span className="serif text-[1.25rem] sm:text-[1.4rem] leading-[1.1] font-semibold">
            {label}
          </span>
          <span className="text-[12.5px] tracking-wide opacity-90">{sub}</span>
        </span>
      </BuilderImage>
    </button>
  );
}

interface ChoiceTileProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  Icon: LucideIcon;
}

export function ChoiceTile({ selected, onClick, label, sub, Icon }: ChoiceTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col items-start gap-2 rounded-[2px] p-4 sm:p-5 min-h-[120px] text-left transition-all duration-300 border bg-[color:var(--ivory)]",
        selected
          ? "border-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/35 -translate-y-[2px] shadow-[0_14px_28px_-16px_rgba(46,46,46,0.4)]"
          : "border-[color:var(--charcoal)]/12 hover:-translate-y-[2px] hover:border-[color:var(--charcoal)]/30 hover:shadow-[0_10px_22px_-14px_rgba(46,46,46,0.3)]",
      ].join(" ")}
    >
      <Icon
        size={18}
        className={selected ? "text-[color:var(--gold)]" : "text-[color:var(--charcoal)]/55"}
        strokeWidth={1.6}
      />
      <span className="serif text-[1.05rem] leading-[1.15] font-semibold text-[color:var(--charcoal)]">
        {label}
      </span>
      <span className="text-[12.5px] text-[color:var(--charcoal)]/65 leading-snug">{sub}</span>
      {selected && (
        <span className="absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--gold)] text-[color:var(--charcoal)]">
          <Check size={12} strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}

interface ChoiceRowProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  /** Optional override for the SR-announced label (defaults to `${label}. ${sub}`). */
  ariaLabel?: string;
  /** Optional id of an element that further describes this row. */
  ariaDescribedBy?: string;
}

export function ChoiceRow({
  selected,
  onClick,
  label,
  sub,
  ariaLabel,
  ariaDescribedBy,
}: ChoiceRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel ?? `${label}. ${sub}`}
      aria-describedby={ariaDescribedBy}
      className={[
        "relative flex items-center justify-between gap-4 rounded-[2px] p-4 sm:p-5 text-left transition-all duration-300 border bg-[color:var(--ivory)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]",
        selected
          ? "border-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/35 -translate-y-[1px]"
          : "border-[color:var(--charcoal)]/12 hover:border-[color:var(--charcoal)]/30",
      ].join(" ")}
    >
      <span className="flex flex-col gap-1">
        <span className="serif text-[1.05rem] leading-[1.15] font-semibold text-[color:var(--charcoal)]">
          {label}
        </span>
        <span className="text-[12.5px] text-[color:var(--charcoal)]/65 leading-snug">{sub}</span>
      </span>
      <span
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          selected
            ? "bg-[color:var(--gold)] text-[color:var(--charcoal)]"
            : "bg-[color:var(--charcoal)]/5 text-[color:var(--charcoal)]/0",
        ].join(" ")}
        aria-hidden="true"
      >
        <Check size={13} strokeWidth={2.5} />
      </span>
      {/* SR-only redundant status — aria-pressed already announces, this gives extra clarity in some readers */}
      <span className="sr-only">{selected ? " — selected" : ""}</span>
    </button>
  );
}

/**
 * Step indicator rendered above each selection step.
 *
 * Shows a textual label ("Step 01 / 04") and a row of slim bars.
 * `step` is the user-facing 1-based index (1..total). The builder route
 * has 8 internal phases (0 entry, 1 mood, 2 who, 3 intention, 4 pace,
 * 5 predictive, 6 live, 7 review) — only call this for the four
 * selection phases (1..4), where `total === 4`.
 *
 * Accessibility: rendered as a `progressbar` with `aria-valuenow`,
 * `aria-valuemin`, `aria-valuemax` so assistive tech reads the right
 * position even while the visual bars animate.
 */
export function ProgressDots({
  step,
  total,
  showLabel = true,
}: {
  step: number;
  total: number;
  /** When true (default) prepend "Step 01 / 04". Set false for compact mode. */
  showLabel?: boolean;
}) {
  // Clamp to the visible range so an out-of-flow step never shows "05/04".
  const current = Math.max(1, Math.min(step, total));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className="flex items-center gap-3"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
      data-testid="builder-progress"
    >
      {showLabel && (
        <span
          className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal-soft)] tabular-nums"
          data-testid="builder-progress-label"
        >
          Step <span className="text-[color:var(--charcoal)]">{pad(current)}</span>
          {" / "}
          {pad(total)}
        </span>
      )}
      <ol className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const done = current > n;
          const active = current === n;
          return (
            <li
              key={n}
              className={[
                "h-[3px] rounded-full transition-all duration-200 ease-out",
                done || active ? "bg-[color:var(--gold)]" : "bg-[color:var(--charcoal)]/15",
                active ? "w-10" : "w-6",
              ].join(" ")}
            />
          );
        })}
      </ol>
    </div>
  );
}
