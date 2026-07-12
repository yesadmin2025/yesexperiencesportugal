// Age-band pricing helper. Single source of truth for turning a guest mix
// (adults / youths / children / infants) + a tour_price_tiers row into a
// per-line price breakdown that every visible surface renders identically.
//
// Accepts BOTH tier shapes:
//   1. Legacy flat:  { "1": 279, "2": 215, ... "8": 159 }        (adult only)
//   2. Banded:       { adult: {...}, youth?: {...}, child?: {...}, infant?: 0 }
//
// Tier lookup uses `billableGuests` (adults + youths + children) bucketed
// 1..8 — same scheme the existing checkout uses. Infants never contribute
// to the bucket and default to €0 unless the tour explicitly sets a price.

export type AgeBand = "adult" | "youth" | "child" | "infant";

export type GuestMix = {
  adults: number;
  youths: number;
  children: number;
  infants: number;
};

export type BandTier = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>>;

export type BandedTiers = {
  adult: BandTier;
  youth?: BandTier;
  child?: BandTier;
  infant?: number; // flat per-pax EUR (usually 0)
};

export type PriceBreakdownLine = {
  band: AgeBand;
  qty: number;
  unitEur: number;
  subtotalEur: number;
};

export type PriceBreakdown = {
  lines: PriceBreakdownLine[];
  totalEur: number;
  billableGuests: number;
};

const EMPTY_MIX: GuestMix = { adults: 0, youths: 0, children: 0, infants: 0 };

/**
 * Normalise either the legacy flat shape or the banded shape into BandedTiers.
 * Returns null when the input is unusable.
 */
export function normaliseBandedTiers(raw: unknown): BandedTiers | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const isFlat = ["1", "2", "3", "4", "5", "6", "7", "8"].some(
    (k) => typeof r[k] === "number",
  );
  if (isFlat && !r.adult && !r.youth && !r.child) {
    return { adult: pickTier(r) };
  }

  const out: BandedTiers = { adult: pickTier(r.adult) };
  if (r.youth) out.youth = pickTier(r.youth);
  if (r.child) out.child = pickTier(r.child);
  if (typeof r.infant === "number" && Number.isFinite(r.infant) && r.infant >= 0) {
    out.infant = Math.round(r.infant);
  }
  return out;
}

function pickTier(raw: unknown): BandTier {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: BandTier = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!["1", "2", "3", "4", "5", "6", "7", "8"].includes(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    (out as Record<string, number>)[k] = Math.round(n);
  }
  return out;
}

/** Return the nearest lower-or-equal tier value for `bucket` (1..8). */
export function tierAt(tier: BandTier, bucket: number): number | null {
  const b = Math.min(8, Math.max(1, Math.round(bucket)));
  for (let i = b; i >= 1; i--) {
    const v = (tier as Record<string, number | undefined>)[String(i)];
    if (typeof v === "number" && v > 0) return v;
  }
  // Nothing at or below — try upward as last resort.
  for (let i = b + 1; i <= 8; i++) {
    const v = (tier as Record<string, number | undefined>)[String(i)];
    if (typeof v === "number" && v > 0) return v;
  }
  return null;
}

export function coerceGuestMix(input: Partial<GuestMix> | { guests?: number } | null | undefined): GuestMix {
  if (!input || typeof input !== "object") return { ...EMPTY_MIX };
  const anyInput = input as Record<string, unknown>;
  // Backward compat: a bare { guests: n } becomes all adults.
  if (
    typeof anyInput.guests === "number" &&
    anyInput.adults === undefined &&
    anyInput.youths === undefined &&
    anyInput.children === undefined
  ) {
    return {
      adults: clampInt(anyInput.guests, 0, 20),
      youths: 0,
      children: 0,
      infants: 0,
    };
  }
  return {
    adults: clampInt(anyInput.adults, 0, 20),
    youths: clampInt(anyInput.youths, 0, 20),
    children: clampInt(anyInput.children, 0, 20),
    infants: clampInt(anyInput.infants, 0, 20),
  };
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function billableGuests(mix: GuestMix): number {
  return mix.adults + mix.youths + mix.children;
}

/**
 * Resolve a banded price breakdown. Bands the tour does not price are DROPPED
 * from the breakdown (their qty is silently ignored). Callers should check
 * `supportedBands(tiers)` before showing steppers for youth/child.
 */
export function resolveBandedPrice(
  tiers: BandedTiers,
  mixInput: Partial<GuestMix> | { guests?: number },
): PriceBreakdown {
  const mix = coerceGuestMix(mixInput);
  const bucket = Math.max(1, billableGuests(mix));
  const lines: PriceBreakdownLine[] = [];

  const push = (band: AgeBand, qty: number, unitEur: number | null) => {
    if (qty <= 0 || unitEur == null) return;
    lines.push({ band, qty, unitEur, subtotalEur: unitEur * qty });
  };

  push("adult", mix.adults, tierAt(tiers.adult, bucket));
  if (tiers.youth) push("youth", mix.youths, tierAt(tiers.youth, bucket));
  if (tiers.child) push("child", mix.children, tierAt(tiers.child, bucket));
  if (mix.infants > 0) {
    const infantEur = typeof tiers.infant === "number" ? tiers.infant : 0;
    // Always record infants so the UI can show "Infants — free".
    lines.push({
      band: "infant",
      qty: mix.infants,
      unitEur: infantEur,
      subtotalEur: infantEur * mix.infants,
    });
  }

  const totalEur = lines.reduce((s, l) => s + l.subtotalEur, 0);
  return { lines, totalEur, billableGuests: billableGuests(mix) };
}

export function supportedBands(tiers: BandedTiers): AgeBand[] {
  const out: AgeBand[] = ["adult"];
  if (tiers.youth && Object.keys(tiers.youth).length) out.push("youth");
  if (tiers.child && Object.keys(tiers.child).length) out.push("child");
  if (typeof tiers.infant === "number") out.push("infant");
  return out;
}
