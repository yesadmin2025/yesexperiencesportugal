import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import type { DateMode } from "./types";

/**
 * DatePhaseControls — Phase 2 operational date selection.
 *
 * Uses an inline shadcn Calendar (react-day-picker) so the picker stays
 * visible until the traveller confirms a day — the previous native
 * `<input type="date">` fired and faded away on iOS, leaving people
 * unsure whether anything was picked. The calendar reads as a quiet
 * editorial surface (ivory, gold accent, hairline border) and respects
 * the brand tokens used elsewhere in Studio.
 *
 * Below the calendar two secondary options stay available:
 *   - I'm flexible
 *   - I don't know yet
 *
 * No backend, no availability check, no fake "available" labels.
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
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const initialSelected = useMemo(() => {
    if (dateMode === "exact" && dateExact) {
      const [y, m, d] = dateExact.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return undefined;
  }, [dateExact, dateMode]);

  const [selected, setSelected] = useState<Date | undefined>(initialSelected);
  const [month, setMonth] = useState<Date>(initialSelected ?? today);

  const exactSelected = dateMode === "exact" && !!dateExact;

  return (
    <div className="mt-8 w-full max-w-[520px]">
      <label
        className="block text-[11px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-display)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        Choose a date
      </label>

      {/* Inline calendar card */}
      <div
        className="mt-2 px-2 py-2 transition-[border-color,box-shadow] duration-[220ms] ease-out"
        style={{
          background: "var(--ivory)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: exactSelected
            ? "var(--teal)"
            : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
          boxShadow: exactSelected
            ? "0 14px 30px -18px color-mix(in oklab, var(--teal) 50%, transparent)"
            : "0 6px 18px -14px rgba(46,46,46,0.18)",
        }}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            if (d < today) return;
            setSelected(d);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            onPickExact(iso);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={{ before: today }}
          showOutsideDays={false}
          className="pointer-events-auto mx-auto"
        />
        {exactSelected && selected ? (
          <p
            className="px-3 pb-2 text-center text-[12px] italic"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
            }}
          >
            {formatExactLabel(toIso(selected))} — we'll shape the day around it.
          </p>
        ) : null}
      </div>

      {/* Secondary options */}
      <div className="mt-4 grid grid-cols-1 gap-3">
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

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
      data-phase-cta="date-secondary"
      data-selected={selected ? "true" : "false"}
      className="relative w-full text-left px-4 py-3.5 min-h-[64px] border transition-[transform,border-color,background-color,box-shadow] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{
        background: selected ? "color-mix(in oklab, var(--teal) 6%, var(--ivory))" : "var(--ivory)",
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
// eslint-disable-next-line react-refresh/only-export-components
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
// eslint-disable-next-line react-refresh/only-export-components
export function dateDisplayLabel(dateMode: DateMode | null, dateExact: string | null): string {
  if (dateMode === "exact" && dateExact) return formatExactLabel(dateExact);
  if (dateMode === "flexible") return "Flexible";
  if (dateMode === "undecided") return "Date to be confirmed";
  return "";
}

/** Short next-step teaser shown beneath the date selector. */
// eslint-disable-next-line react-refresh/only-export-components
export function dateNextTeaser(_mode: DateMode): string {
  return "Next, where the day begins.";
}
