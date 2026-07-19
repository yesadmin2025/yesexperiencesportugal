/**
 * CompositionField — shared adults + per-child-age control used by
 * every Signature booking form (SimpleBookingForm, Tailor,
 * FinalDetailsDialog, Studio V3 GuestDetailsStep).
 *
 * Behaviour rules (owner-approved 2026-07-14, do NOT change without
 * explicit approval):
 *   - Minimum 1 adult, max 12 adults.
 *   - Any minor row starts with a blank age; the parent must set an
 *     integer 0..17 — no default fallback, no silent adult pricing.
 *   - Bands displayed for context: infant 0–2 free · child 3–10 50%
 *     · youth 11–17 75% · adult 100%.
 *
 * Presentational only — parent owns the {adults, minorAges} state and
 * uses `isCompositionComplete()` from `@/lib/checkout/composition` to
 * decide whether the form's primary CTA can advance.
 */

import { Minus, Plus, X } from "lucide-react";
import { ageBand } from "@/data/signatureTourPricing";
import {
  MAX_ADULTS,
  MAX_MINORS,
  MAX_PARTY,
  type TravellerComposition,
} from "@/lib/checkout/composition";

interface Props {
  value: TravellerComposition;
  onChange: (next: TravellerComposition) => void;
  /** Optional cap tighter than MAX_PARTY (e.g. per-tour limit). */
  maxParty?: number;
  /** Compact = tighter spacing when the field sits inside a dialog. */
  compact?: boolean;
}

/** Sentinel used for "no age yet" — kept out of state as NaN so that
 *  isCompositionComplete() correctly rejects incomplete rows. */
const AGE_BLANK = Number.NaN;

