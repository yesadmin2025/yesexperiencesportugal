import { Minus, Plus } from "lucide-react";

/**
 * GuestStepper — Phase 3 exact guest count selector.
 *
 * Replaces the vague bucket cards ("3–4", "5–6", …) with a real operational
 * input: a minus / number / plus stepper bound to a true count (1–14).
 * The number is the source of truth for future pricing, vehicles, guide
 * planning and private-event logic.
 *
 * Mobile-first, brand-token styled, 44×44 tap targets, visible focus.
 * No backend, no pricing, no availability.
 */

const MIN = 1;
const MAX = 14;
const PRIVATE_EVENT_THRESHOLD = 11;

/** Bucket label used only for storyboard/lead display (NOT state). */
// eslint-disable-next-line react-refresh/only-export-components
export function guestBucketLabel(count: number): string {
  if (count <= 1) return "Just me";
  if (count === 2) return "Two";
  if (count <= 4) return "Three or four";
  if (count <= 6) return "Five or six";
  if (count <= 10) return "Seven to ten";
  return "Eleven or more";
}

interface Props {
  value: number | null;
  inferred: boolean;
  onChange: (next: number) => void;
}

export function GuestStepper({ value, inferred, onChange }: Props) {
  // Start at the inferred / current value if any, otherwise 2 (most common).
  const current = typeof value === "number" ? value : 2;
  const isPrivate = current >= PRIVATE_EVENT_THRESHOLD;

  const dec = () => onChange(Math.max(MIN, current - 1));
  const inc = () => onChange(Math.min(MAX, current + 1));

  const helper = inferred
    ? "Assumed for this draft — adjust if you like."
    : "This helps us shape the vehicle, pace and table.";

  return (
    <div className="mt-8 w-full max-w-[520px]">
      <label
        className="block text-[11px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-display)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        Guests
      </label>

      <div
        className="mt-3 flex items-center justify-between px-3 py-2 border"
        style={{
          background: "var(--ivory)",
          borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)",
          boxShadow: "0 6px 18px -14px rgba(46,46,46,0.18)",
        }}
        role="group"
        aria-label="Guest count"
      >
        <StepperButton aria-label="Decrease guest count" onClick={dec} disabled={current <= MIN}>
          <Minus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </StepperButton>

        <div
          className="flex flex-col items-center justify-center min-w-[88px]"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className="text-[34px] leading-none font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--charcoal)",
              letterSpacing: "-0.01em",
            }}
          >
            {current}
          </span>
          <span
            className="mt-1 text-[11px] uppercase tracking-[0.2em]"
            style={{
              fontFamily: "var(--font-display)",
              color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
            }}
          >
            {current === 1 ? "guest" : "guests"}
          </span>
        </div>

        <StepperButton aria-label="Increase guest count" onClick={inc} disabled={current >= MAX}>
          <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </StepperButton>
      </div>

      <p
        className="mt-3 text-[12.5px] leading-snug italic"
        style={{
          fontFamily: "var(--font-serif)",
          color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
        }}
      >
        {helper}
      </p>

      {isPrivate ? (
        <p
          className="mt-3 px-3 py-2 border-l-2 text-[12.5px] leading-snug"
          style={{
            borderColor: "var(--gold)",
            background: "color-mix(in oklab, var(--gold) 8%, var(--ivory))",
            color: "var(--charcoal)",
            fontFamily: "var(--font-sans)",
          }}
        >
          For 11+, we'll shape this as a private event.
        </p>
      ) : null}
    </div>
  );
}

function StepperButton({
  children,
  onClick,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-11 items-center justify-center border transition-[transform,border-color,background-color,opacity] duration-[180ms] ease-out motion-reduce:transition-none hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      style={{
        background: "color-mix(in oklab, var(--teal) 6%, var(--ivory))",
        borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
        color: "var(--charcoal)",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
