/**
 * AGE_BAND_PCT single-source-of-truth guard.
 *
 * There are two independent copies of the age-band multipliers today:
 *   - src/data/signatureTourPricing.ts        (frontend + email template)
 *   - supabase/functions/_shared/pricing.ts   (Deno edge functions)
 *
 * Deno can't import from src/ and Node can't import from supabase/, so
 * the two files are kept manually in lockstep. This test reads both from
 * disk and fails the build if their AGE_BAND_PCT or the age → band
 * thresholds ever drift. When either file changes, the other must move
 * in the same commit.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const FRONTEND = readFileSync(resolve(ROOT, "src/data/signatureTourPricing.ts"), "utf8");
const EDGE = readFileSync(resolve(ROOT, "supabase/functions/_shared/pricing.ts"), "utf8");

function extractPct(src: string): Record<string, number> {
  const block = src.match(/AGE_BAND_PCT[^=]*=\s*{([\s\S]*?)}\s*;/);
  if (!block) throw new Error("AGE_BAND_PCT block not found");
  const out: Record<string, number> = {};
  for (const line of block[1].split(/\r?\n/)) {
    const m = line.match(/(adult|youth|child|infant)\s*:\s*([0-9.]+)/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

function extractThresholds(src: string): { youth: number; child: number } {
  const y =
    src.match(/a\s*>=\s*(\d+)\)\s*return\s*"youth"/) ??
    src.match(/age\s*>=\s*(\d+)\)\s*return\s*"youth"/);
  const c =
    src.match(/a\s*>=\s*(\d+)\)\s*return\s*"child"/) ??
    src.match(/age\s*>=\s*(\d+)\)\s*return\s*"child"/);
  if (!y || !c) throw new Error("ageBand thresholds not found");
  return { youth: Number(y[1]), child: Number(c[1]) };
}

describe("AGE_BAND_PCT SSOT — frontend ↔ edge function", () => {
  it("multipliers match exactly", () => {
    const front = extractPct(FRONTEND);
    const edge = extractPct(EDGE);
    // Edge omits 'adult' explicitly (handled by ageBand returning null for 18+)
    // but the map itself lists all four. Compare the four bands.
    for (const band of ["adult", "youth", "child", "infant"] as const) {
      expect(edge[band], `edge missing band '${band}'`).toBeCloseTo(front[band], 5);
    }
  });

  it("age → band thresholds match exactly (youth ≥ 11, child ≥ 3)", () => {
    const front = extractThresholds(FRONTEND);
    const edge = extractThresholds(EDGE);
    expect(edge).toEqual(front);
  });
});
