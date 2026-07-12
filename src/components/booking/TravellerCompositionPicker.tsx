// Universal "Who is travelling?" picker — Signature, Tailored, Studio.
//
// Emits the provider-neutral `TravellerComposition`. Never decides whether
// an age is Youth/Child/Infant — that's the server's job against the
// selected Bókun product. When the server-resolved category is available,
// the picker shows it next to each minor's age (e.g. "Age 15 · Youth").
//
// Mobile-first at 393px CSS width.

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  type TravellerComposition,
  totalParticipants,
} from "@/lib/pricing/travellerComposition";

type ResolvedMinorLabel = {
  age: number;
  bandLabel: string; // e.g. "Youth" | "Child" | "Infant"
} | null;

export type Props = {
  value: TravellerComposition;
  onChange: (next: TravellerComposition) => void;
  /** Optional live-resolved label per minor index (from BookingQuote.basePricing). */
  resolvedMinors?: Array<ResolvedMinorLabel>;
  /** Server signalled an unsupported minor age — show inline error on that row. */
  unresolvedAges?: number[];
  maxCapacity?: number;
  minAdults?: number;
  disabled?: boolean;
};

export function TravellerCompositionPicker({
  value,
  onChange,
  resolvedMinors,
  unresolvedAges,
  maxCapacity,
  minAdults = 1,
  disabled,
}: Props) {
  // Local mirror so the age inputs stay editable while typing.
  const [draft, setDraft] = useState<TravellerComposition>(value);
  useEffect(() => setDraft(value), [value.adults, value.minorAges.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = totalParticipants(draft);
  const atCapacity = typeof maxCapacity === "number" && total >= maxCapacity;
  const unresolvedSet = useMemo(() => new Set(unresolvedAges ?? []), [unresolvedAges]);

  function commit(next: TravellerComposition) {
    setDraft(next);
    onChange(next);
  }

  function setAdults(next: number) {
    const clamped = Math.max(minAdults, Math.min(20, next));
    if (typeof maxCapacity === "number" && clamped + draft.minorAges.length > maxCapacity) return;
    commit({ ...draft, adults: clamped });
  }

  function setMinorCount(next: number) {
    const clamped = Math.max(0, Math.min(20 - draft.adults, next));
    if (typeof maxCapacity === "number" && draft.adults + clamped > maxCapacity) return;
    const cur = draft.minorAges;
    const nextAges =
      clamped > cur.length
        ? [...cur, ...Array(clamped - cur.length).fill(8)] // sensible child default
        : cur.slice(0, clamped);
    commit({ ...draft, minorAges: nextAges });
  }

  function setMinorAge(idx: number, ageStr: string) {
    const parsed = parseInt(ageStr, 10);
    const age = Number.isFinite(parsed) ? Math.max(0, Math.min(17, parsed)) : 0;
    const nextAges = draft.minorAges.slice();
    nextAges[idx] = age;
    commit({ ...draft, minorAges: nextAges });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <Eyebrow>
          <Users size={12} className="inline mr-1.5 -mt-0.5" />
          Who is travelling?
        </Eyebrow>
        {typeof maxCapacity === "number" ? (
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            up to {maxCapacity}
          </span>
        ) : null}
      </div>

      <div className="border border-[color:var(--border)] divide-y divide-[color:var(--border)]">
        {/* Adults */}
        <Row
          label="Adults"
          hint="18+"
          value={draft.adults}
          onDec={() => setAdults(draft.adults - 1)}
          onInc={() => setAdults(draft.adults + 1)}
          decDisabled={disabled || draft.adults <= minAdults}
          incDisabled={disabled || atCapacity}
        />

        {/* Minors */}
        <Row
          label="Travellers aged 0–17"
          hint="Youths, children, infants"
          value={draft.minorAges.length}
          onDec={() => setMinorCount(draft.minorAges.length - 1)}
          onInc={() => setMinorCount(draft.minorAges.length + 1)}
          decDisabled={disabled || draft.minorAges.length <= 0}
          incDisabled={disabled || atCapacity}
        />

        {/* Age fields, one per minor */}
        {draft.minorAges.map((age, i) => {
          const resolved = resolvedMinors?.[i] ?? null;
          const unsupported = unresolvedSet.has(age);
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <label
                  htmlFor={`minor-age-${i}`}
                  className="text-sm text-[color:var(--charcoal)]"
                >
                  Traveller {i + 1} age
                </label>
                <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                  {unsupported ? (
                    <span className="text-red-700">
                      This age is not supported for the selected experience.
                    </span>
                  ) : resolved ? (
                    <>Age {resolved.age} · {resolved.bandLabel}</>
                  ) : (
                    <>Between 0 and 17</>
                  )}
                </div>
              </div>
              <input
                id={`minor-age-${i}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={17}
                value={age}
                disabled={disabled}
                onChange={(e) => setMinorAge(i, e.target.value)}
                className="w-16 h-10 border border-[color:var(--border)] px-2 text-center tabular-nums text-sm focus:outline-none focus:border-[color:var(--teal)]"
                aria-invalid={unsupported}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
        Every traveller counts toward capacity, including free infants.
      </p>
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  hint?: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm text-[color:var(--charcoal)]">{label}</div>
        {hint ? (
          <div className="text-[11px] text-[color:var(--charcoal-soft)]">{hint}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          disabled={decDisabled}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 border border-[color:var(--border)] text-sm hover:bg-[color:var(--sand)] disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center tabular-nums text-sm">{value}</span>
        <button
          type="button"
          onClick={onInc}
          disabled={incDisabled}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 border border-[color:var(--border)] text-sm hover:bg-[color:var(--sand)] disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
