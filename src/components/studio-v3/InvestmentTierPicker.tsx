// Studio V3 — Investment Tier picker (premium variant).
//
// Replaces the generic ChoiceGrid only for the Investment phase. Shows
// the four canonical tiers as stacked editorial cards with:
//   - Tier eyebrow + name
//   - Whisper (from INVESTMENT_TIERS — never invented)
//   - "What changes" cue line per tier (positioning only, not price)
//   - One subtle "Most chosen" gold badge anchored on `elevated`
//   - Selected state: teal border + gold inner accent
//
// No prices appear here — investment is a shaping signal, not a quote.
// Mobile-first 393×588: 4 cards stacked, 96px min height, full-width tap.

import { Sparkles, Gem, Crown, Compass, Check } from "lucide-react";
import type { InvestmentTier } from "./types";
import { INVESTMENT_TIERS } from "./types";

interface InvestmentTierPickerProps {
  value: InvestmentTier | null;
  onSelect: (tier: InvestmentTier) => void;
  /** Optional ordered list (e.g. couples-first prioritisation). Defaults to INVESTMENT_TIERS. */
  options?: ReadonlyArray<{ id: InvestmentTier; label: string; whisper: string }>;
  /** Real Signature minimum priceFrom (EUR) used to anchor indicative per-tier price hints. */
  priceFromEur?: number | null;
  /** Party size — when known, used to label "for N guests" on the price chip. */
  guests?: number | null;
}

/** Tier → indicative multiplier on the base Signature priceFrom. Calibrated
 *  against the real spread in `signatureTours` (€135–€262). `open` shows a
 *  range — never invents a single number. */
const TIER_PRICE_MULTIPLIER: Record<InvestmentTier, number | "range"> = {
  considered: 1.0,
  elevated: 1.35,
  bespoke: 1.8,
  open: "range",
};

function priceHintFor(tier: InvestmentTier, base: number | null | undefined): string | null {
  if (!base || base <= 0) return null;
  const m = TIER_PRICE_MULTIPLIER[tier];
  if (m === "range") {
    const hi = Math.round((base * 1.9) / 5) * 5;
    return `€${base} – €${hi}+ / guest`;
  }
  const v = Math.round((base * m) / 5) * 5;
  return `from €${v} / guest`;
}

const TIER_META: Record<
  InvestmentTier,
  {
    icon: typeof Sparkles;
    cue: string;
    badge?: "most-chosen";
  }
> = {
  considered: {
    icon: Sparkles,
    cue: "Beautiful essentials, no extras.",
  },
  elevated: {
    icon: Gem,
    cue: "Stronger tastings, smoother pacing, curated detail.",
    badge: "most-chosen",
  },
  bespoke: {
    icon: Crown,
    cue: "Private access, signature moments, distinctive day.",
  },
  open: {
    icon: Compass,
    cue: "YES shapes the best fit around your choices.",
  },
};

export function InvestmentTierPicker({
  value,
  onSelect,
  options = INVESTMENT_TIERS,
  priceFromEur = null,
  guests = null,
}: InvestmentTierPickerProps) {
  const showPriceHint = !!priceFromEur && priceFromEur > 0;
  const guestLabel =
    typeof guests === "number" && guests >= 1
      ? guests === 1
        ? "for 1 guest"
        : guests >= 8
          ? "for 8+ guests"
          : `for ${guests} guests`
      : null;
  return (
    <>
      <ul
        data-testid="studio-v3-investment-tier-picker"
        className="mt-4 space-y-2.5"
        role="radiogroup"
        aria-label="Experience investment"
      >
        {options.map((tier) => {
          const meta = TIER_META[tier.id];
          const Icon = meta.icon;
          const active = value === tier.id;
          const isFlagged = meta.badge === "most-chosen";
          const priceHint = priceHintFor(tier.id, priceFromEur);
          return (
            <li key={tier.id}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(tier.id)}
                data-tier={tier.id}
                data-state={active ? "active" : "inactive"}
                className="group relative w-full text-left rounded-[6px] border px-4 py-3.5 min-h-[96px] transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  background: active
                    ? "color-mix(in oklab, var(--teal) 6%, var(--ivory))"
                    : "var(--ivory)",
                  borderColor: active
                    ? "color-mix(in oklab, var(--teal) 70%, transparent)"
                    : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                  boxShadow: active
                    ? "0 10px 26px -18px color-mix(in oklab, var(--teal) 60%, transparent)"
                    : "0 4px 14px -12px color-mix(in oklab, var(--charcoal) 28%, transparent)",
                }}
              >
                {isFlagged ? (
                  <span
                    aria-hidden
                    className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] uppercase tracking-[0.24em] font-bold"
                    style={{
                      background: "var(--gold)",
                      color: "var(--charcoal)",
                      boxShadow:
                        "0 6px 14px -8px color-mix(in oklab, var(--gold) 70%, transparent)",
                    }}
                  >
                    Most chosen
                  </span>
                ) : null}

                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid place-items-center h-9 w-9 rounded-full shrink-0 transition-colors duration-200"
                    style={{
                      background: active
                        ? "var(--teal)"
                        : "color-mix(in oklab, var(--sand) 80%, transparent)",
                      color: active ? "var(--ivory)" : "var(--gold)",
                    }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-[9.5px] uppercase tracking-[0.26em] font-bold"
                        style={{
                          color: active
                            ? "var(--teal)"
                            : "color-mix(in oklab, var(--teal) 75%, transparent)",
                        }}
                      >
                        Tier
                      </p>
                      {active ? (
                        <span
                          aria-hidden
                          className="inline-flex items-center justify-center h-5 w-5 rounded-full"
                          style={{ background: "var(--gold)", color: "var(--charcoal)" }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <p
                      className="mt-0.5 text-[15px] font-semibold leading-tight"
                      style={{
                        color: "var(--charcoal)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {tier.label}
                    </p>
                    <p
                      className="mt-1 text-[12px] italic leading-snug"
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                      }}
                    >
                      {tier.whisper}
                    </p>
                    <p
                      className="mt-1.5 text-[11px] leading-snug"
                      style={{
                        color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
                      }}
                    >
                      {meta.cue}
                    </p>
                    {priceHint ? (
                      <p
                        data-testid="studio-v3-tier-price-hint"
                        data-tier-price={tier.id}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.2em] font-bold tabular-nums"
                        style={{
                          background: active
                            ? "color-mix(in oklab, var(--gold) 22%, var(--ivory))"
                            : "color-mix(in oklab, var(--sand) 60%, var(--ivory))",
                          color: "var(--charcoal)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: `color-mix(in oklab, var(--gold) ${active ? 60 : 28}%, transparent)`,
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-block h-1 w-1 rounded-full"
                          style={{ background: "var(--gold)" }}
                        />
                        {priceHint}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {showPriceHint ? (
        <p
          data-testid="studio-v3-tier-price-anchor"
          className="mt-3 text-center text-[10.5px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> Indicative
          {guestLabel ? <> · {guestLabel}</> : null} · real per-pax confirmed on the next step
        </p>
      ) : null}
    </>
  );
}
