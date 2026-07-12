// GuestCompositionPicker
//
// A per-Bókun-category guest stepper. Only categories that admin has
// CONFIRMED (mappingStatus === "confirmed") drive the picker. Each row
// shows the original Bókun title + age range so guests never guess.
//
// This picker is UI-only: pricing and totals come from the live bokun-quote
// response the parent renders. Nothing about price lives here.

import { Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { GuestMix, AgeBand } from "@/lib/pricing/ageBandPricing";
import type { MappedBokunPricingCategory } from "@/lib/pricing/bokunCategories";

type Props = {
  categories: MappedBokunPricingCategory[];
  guestMix: GuestMix;
  onChange: (mix: GuestMix) => void;
  maxCapacity?: number;
  disabled?: boolean;
};

const BAND_ORDER: AgeBand[] = ["adult", "youth", "child", "infant"];
const BAND_KEY: Record<AgeBand, keyof GuestMix> = {
  adult: "adults",
  youth: "youths",
  child: "children",
  infant: "infants",
};

function ageLabel(cat: MappedBokunPricingCategory): string {
  const hasMin = typeof cat.minAge === "number";
  const hasMax = typeof cat.maxAge === "number";
  if (hasMin && hasMax) return `${cat.minAge}–${cat.maxAge} yrs`;
  if (hasMax) return `up to ${cat.maxAge} yrs`;
  if (hasMin) return `${cat.minAge}+ yrs`;
  return "all ages";
}

export function GuestCompositionPicker({
  categories,
  guestMix,
  onChange,
  maxCapacity,
  disabled,
}: Props) {
  // Show one row per band that has at least one confirmed Bókun category.
  const confirmed = categories.filter((c) => c.mappingStatus === "confirmed");
  const byBand = new Map<AgeBand, MappedBokunPricingCategory>();
  for (const band of BAND_ORDER) {
    const match = confirmed.find((c) => c.uiBand === band);
    if (match) byBand.set(band, match);
  }

  if (byBand.size === 0) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        Guest categories for this tour are still pending confirmation. Please try again shortly.
      </div>
    );
  }

  const totalCapacityGuests =
    guestMix.adults + guestMix.youths + guestMix.children + guestMix.infants;
  const atCapacity =
    typeof maxCapacity === "number" && totalCapacityGuests >= maxCapacity;

  function setBand(band: AgeBand, next: number) {
    const key = BAND_KEY[band];
    const cat = byBand.get(band);
    const clamped = Math.max(0, Math.min(20, next));
    if (band === "adult" && clamped === 0) return; // Always at least one adult.
    const draft: GuestMix = { ...guestMix, [key]: clamped };
    if (cat?.countsTowardCapacity && maxCapacity) {
      const cap =
        draft.adults + draft.youths + draft.children + draft.infants;
      if (cap > maxCapacity) return;
    }
    onChange(draft);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <Eyebrow>
          <Users size={12} className="inline mr-1.5 -mt-0.5" />
          Guests
        </Eyebrow>
        {typeof maxCapacity === "number" ? (
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            up to {maxCapacity}
          </span>
        ) : null}
      </div>
      <div className="border border-[color:var(--border)] divide-y divide-[color:var(--border)]">
        {BAND_ORDER.filter((b) => byBand.has(b)).map((band) => {
          const cat = byBand.get(band)!;
          const key = BAND_KEY[band];
          const qty = guestMix[key];
          const minus = disabled || (band === "adult" ? qty <= 1 : qty <= 0);
          const plus = disabled || (atCapacity && cat.countsTowardCapacity);
          return (
            <div
              key={band}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm text-[color:var(--charcoal)] capitalize">
                  {band}
                  {cat.normallyFree ? (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                      free
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-[color:var(--charcoal-soft)] truncate">
                  {cat.bokunTitle} · {ageLabel(cat)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBand(band, qty - 1)}
                  disabled={minus}
                  aria-label={`Decrease ${band}`}
                  className="w-8 h-8 border border-[color:var(--border)] text-sm hover:bg-[color:var(--sand)] disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center tabular-nums text-sm">{qty}</span>
                <button
                  type="button"
                  onClick={() => setBand(band, qty + 1)}
                  disabled={plus}
                  aria-label={`Increase ${band}`}
                  className="w-8 h-8 border border-[color:var(--border)] text-sm hover:bg-[color:var(--sand)] disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