export function CompositionField({ value, onChange, maxParty, compact }: Props) {
  const cap = Math.min(MAX_PARTY, maxParty ?? MAX_PARTY);
  const adults = Math.max(1, Math.min(MAX_ADULTS, value.adults));
  const minorAges = value.minorAges;
  const totalParty = adults + minorAges.length;
  const canAddMinor = minorAges.length < MAX_MINORS && totalParty < cap;
  const canAddAdult = adults < MAX_ADULTS && totalParty < cap;

  const setAdults = (n: number) => {
    const next = Math.max(1, Math.min(MAX_ADULTS, n));
    if (next + minorAges.length > cap) return;
    onChange({ adults: next, minorAges });
  };
  const addMinor = () => {
    if (!canAddMinor) return;
    onChange({ adults, minorAges: [...minorAges, AGE_BLANK] });
  };
  const removeMinor = (i: number) => {
    onChange({
      adults,
      minorAges: minorAges.filter((_, idx) => idx !== i),
    });
  };
  const setMinorAge = (i: number, age: number) => {
    const clamped = Math.max(0, Math.min(17, Math.trunc(age)));
    onChange({
      adults,
      minorAges: minorAges.map((v, idx) => (idx === i ? clamped : v)),
    });
  };

  return (
    <div className="w-full">
      {/* Adults row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal)",
            }}
          >
            Adults
          </div>
          <p
            className="mt-0.5 text-[11.5px]"
            style={{ color: "var(--charcoal-soft)" }}
          >
            18 and over
          </p>
        </div>
        <div className="flex items-center border border-[color:var(--border)] bg-[color:var(--ivory)]">
          <button
            type="button"
            onClick={() => setAdults(adults - 1)}
            disabled={adults <= 1}
            className="min-w-[44px] min-h-[44px] px-3 text-sm hover:bg-[color:var(--sand)] disabled:opacity-40"
            aria-label="Decrease adults"
          >
            <Minus size={14} aria-hidden />
          </button>
          <span
            className="min-w-[40px] text-center text-[15px] tabular-nums"
            aria-live="polite"
          >
            {adults}
          </span>
          <button
            type="button"
            onClick={() => setAdults(adults + 1)}
            disabled={!canAddAdult}
            className="min-w-[44px] min-h-[44px] px-3 text-sm hover:bg-[color:var(--sand)] disabled:opacity-40"
            aria-label="Increase adults"
          >
            <Plus size={14} aria-hidden />
          </button>
        </div>
      </div>

      {/* Minors block */}
      <div
        className={compact ? "mt-4 border-t pt-4" : "mt-5 border-t pt-5"}
        style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal)",
            }}
          >
            Travelling with children?
          </div>
          <span
            className="text-[11px] uppercase tracking-[0.2em] tabular-nums"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal-soft)",
            }}
          >
            {minorAges.length} · Party {totalParty}
          </span>
        </div>

        {minorAges.length === 0 ? (
          <div className="mt-3 border border-[color:var(--border)] bg-[color:var(--sand)]/35 px-3 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
              Price per traveller
            </p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[12px] text-[color:var(--charcoal)]">
              <dt>Adult · 18+</dt><dd className="font-semibold">100%</dd>
              <dt>Youth · 11–17</dt><dd className="font-semibold">75%</dd>
              <dt>Child · 3–10</dt><dd className="font-semibold">50%</dd>
              <dt>Infant · 0–2</dt><dd className="font-semibold">Free</dd>
            </dl>
          </div>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Minor travellers">
            {minorAges.map((age, i) => {
              const hasAge = Number.isFinite(age);
              const band = hasAge ? ageBand(age) : null;
              const bandLabel =
                !hasAge
                  ? "Set age"
                  : band === "youth"
                    ? "Youth · 75%"
                    : band === "child"
                      ? "Child · 50%"
                      : band === "infant"
                        ? "Infant · free"
                        : "Adult";
              return (
                <li
                  key={i}
                  className="grid grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-2 border px-2.5 py-2 sm:gap-3 sm:px-3"
                  style={{
                    background: "var(--ivory)",
                    borderColor: "color-mix(in oklab, var(--charcoal) 28%, transparent)",
                  }}
                >
                  <span
                    className="text-[11px] uppercase tracking-[0.2em] min-w-[52px]"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                    }}
                  >
                    Child {i + 1}
                  </span>
                  <label className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
                    <span className="sr-only">Age of child {i + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={17}
                      step={1}
                      value={hasAge ? age : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") return;
                        const n = Number(raw);
                        if (Number.isFinite(n)) setMinorAge(i, n);
                      }}
                      placeholder="—"
                      className="h-11 w-16 text-center tabular-nums border bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      style={{
                        borderColor: hasAge
                          ? "color-mix(in oklab, var(--charcoal) 32%, transparent)"
                          : "var(--gold)",
                        color: "var(--charcoal)",
                        fontFamily: "var(--font-display)",
                        fontSize: "18px",
                        fontWeight: 600,
                      }}
                      aria-label={`Age of child ${i + 1}`}
                      aria-invalid={!hasAge}
                    />
                    <span
                      className="min-w-0 text-[10.5px] uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.2em]"
                      style={{
                        color: !hasAge
                          ? "var(--gold-ink)"
                          : band && band !== "adult"
                            ? "var(--teal)"
                            : "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {bandLabel}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeMinor(i)}
                    className="inline-flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    aria-label={`Remove child ${i + 1}`}
                    style={{
                      color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                    }}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={addMinor}
          disabled={!canAddMinor}
          className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-3 border transition-[opacity,transform] hover:-translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            background: "color-mix(in oklab, var(--teal) 6%, var(--ivory))",
            borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
            color: "var(--charcoal)",
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {minorAges.length === 0 ? "Add a child" : "Add another"}
          </span>
        </button>

        {totalParty >= 11 ? (
          <p
            className="mt-3 px-3 py-2 border-l-2 text-[12.5px] leading-snug"
            style={{
              borderColor: "var(--gold)",
              background: "color-mix(in oklab, var(--gold) 8%, var(--ivory))",
              color: "var(--charcoal)",
              fontFamily: "var(--font-sans)",
            }}
          >
            For a party of 11+, we'll shape this as a private event.
          </p>
        ) : null}
      </div>

      <p
        className="mt-3 text-[11.5px] leading-snug"
        style={{
          fontFamily: "var(--font-sans)",
          color: "var(--charcoal-soft)",
        }}
      >
        Ages let us price fairly by band — no adult fallback for minors.
      </p>
    </div>
  );
}

export default CompositionField;
