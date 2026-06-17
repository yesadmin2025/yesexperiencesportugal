import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateResolvedSignature } from "../validateReveal";
import type {
  RevealValidationFailure,
  RevealValidationResult,
} from "../validateReveal";
import type { ResolvedStudioV3Route } from "../curation";
import type { SignatureTour } from "@/data/signatureTours";
import {
  clearStudioV3AuditBuffer,
  readStudioV3AuditBuffer,
  recordStudioV3RevealValidation,
  type StudioV3RevealValidation,
} from "@/lib/studio-v3-telemetry";

type ResolvedSlice = Pick<
  ResolvedStudioV3Route,
  "skeletonTourKey" | "routePoints" | "suggestedRouteLabel" | "journeyTitle"
>;

type TourSlice = Pick<SignatureTour, "id" | "title" | "img">;

const baseResolved: ResolvedSlice = {
  skeletonTourKey: "arrabida-private",
  routePoints: [
    { index: 0, label: "Azeitão", story: "Cellars and cheese.", lat: 38.5, lng: -9 },
    { index: 1, label: "Sesimbra", story: "Fishing-village lunch.", lat: 38.4, lng: -9.1 },
  ],
  suggestedRouteLabel: "Lisbon → Azeitão · Sesimbra → Lisbon",
  journeyTitle: "Your Arrábida day",
};

const baseTour: TourSlice = {
  id: "arrabida-private",
  title: "Arrábida Private",
  img: "/img/arrabida.jpg",
};

// ---------- Deterministic PRNG so randomized tests are reproducible ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("validateResolvedSignature — baseline", () => {
  it("passes when resolved route + tour are complete", () => {
    const r = validateResolvedSignature(baseResolved, baseTour);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.tourId).toBe("arrabida-private");
  });

  it("tourId is null when skeleton key is null", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, skeletonTourKey: null },
      null,
    );
    expect(r.tourId).toBeNull();
  });

  it("does not double-flag tour-not-found when skeleton is also missing", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, skeletonTourKey: null },
      null,
    );
    expect(r.missing).toContain("no-skeleton");
    expect(r.missing).not.toContain("tour-not-found");
  });
});

// ---------- Per-field mutators ----------
type Mutator = {
  key: string;
  apply: (r: ResolvedSlice, t: TourSlice | null) => {
    resolved: ResolvedSlice;
    tour: TourSlice | null;
  };
  expected: RevealValidationFailure[];
};

const MUTATORS: Mutator[] = [
  {
    key: "skeleton-null",
    apply: (r, t) => ({ resolved: { ...r, skeletonTourKey: null }, tour: t }),
    expected: ["no-skeleton"],
  },
  {
    key: "skeleton-empty",
    apply: (r, t) => ({ resolved: { ...r, skeletonTourKey: "" }, tour: t }),
    expected: ["no-skeleton"],
  },
  {
    key: "no-stops",
    apply: (r, t) => ({ resolved: { ...r, routePoints: [] }, tour: t }),
    expected: ["no-stops"],
  },
  {
    key: "stop-label-empty",
    apply: (r, t) => ({
      resolved: {
        ...r,
        routePoints: r.routePoints.map((p, i) =>
          i === 0 ? { ...p, label: "" } : p,
        ),
      },
      tour: t,
    }),
    expected: ["stop-missing-label"],
  },
  {
    key: "stop-label-whitespace",
    apply: (r, t) => ({
      resolved: {
        ...r,
        routePoints: r.routePoints.map((p, i) =>
          i === 0 ? { ...p, label: "   " } : p,
        ),
      },
      tour: t,
    }),
    expected: ["stop-missing-label"],
  },
  {
    key: "stop-story-empty",
    apply: (r, t) => ({
      resolved: {
        ...r,
        routePoints: r.routePoints.map((p, i) =>
          i === 1 ? { ...p, story: "" } : p,
        ),
      },
      tour: t,
    }),
    expected: ["stop-missing-story"],
  },
  {
    key: "stop-story-whitespace",
    apply: (r, t) => ({
      resolved: {
        ...r,
        routePoints: r.routePoints.map((p, i) =>
          i === 1 ? { ...p, story: "  \t " } : p,
        ),
      },
      tour: t,
    }),
    expected: ["stop-missing-story"],
  },
  {
    key: "tour-null",
    apply: (r) => ({ resolved: r, tour: null }),
    expected: ["tour-not-found"],
  },
  {
    key: "tour-no-image",
    apply: (r, t) => ({
      resolved: r,
      tour: t ? { ...t, img: "" } : t,
    }),
    expected: ["tour-missing-image"],
  },
  {
    key: "tour-no-title",
    apply: (r, t) => ({
      resolved: r,
      tour: t ? { ...t, title: "  " } : t,
    }),
    expected: ["tour-missing-title"],
  },
  {
    key: "no-suggested-route",
    apply: (r, t) => ({
      resolved: { ...r, suggestedRouteLabel: "" },
      tour: t,
    }),
    expected: ["missing-suggested-route"],
  },
  {
    key: "no-journey-title",
    apply: (r, t) => ({
      resolved: { ...r, journeyTitle: "   " },
      tour: t,
    }),
    expected: ["missing-journey-title"],
  },
];

describe("validateResolvedSignature — single-field mutations", () => {
  for (const m of MUTATORS) {
    it(`flags ${m.key} → ${m.expected.join(",")}`, () => {
      const { resolved, tour } = m.apply(baseResolved, baseTour);
      const r = validateResolvedSignature(resolved, tour);
      expect(r.ok).toBe(false);
      for (const f of m.expected) {
        expect(r.missing).toContain(f);
      }
    });
  }
});

