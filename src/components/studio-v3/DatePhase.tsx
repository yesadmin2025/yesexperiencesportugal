import { useMemo, useRef } from "react";
import type { DateMode } from "./types";

/**
 * DatePhaseControls — Phase 2 operational date selection.
 *
 * Replaces the vague "this week / next 2 weeks / flexible / exploring" cards
 * with a real operational choice:
 *   - Exact date (native <input type="date">, past dates disabled client-side)
 *   - I'm flexible
 *   - I don't know yet
 *
 * No backend, no availability check, no fake "available" labels.
 * Mobile-first, brand-token styled, sentence-case copy.
 */
export function DatePhaseControls({
  dateExact,
  dateMode,
  onPickExact,
  onPickFlexible,
  onPickUndecided,
}: {
  dateExact: string | null;
  dateMode: DateMode | null;
  onPickExact: (iso: string) => void;
  onPickFlexible: () => void;
  onPickUndecided: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const exactSelected = dateMode === "exact" && !!dateExact;
  const exactLabel = exactSelected ? formatExactLabel(dateExact!) : "Choose a date";

  return (
    <div className="mt-8 w-full max-w-[520px]">
      {/* Primary: exact date */}
      <label
        className="block text-[11px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-display)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        Choose a date
      </label>
      <button
        type="button"
        onClick={() => {
          const el = inputRef.current;
          if (!el) return;
          // Prefer showPicker when available; fall back to focus+click.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyEl = el as any;
          if (typeof anyEl.showPicker === "function") {
            try {
              anyEl.showPicker();
              return;
            } catch {
              /* fallthrough */
            }
          }
          el.focus();
          el.click();
        }}
        className="relative mt-2 w-full text-left px-4 py-3.5 min-h-[64px] border transition-[transform,border-color,background-color,box-shadow] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{
          background: exactSelected
            ? "color-mix(in oklab, var(--teal) 6%, var(--ivory))"
            : "var(--ivory)",
          borderColor: exactSelected
            ? "var(--teal)"
            : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
          boxShadow: exactSelected
            ? "0 14px 30px -18px color-mix(in oklab, var(--teal) 50%, transparent)"
            : "0 6px 18px -14px rgba(46,46,46,0.18)",
        }}
      >
        <span
          className="block text-[14px] leading-tight font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--charcoal)",
            letterSpacing: "-0.005em",
          }}
        >
          {exactLabel}
        </span>
        <span
          className="mt-1 block text-[12px] leading-snug italic"
          style={{
            fontFamily: "var(--font-serif)",
            color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
          }}
        >
          We'll shape the day around it.
        </span>
        {exactSelected ? (
          <span
            aria-hidden
            className="absolute right-3 top-3 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--gold)" }}
          />
        ) : null}
      </button>

      {/* Hidden native input — drives the picker, accessible to keyboards. */}
      <input
        ref={inputRef}
        type="date"
        min={todayIso}
        value={dateExact ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          if (v < todayIso) return; // belt-and-braces past-date guard
          onPickExact(v);
        }}
        aria-label="Choose a date"
        className="sr-only"
      />

      {/* Secondary options */}
      <div className="mt-3 grid grid-cols-1 gap-3">
        <SecondaryOption
          label="I'm flexible"
          helper="We'll suggest the best fit."
          selected={dateMode === "flexible"}
          onClick={onPickFlexible}
        />
        <SecondaryOption
          label="I don't know yet"
          helper="No rush — the idea can settle."
          selected={dateMode === "undecided"}
          onClick={onPickUndecided}
        />
      </div>
    </div>
  );
}

function SecondaryOption({
  label,
  helper,
  selected,
  onClick,
}: {
  label: string;
  helper: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left px-4 py-3.5 min-h-[64px] border transition-[transform,border-color,background-color,box-shadow] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{
        background: selected
          ? "color-mix(in oklab, var(--teal) 6%, var(--ivory))"
          : "var(--ivory)",
        borderColor: selected
          ? "var(--teal)"
          : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
        boxShadow: selected
          ? "0 14px 30px -18px color-mix(in oklab, var(--teal) 50%, transparent)"
          : "0 6px 18px -14px rgba(46,46,46,0.18)",
      }}
    >
      <span
        className="block text-[14px] leading-tight font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--charcoal)",
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
      <span
        className="mt-1 block text-[12px] leading-snug italic"
        style={{
          fontFamily: "var(--font-serif)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        {helper}
      </span>
      {selected ? (
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--gold)" }}
        />
      ) : null}
    </button>
  );
}

/** Format ISO yyyy-mm-dd into a brand-friendly long date (e.g. "Sat 12 Sep 2026"). */
export function formatExactLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return iso;
  }
}

/** Display label for downstream consumers (storyboard, lead capture if ever needed). */
export function dateDisplayLabel(
  dateMode: DateMode | null,
  dateExact: string | null,
): string {
  if (dateMode === "exact" && dateExact) return formatExactLabel(dateExact);
  if (dateMode === "flexible") return "Flexible";
  if (dateMode === "undecided") return "Date to be confirmed";
  return "";
}

/** Short next-step teaser shown beneath the date selector. */
export function dateNextTeaser(mode: DateMode): string {
  if (mode === "exact") return "Next, where the day begins.";
  if (mode === "flexible") return "Next, where the day begins.";
  return "Next, where the day begins.";
}
