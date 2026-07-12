// Shared fixtures for the browser/edge pricing parity test. Import from BOTH
// `src/lib/pricing/ageBandPricing.ts` and (indirectly, via Deno test) the
// mirror `supabase/functions/_shared/ageBandPricing.ts`, so both modules
// produce byte-equivalent normalised results.

import type { BandedTiers, GuestMix, PriceBreakdown } from "@/lib/pricing/ageBandPricing";

export interface PricingFixture {
  name: string;
  tiers: BandedTiers;
  mix: Partial<GuestMix> | { guests?: number };
  expected: PriceBreakdown;
}

// Legacy flat-shape input for normaliseBandedTiers.
export const FLAT_ADULT_TIERS: Record<string, number> = { 1: 279, 2: 215, 3: 215, 4: 189 };

export const FIXTURES: PricingFixture[] = [
  {
    name: "adult-only, group of 2",
    tiers: { adult: { 1: 279, 2: 215, 3: 215, 4: 189 } },
    mix: { adults: 2 },
    expected: {
      lines: [{ band: "adult", qty: 2, unitEur: 215, subtotalEur: 430 }],
      totalEur: 430,
      billableGuests: 2,
    },
  },
  {
    name: "adult + child, bucket=3",
    tiers: {
      adult: { 1: 200, 2: 180, 3: 160 },
      child: { 1: 100, 2: 90, 3: 80 },
    },
    mix: { adults: 2, children: 1 },
    expected: {
      lines: [
        { band: "adult", qty: 2, unitEur: 160, subtotalEur: 320 },
        { band: "child", qty: 1, unitEur: 80, subtotalEur: 80 },
      ],
      totalEur: 400,
      billableGuests: 3,
    },
  },
  {
    name: "adult + youth + child + free infant",
    tiers: {
      adult: { 1: 200, 4: 150 },
      youth: { 1: 150, 4: 120 },
      child: { 1: 100, 4: 90 },
      infant: 0,
    },
    mix: { adults: 2, youths: 1, children: 1, infants: 1 },
    expected: {
      lines: [
        { band: "adult", qty: 2, unitEur: 150, subtotalEur: 300 },
        { band: "youth", qty: 1, unitEur: 120, subtotalEur: 120 },
        { band: "child", qty: 1, unitEur: 90, subtotalEur: 90 },
        { band: "infant", qty: 1, unitEur: 0, subtotalEur: 0 },
      ],
      totalEur: 510,
      billableGuests: 4,
    },
  },
  {
    name: "paid infant recorded as its own line",
    tiers: { adult: { 1: 100 }, infant: 25 },
    mix: { adults: 1, infants: 2 },
    expected: {
      lines: [
        { band: "adult", qty: 1, unitEur: 100, subtotalEur: 100 },
        { band: "infant", qty: 2, unitEur: 25, subtotalEur: 50 },
      ],
      totalEur: 150,
      billableGuests: 1,
    },
  },
  {
    name: "legacy { guests: n } input → all adults",
    tiers: { adult: { 1: 279, 2: 215 } },
    mix: { guests: 2 },
    expected: {
      lines: [{ band: "adult", qty: 2, unitEur: 215, subtotalEur: 430 }],
      totalEur: 430,
      billableGuests: 2,
    },
  },
  {
    name: "tierAt falls forward when bucket has no lower value",
    tiers: { adult: { 4: 100 } },
    mix: { adults: 2 },
    expected: {
      lines: [{ band: "adult", qty: 2, unitEur: 100, subtotalEur: 200 }],
      totalEur: 200,
      billableGuests: 2,
    },
  },
];