// ---------- Randomized permutations across multiple fields ----------
describe("validateResolvedSignature — randomized permutations (seeded)", () => {
  const SEEDS = [1, 7, 42, 99, 256, 1024, 4096, 9001];

  for (const seed of SEEDS) {
    it(`seed=${seed}: any mutation set yields ok=false; empty set yields ok=true`, () => {
      const rng = mulberry32(seed);
      // Run 60 random subsets per seed
      for (let trial = 0; trial < 60; trial += 1) {
        const subset = MUTATORS.filter(() => rng() < 0.45);
        let resolved: ResolvedSlice = {
          ...baseResolved,
          routePoints: baseResolved.routePoints.map((p) => ({ ...p })),
        };
        let tour: TourSlice | null = { ...baseTour };
        const expected = new Set<RevealValidationFailure>();
        for (const m of subset) {
          const out = m.apply(resolved, tour);
          resolved = out.resolved;
          tour = out.tour;
          for (const f of m.expected) expected.add(f);
        }

        // Validator suppresses tour checks when skeleton is also missing.
        if (expected.has("no-skeleton")) {
          expected.delete("tour-not-found");
          expected.delete("tour-missing-image");
          expected.delete("tour-missing-title");
        }
        // If no-stops cleared the routePoints, per-stop checks can't fire.
        if (expected.has("no-stops")) {
          expected.delete("stop-missing-label");
          expected.delete("stop-missing-story");
        }
        // If the tour itself is null, image/title sub-flags can't fire.
        if (tour === null && resolved.skeletonTourKey) {
          expected.delete("tour-missing-image");
          expected.delete("tour-missing-title");
        }

        const r = validateResolvedSignature(resolved, tour);
        if (subset.length === 0) {
          expect(r.ok, `trial ${trial} empty subset should pass`).toBe(true);
          expect(r.missing).toEqual([]);
        } else {
          expect(
            r.ok,
            `trial ${trial} subset ${subset.map((s) => s.key).join("+")} should fail`,
          ).toBe(false);
          for (const f of expected) {
            expect(
              r.missing,
              `trial ${trial} expected ${f} in ${r.missing.join(",")}`,
            ).toContain(f);
          }
          // Each entry in missing should be unique (no duplicate flags).
          expect(new Set(r.missing).size).toBe(r.missing.length);
        }
      }
    });
  }

  it("never throws on adversarial inputs", () => {
    const rng = mulberry32(31337);
    for (let i = 0; i < 200; i += 1) {
      const broken: ResolvedSlice = {
        skeletonTourKey: rng() < 0.5 ? null : (rng() < 0.5 ? "" : "id"),
        routePoints:
          rng() < 0.3
            ? []
            : Array.from({ length: Math.floor(rng() * 4) }, (_, idx) => ({
                index: idx,
                label: rng() < 0.4 ? "" : "Stop",
                story: rng() < 0.4 ? "" : "Story",
                lat: null,
                lng: null,
              })),
        suggestedRouteLabel: rng() < 0.4 ? "" : "Route",
        journeyTitle: rng() < 0.4 ? "" : "Title",
      };
      const tour: TourSlice | null =
        rng() < 0.3
          ? null
          : {
              id: "x",
              title: rng() < 0.4 ? "" : "T",
              img: rng() < 0.4 ? "" : "/i.jpg",
            };
      expect(() => validateResolvedSignature(broken, tour)).not.toThrow();
    }
  });
});

// ---------- Telemetry shape contract ----------
describe("validateResolvedSignature → telemetry payload", () => {
  beforeEach(() => {
    clearStudioV3AuditBuffer();
  });
  afterEach(() => {
    clearStudioV3AuditBuffer();
    vi.unstubAllEnvs();
  });

  it("result is assignable to StudioV3RevealValidation (structural)", () => {
    const r: RevealValidationResult = validateResolvedSignature(
      baseResolved,
      baseTour,
    );
    const payload: StudioV3RevealValidation = {
      ok: r.ok,
      missing: r.missing,
      tourId: r.tourId,
    };
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.missing)).toBe(true);
    expect(payload.tourId).toBe("arrabida-private");
  });

  it("fallback case emits a non-empty `missing` list with stable string codes", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, skeletonTourKey: null, suggestedRouteLabel: "" },
      null,
    );
    const payload: StudioV3RevealValidation = {
      ok: r.ok,
      missing: r.missing,
      tourId: r.tourId,
    };
    expect(payload.ok).toBe(false);
    expect(payload.missing.length).toBeGreaterThan(0);
    expect(payload.missing).toEqual(
      expect.arrayContaining(["no-skeleton", "missing-suggested-route"]),
    );
    for (const code of payload.missing) {
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it("recordStudioV3RevealValidation buffers when not under VITEST guard", () => {
    // Telemetry helper short-circuits under process.env.VITEST. Temporarily
    // unset it so we can prove the buffer contract end-to-end.
    vi.stubEnv("VITEST", "");
    const r = validateResolvedSignature(baseResolved, null);
    recordStudioV3RevealValidation({
      ok: r.ok,
      missing: r.missing,
      tourId: r.tourId,
    });
    const buf = readStudioV3AuditBuffer();
    expect(buf.length).toBe(1);
    expect(buf[0].kind).toBe("reveal.validation");
    const payload = buf[0].payload as StudioV3RevealValidation;
    expect(payload.ok).toBe(false);
    expect(payload.missing).toContain("tour-not-found");
    expect(payload.tourId).toBe("arrabida-private");
  });

  it("does not buffer telemetry while VITEST guard is active", () => {
    // Default test env has VITEST set — recording must be a no-op.
    expect(process.env.VITEST).toBeTruthy();
    recordStudioV3RevealValidation({
      ok: false,
      missing: ["no-skeleton"],
      tourId: null,
    });
    expect(readStudioV3AuditBuffer()).toEqual([]);
  });
});
