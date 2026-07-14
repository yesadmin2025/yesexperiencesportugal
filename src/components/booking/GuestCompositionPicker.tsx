// GuestCompositionPicker — internal, provider-neutral.
// Adults + explicit ages for each minor. Age bands are resolved locally
// from src/lib/pricing/ageBands.ts. No external category dependency.

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  type TravellerComposition,
  totalParticipants,
} from "@/lib/pricing/travellerComposition";
import { bandForAge } from "@/lib/pricing/ageBands";

export type Props = {
  value: TravellerComposition;
  onChange: (next: TravellerComposition) => void;
  maxCapacity?: number;
  minAdults?: number;
  disabled?: boolean;
};

export function GuestCompositionPicker({
  value,
  onChange,
  maxCapacity,
  minAdults = 1,
  disabled,
}: Props) {
  const [draft, setDraft] = useState<TravellerComposition>(value);
  useEffect(() => setDraft(value), [value.adults, value.minorAges.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = totalParticipants(draft);
  const atCapacity = typeof maxCapacity === "number" && total >= maxCapacity;

  const emit = (next: TravellerComposition) => {
    setDraft(next);
    onChange(next);
  };

  const setAdults = (n: number) => {
    const bounded = Math.max(minAdults, n);
    if (typeof maxCapacity === "number" && bounded + draft.minorAges.length > maxCapacity) return;
    emit({ ...draft, adults: bounded });
  };

  const addMinor = () => {
    if (atCapacity) return;
    emit({ ...draft, minorAges: [...draft.minorAges, 8] });
  };

  const removeMinor = (idx: number) => {
    const next = draft.minorAges.slice();
    next.splice(idx, 1);
    emit({ ...draft, minorAges: next });
  };

  const setMinorAge = (idx: number, age: number) => {
    const bounded = Math.max(0, Math.min(17, Math.floor(age)));
    const next = draft.minorAges.slice();
    next[idx] = bounded;
    emit({ ...draft, minorAges: next });
  };

  return (
    <div className="space-y-3">
      <Eyebrow>
        <span className="inline-flex items-center gap-1.5">
          <Users size={11} /> Who is travelling?
        </span>
      </Eyebrow>

      <div className="flex items-center justify-between border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5">
        <div>
          <p className="text-[13px] text-[color:var(--charcoal)]">Adults</p>
          <p className="text-[11px] text-[color:var(--charcoal-soft)]">18+</p>
        </div>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || draft.adults <= minAdults}
            onClick={() => setAdults(draft.adults - 1)}
            aria-label="Decrease adults"
            className="min-w-[36px] min-h-[36px] border border-[color:var(--border)] disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-[24px] text-center tabular-nums">{draft.adults}</span>
          <button
            type="button"
            disabled={disabled || atCapacity}
            onClick={() => setAdults(draft.adults + 1)}
            aria-label="Increase adults"
            className="min-w-[36px] min-h-[36px] border border-[color:var(--border)] disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {draft.minorAges.map((age, idx) => {
          const band = bandForAge(age);
          return (
            <div
              key={idx}
              className="flex items-center justify-between border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5"
            >
              <div>
                <p className="text-[13px] text-[color:var(--charcoal)]">Minor {idx + 1}</p>
                <p className="text-[11px] text-[color:var(--charcoal-soft)]">{band.label}</p>
              </div>
              <div className="inline-flex items-center gap-2">
                <label className="text-[11px] text-[color:var(--charcoal-soft)]">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={17}
                  value={age}
                  disabled={disabled}
                  onChange={(e) => setMinorAge(idx, Number(e.target.value))}
                  className="w-14 min-h-[36px] border border-[color:var(--border)] px-2 text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => removeMinor(idx)}
                  aria-label={`Remove minor ${idx + 1}`}
                  className="min-w-[36px] min-h-[36px] border border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          disabled={disabled || atCapacity}
          onClick={addMinor}
          className="w-full min-h-[44px] border border-dashed border-[color:var(--border)] text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] hover:border-[color:var(--gold)] disabled:opacity-40"
        >
          + Add child or youth
        </button>
      </div>

      <p className="text-[11px] text-[color:var(--charcoal-soft)]">
        Infants (0–2) travel free · Children (3–11) 50% · Youths (12–17) 75% · Adults (18+) full price.
      </p>
    </div>
  );
}
