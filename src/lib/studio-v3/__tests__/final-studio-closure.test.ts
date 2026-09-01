/**
 * FINAL STUDIO CLOSURE — the canonical Time Authority is booking truth.
 *
 * Proves the two final seams (Your Day Reserve, Stripe invocation) share ONE
 * authority, that add-on minutes are counted exactly once, that stale/deep
 * checkout states fail closed, and that protected generated files are intact.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { judgeFinalDayTime, toTimeAuthorityStops } from "@/lib/studio-v3/finalTimeGate";
import { judgeRouteTimeFit } from "@/lib/studio-v3/timeAuthority";

const STUDIO = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

const point = (id: string, minutes: number, lat: number, lng: number) => ({
  label: id,
  inventoryStopId: id,
  lat,
  lng,
  durationMinutes: minutes,
  durationSource: "inventory" as const,
});

/** A short, certified two-moment Arrábida-shaped day. */
const CERTIFIED_DAY = [point("stop-a", 60, 38.51, -9.0), point("stop-b", 75, 38.47, -9.02)];

/** Same shape, but far beyond any one-day budget. */
const OVER_LIMIT_DAY = [
  point("stop-a", 240, 38.51, -9.0),
  point("stop-b", 240, 38.47, -9.02),
  point("stop-c", 240, 38.43, -9.19),
];

describe("a certified day remains bookable", () => {
  it("returns a fitting verdict and bookable=true", () => {
    const gate = judgeFinalDayTime({ points: CERTIFIED_DAY, skeletonTourId: null });
    expect(gate.fit.evaluable).toBe(true);
    expect(gate.fit.verdict).toBe("fits");
    expect(gate.bookable).toBe(true);
    expect(gate.requiresReview).toBe(false);
  });
});

describe("an over-limit canonical day can never be reserved", () => {
  it("is not bookable and routes to review", () => {
    const gate = judgeFinalDayTime({ points: OVER_LIMIT_DAY, skeletonTourId: null });
    expect(gate.fit.verdict).toBe("over-day-budget");
    expect(gate.bookable).toBe(false);
    expect(gate.requiresReview).toBe(true);
  });

  it("never treats unproven minutes as safe", () => {
    const unproven = [
      { label: "unknown", inventoryStopId: "x", durationMinutes: null, durationSource: null },
      { label: "unknown 2", inventoryStopId: "y", durationMinutes: null, durationSource: null },
    ];
    const gate = judgeFinalDayTime({ points: unproven, skeletonTourId: null });
    expect(gate.fit.verdict).toBe("not-evaluable");
    expect(gate.bookable).toBe(false);
  });
});

describe("selected add-on minutes are counted exactly once", () => {
  it("adds the basket minutes a single time to the canonical total", () => {
    const base = judgeFinalDayTime({ points: CERTIFIED_DAY, skeletonTourId: null });
    const withAddOn = judgeFinalDayTime({
      points: CERTIFIED_DAY,
      addOnsMinutes: 45,
      skeletonTourId: null,
    });
    expect(withAddOn.fit.totalMin - base.fit.totalMin).toBe(45);
  });

  it("delegates to the canonical authority without re-implementing arithmetic", () => {
    const direct = judgeRouteTimeFit({
      stops: toTimeAuthorityStops(CERTIFIED_DAY),
      addOnsMinutes: 45,
      skeletonTourId: null,
    });
    const viaGate = judgeFinalDayTime({
      points: CERTIFIED_DAY,
      addOnsMinutes: 45,
      skeletonTourId: null,
    });
    expect(viaGate.fit).toEqual(direct);
  });

  it("can tip an otherwise fitting day over budget", () => {
    const huge = judgeFinalDayTime({
      points: CERTIFIED_DAY,
      addOnsMinutes: 10_000,
      skeletonTourId: null,
    });
    expect(huge.bookable).toBe(false);
    expect(huge.fit.verdict).toBe("over-day-budget");
  });
});

describe("structural identity and duration provenance survive the projection", () => {
  it("maps inventory/blueprint ids and provenance untouched", () => {
    const stops = toTimeAuthorityStops([
      { label: "A", blueprintStopId: "bp-1", durationMinutes: 30, durationSource: "sot-chapter" },
    ]);
    expect(stops[0]).toMatchObject({
      stopId: "bp-1",
      durationMinutes: 30,
      durationSource: "sot-chapter",
    });
  });
});

