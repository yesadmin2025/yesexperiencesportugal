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
    <div className="traveller-composition w-full">
      {/* Adults row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="text-[12px] font-medium uppercase tracking-[0.1em]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal)",
            }}
          >
            Adults
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--charcoal-soft)" }}>
            18 and over
          </p>
        </div>
        <div className="flex items-center border-y border-[color:var(--border)] bg-[color:var(--ivory)]">
          <button
            type="button"
            onClick={() => setAdults(adults - 1)}
            disabled={adults <= 1}
            className="min-w-[44px] min-h-[44px] px-3 text-sm hover:bg-[color:var(--sand)] disabled:opacity-40"
            aria-label="Decrease adults"
          >
            <Minus size={14} aria-hidden />
          </button>
          <span className="min-w-[40px] text-center text-[15px] tabular-nums" aria-live="polite">
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
        <div className="flex items-start justify-between gap-3">
          <div
            className="min-w-0 text-[12px] font-medium uppercase tracking-[0.1em]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal)",
            }}
          >
            Travelling with children?
          </div>
          <span
            className="shrink-0 text-right text-[12px] uppercase leading-snug tracking-[0.08em] tabular-nums"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--charcoal-soft)",
            }}
          >
            {minorAges.length} · Party {totalParty}
          </span>
        </div>

        {minorAges.length === 0 ? (
          <div className="mt-3 bg-[color:var(--sand)] px-4 py-3.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--charcoal)]">
              Price per traveller
            </p>
            <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[14px] text-[color:var(--charcoal)]">
              <dt>Adult · 18+</dt>
              <dd className="font-semibold">100%</dd>
              <dt>Youth · 11–17</dt>
              <dd className="font-semibold">75%</dd>
              <dt>Child · 3–10</dt>
              <dd className="font-semibold">50%</dd>
              <dt>Infant · 0–2</dt>
              <dd className="font-semibold">Free</dd>
            </dl>
          </div>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Minor travellers">
            {minorAges.map((age, i) => {
              const hasAge = Number.isFinite(age);
              const band = hasAge ? ageBand(age) : null;
              const bandLabel = !hasAge
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
                  className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-2 gap-y-1.5 border-y px-1 py-2.5 sm:grid-cols-[52px_minmax(0,1fr)_44px] sm:gap-3 sm:border sm:px-3"
                  style={{
                    background: "var(--ivory)",
                    borderColor: "color-mix(in oklab, var(--charcoal) 28%, transparent)",
                  }}
                >
                  <span
                    className="min-w-0 text-[11px] uppercase tracking-[0.14em] sm:min-w-[52px] sm:tracking-[0.2em]"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                    }}
                  >
                    Child {i + 1}
                  </span>
                    <label className="col-start-1 row-start-2 grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-2 sm:col-start-2 sm:row-start-1 sm:grid-cols-[64px_minmax(0,1fr)]">
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
                      className="h-11 w-14 max-w-full text-center tabular-nums border bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
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
                    className="col-start-2 row-span-2 row-start-1 inline-flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] sm:col-start-3 sm:row-span-1"
                    aria-label={`Remove child ${i + 1}`}
                    style={{
                      color: "var(--charcoal-soft)",
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
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 border-b border-[color:var(--gold)] px-1 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            background: "transparent",
            color: "var(--charcoal)",
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span
            className="text-[12px] font-medium uppercase tracking-[0.1em]"
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
        className="mt-4 text-[13px] leading-[1.55]"
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
