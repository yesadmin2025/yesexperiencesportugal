/**
 * Composition — Phase 3 traveller composition (adults + minor ages).
 *
 * Wraps the existing GuestStepper (adults only) with an optional minors
 * editor. Each minor row captures an exact integer age (0–17) which the
 * server prices with its owner-approved band %:
 *   - Adult 18+     100%
 *   - Youth 11–17    75%
 *   - Child  3–10    50%
 *   - Infant 0–2      0% (free)
 *
 * There is NO silent adult fallback for minors — collecting an age is
 * how we protect families from being over-charged. Total headcount
 * (adults + minors, incl. infants) is used for the per-pax tier lookup
 * per owner decision on 2026-07-14.
 *
 * Mobile-first, brand-token styled, 44×44 tap targets, visible focus.
 * No backend, no pricing math — parent owns state.
 */

import { Minus, Plus, X } from "lucide-react";
import { GuestStepper } from "./GuestStepper";
import { ageBand } from "@/data/signatureTourPricing";

const MAX_MINORS = 11;
const MAX_PARTY = 14;

interface Props {
  adults: number | null;
  adultsInferred: boolean;
  minorAges: readonly number[];
  onAdultsChange: (n: number) => void;
  onAddMinor: () => void;
  onRemoveMinor: (index: number) => void;
  onMinorAgeChange: (index: number, age: number) => void;
}

export function Composition({
  adults,
  adultsInferred,
  minorAges,
  onAdultsChange,
  onAddMinor,
  onRemoveMinor,
  onMinorAgeChange,
}: Props) {
  const effectiveAdults = typeof adults === "number" ? adults : 2;
  const totalParty = effectiveAdults + minorAges.length;
  const canAddMinor = minorAges.length < MAX_MINORS && totalParty < MAX_PARTY;

  return (
    <div className="w-full max-w-[520px]">
      <GuestStepper value={adults} inferred={adultsInferred} onChange={onAdultsChange} />

      <div
        className="mt-6 border-t pt-5"
        style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <label
            className="block text-[11px] uppercase tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-display)",
              color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
            }}
          >
            Travelling with children?
          </label>
          <span
            className="text-[11px] uppercase tracking-[0.2em] tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
            }}
          >
            {minorAges.length} · Party {totalParty}
          </span>
        </div>

        {minorAges.length === 0 ? (
          <p
            className="mt-2 text-[12.5px] leading-snug italic"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
            }}
          >
            Adds a row per child so we can price honestly by age — infants (0–2)
            are free, children (3–10) half, youth (11–17) three-quarters.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Minor travellers">
            {minorAges.map((age, i) => {
              const band = ageBand(age);
              const bandLabel =
                band === "adult"
                  ? "Adult"
                  : band === "youth"
                    ? "Youth · 75%"
                    : band === "child"
                      ? "Child · 50%"
                      : band === "infant"
                        ? "Infant · free"
                        : "Set age";
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 border px-3 py-2"
                  style={{
                    background: "var(--ivory)",
                    borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                  }}
                >
                  <span
                    className="text-[11px] uppercase tracking-[0.2em] min-w-[52px]"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                    }}
                  >
                    Child {i + 1}
                  </span>
                  <label className="flex items-center gap-2 flex-1">
                    <span className="sr-only">Age of child {i + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={17}
                      step={1}
                      value={Number.isFinite(age) ? age : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") return;
                        const n = Math.max(0, Math.min(17, Math.trunc(Number(raw))));
                        if (Number.isFinite(n)) onMinorAgeChange(i, n);
                      }}
                      className="h-11 w-16 text-center tabular-nums border bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      style={{
                        borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                        color: "var(--charcoal)",
                        fontFamily: "var(--font-display)",
                        fontSize: "18px",
                        fontWeight: 600,
                      }}
                      aria-label={`Age of child ${i + 1}`}
                    />
                    <span
                      className="text-[11px] uppercase tracking-[0.2em]"
                      style={{
                        color:
                          band && band !== "adult"
                            ? "var(--teal)"
                            : "color-mix(in oklab, var(--charcoal) 45%, transparent)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {bandLabel}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveMinor(i)}
                    className="inline-flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    aria-label={`Remove child ${i + 1}`}
                    style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
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
          onClick={onAddMinor}
          disabled={!canAddMinor}
          className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-3 border transition-[opacity,transform] hover:-translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            background: "color-mix(in oklab, var(--teal) 6%, var(--ivory))",
            borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
            color: "var(--charcoal)",
          }}
          aria-label="Add a child to the party"
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
        className="mt-4 text-[12px] leading-snug"
        style={{
          fontFamily: "var(--font-sans)",
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        }}
      >
        <Minus className="inline h-3 w-3 -mt-0.5" aria-hidden /> Ages let us
        price fairly by band — no adult fallback for minors.
      </p>
    </div>
  );
}

export default Composition;