describe("the live Studio surface wires both final seams to this authority", () => {
  it("gates Your Day Reserve on the canonical day fit", () => {
    expect(STUDIO).toContain("judgeFinalDayTime");
    expect(STUDIO).toContain("finalDayGate.bookable");
    expect(STUDIO).toContain("disabled={!canReserve}");
    expect(STUDIO).toContain('data-reserve-blocked=');
  });

  it("re-derives and re-judges the exact route before any Stripe session", () => {
    expect(STUDIO).toContain("const checkoutTimeGate = judgeFinalDayTime({");
    expect(STUDIO).toContain("points: checkoutStops,");
    expect(STUDIO).toContain("addOnsMinutes: selectedAddOnMinutes,");
    const gateIdx = STUDIO.indexOf("if (!checkoutTimeGate.bookable) {");
    const invokeIdx = STUDIO.indexOf('supabase.functions.invoke("create-signature-checkout"');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(invokeIdx).toBeGreaterThan(gateIdx);
    // Fails closed to the EXISTING curator/lead path, never to Stripe.
    expect(STUDIO.slice(gateIdx, gateIdx + 220)).toContain('openLeadSheet("book")');
  });

  it("counts the add-on minutes exactly once at the checkout seam", () => {
    const seam = STUDIO.slice(
      STUDIO.indexOf("const checkoutTimeGate = judgeFinalDayTime({"),
      STUDIO.indexOf("if (!checkoutTimeGate.bookable) {"),
    );
    expect(seam.split("addOnsMinutes").length - 1).toBe(1);
  });
});

describe("protected generated files match their baseline", () => {
  /**
   * Byte-identity is still the contract; only the baseline POINTER moved.
   * The owner-mandated baseline for the brand audit artifact is the
   * pre-integration production commit, which is where the committed
   * `brand-audit.json` must stay. `prebuild`/`predev` no longer write that
   * file (see scripts/brand-audit.mjs), so a normal build cannot dirty it.
   */
  const DEFAULT_BASELINE = "8621756aaae44fd5d21f73a816dc59d30450cb08";
  const BASELINE_BY_FILE: Record<string, string> = {
    "src/generated/brand-audit.json": "6e31d58d6c858d6ab21c2b66cf7a2202bcf6a7e8",
  };
  const gitShow = (path: string) =>
    execFileSync("git", ["show", `${BASELINE_BY_FILE[path] ?? DEFAULT_BASELINE}:${path}`], {
      maxBuffer: 64 * 1024 * 1024,
    }).toString();

  for (const file of ["src/generated/brand-audit.json", ".lovable/mcp/manifest.json"]) {
    it(`${file} is byte-identical to the baseline`, () => {
      expect(readFileSync(file, "utf8")).toBe(gitShow(file));
    });
  }

  /**
   * `types.ts` carries ONE deliberate correction on top of its baseline: the
   * agreed Studio protected contract pins PostgrestVersion to "14.17", while
   * the generated baseline shipped "14.5". The contract is therefore
   * "baseline bytes, with exactly that one substitution" — strictly stronger
   * than re-pointing the test at whatever bytes happen to exist, because any
   * other drift (a regenerated schema, a reordered table) still fails.
   */
  it("src/integrations/supabase/types.ts is the baseline with PostgrestVersion corrected to 14.17", () => {
    const file = "src/integrations/supabase/types.ts";
    const actual = readFileSync(file, "utf8");
    expect(actual).toContain('PostgrestVersion: "14.17"');
    expect(actual).not.toContain('PostgrestVersion: "14.5"');
    const corrected = gitShow(file).replace(
      'PostgrestVersion: "14.5"',
      'PostgrestVersion: "14.17"',
    );
    expect(actual).toBe(corrected);
  });

  it("a normal build never rewrites the protected brand audit artifact", () => {
    const script = readFileSync("scripts/brand-audit.mjs", "utf8");
    expect(script).toContain('process.argv.includes("--write")');
    expect(script).toContain("if (WRITE) {");
  });
});
