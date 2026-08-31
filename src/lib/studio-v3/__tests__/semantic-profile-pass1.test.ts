import { describe, expect, it } from "vitest";

import { buildExperienceProfile } from "@/lib/studio-v3/livingAtlasBridge";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import {
  projectSemanticProfile,
  semanticRankEquals,
} from "@/lib/studio-v3/semanticProfileProjection";
import type { SemanticSourceEvent } from "@/lib/studio-v3/semanticSourceEvents";
import type { Feeling, Interest } from "@/components/studio-v3/types";

const FIVE: Interest[] = ["wine", "gastronomy", "coast", "heritage", "faith"];

describe("BUILD 2 Pass 1 — derived semantic profile", () => {
  it("A1 retains all five explicit interests in the full profile", () => {
    const profile = deriveSemanticProfile({ feeling: "wine-food", interests: FIVE });
    expect(profile.contentInterests.map((s) => s.value).sort()).toEqual([...FIVE].sort());
    // wine + gastronomy stay distinct signals
    expect(profile.contentInterests.filter((s) => s.value === "wine")).toHaveLength(1);
    expect(profile.contentInterests.filter((s) => s.value === "gastronomy")).toHaveLength(1);
  });

  it("A2 defers dimensions beyond the compatibility limit instead of erasing them", () => {
    const profile = deriveSemanticProfile({ feeling: null, interests: FIVE });
    const projection = projectSemanticProfile(profile);
    expect(projection.represented).toHaveLength(3);
    expect(projection.deferred.length).toBeGreaterThan(0);
    for (const entry of projection.deferred) {
      expect(entry.sourceSignals.length).toBeGreaterThan(0);
      expect(["equal-priority-capacity-boundary", "lower-ranked-overflow"]).toContain(
        entry.reason,
      );
    }
    const all = [...projection.represented, ...projection.deferred.map((d) => d.dimension)];
    expect(new Set(all).size).toBe(all.length);
    expect(projection.rationale.some((r) => r.startsWith("deferred:"))).toBe(true);
  });

  it("A3 is deterministic for identical input", () => {
    const input = { feeling: "coastal" as Feeling, interests: FIVE, rhythm: "slow" as const };
    expect(deriveSemanticProfile(input)).toEqual(deriveSemanticProfile(input));
    expect(projectSemanticProfile(deriveSemanticProfile(input))).toEqual(
      projectSemanticProfile(deriveSemanticProfile(input)),
    );
  });

  it("A4 semantic ranking and represented set are independent of input array order", () => {
    const a = projectSemanticProfile(deriveSemanticProfile({ feeling: null, interests: FIVE }));
    const reversed = [...FIVE].reverse();
    const b = projectSemanticProfile(
      deriveSemanticProfile({ feeling: null, interests: reversed }),
    );
    expect(b.represented).toEqual(a.represented);
    expect(b.deferred.map((d) => d.dimension)).toEqual(a.deferred.map((d) => d.dimension));

    const semanticA = deriveSemanticProfile({ feeling: null, interests: FIVE });
    const semanticB = deriveSemanticProfile({ feeling: null, interests: reversed });
    expect(semanticB.contentInterests.map((s) => s.key)).toEqual(
      semanticA.contentInterests.map((s) => s.key),
    );
  });

  it("A5 explicit rejection defeats conflicting inference", () => {
    const events: SemanticSourceEvent[] = [
      {
        provenance: "ai-interpretation",
        domain: "interest",
        value: "wine",
        polarity: "positive",
        confidence: 0.9,
      },
      {
        provenance: "deterministic-inference",
        domain: "interest",
        value: "wine",
        polarity: "positive",
        confidence: 0.8,
      },
      {
        provenance: "rejection",
        domain: "interest",
        value: "wine",
        polarity: "negative",
        confidence: 1,
      },
    ];
    const profile = deriveSemanticProfile({ feeling: null, interests: [], events });
    expect(profile.contentInterests.map((s) => s.value)).not.toContain("wine");
    expect(profile.explicitExclusions.map((s) => s.key)).toContain("interest:wine");
    expect(
      profile.semanticSignals.find((s) => s.key === "interest:wine" && s.polarity === "positive")
        ?.defeatedByExclusion,
    ).toBe(true);
  });

  it("A6 eventId/createdAt never change the derived profile", () => {
    const base: SemanticSourceEvent = {
      provenance: "explicit-free-text",
      domain: "interest",
      value: "coast",
      polarity: "positive",
      confidence: 1,
    };
    const withMeta: SemanticSourceEvent = { ...base, eventId: "abc", createdAt: "2026-01-01" };
    const other: SemanticSourceEvent = { ...base, eventId: "zzz", createdAt: "2030-12-31" };
    expect(deriveSemanticProfile({ feeling: null, interests: [], events: [withMeta] })).toEqual(
      deriveSemanticProfile({ feeling: null, interests: [], events: [other] }),
    );
  });

  it("A10 profile carries no supplier, price, stop or timetable data", () => {
    const profile = deriveSemanticProfile({
      feeling: "wine-food",
      interests: FIVE,
      rhythm: "slow",
      destinationIntent: "arrabida-setubal-azeitao",
      companions: "couple",
      occasion: "anniversary",
      experienceDurationClass: "full-day",
    });
    const json = JSON.stringify(profile);
    for (const forbidden of ["price", "eur", "€", "supplier", "stopId", "availability", ":00"]) {
      expect(json.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("BUILD 2 Pass 1 audit — authority and exclusions", () => {
  it("an AI negative does NOT suppress an explicit UI positive", () => {
    const profile = deriveSemanticProfile({
      feeling: null,
      interests: ["wine"],
      events: [
        {
          provenance: "ai-interpretation",
          domain: "interest",
          value: "wine",
          polarity: "negative",
          confidence: 1,
        },
      ],
    });
    expect(profile.contentInterests.map((s) => s.value)).toContain("wine");
    expect(profile.explicitExclusions).toHaveLength(0);
  });

  it("a confirmed explicit free-text rejection cannot be weakened by AI", () => {
    const profile = deriveSemanticProfile({
      feeling: null,
      interests: [],
      events: [
        {
          provenance: "explicit-free-text",
          domain: "interest",
          value: "faith",
          polarity: "negative",
          confidence: 1,
        },
        {
          provenance: "ai-interpretation",
          domain: "interest",
          value: "faith",
          polarity: "positive",
          confidence: 1,
        },
      ],
    });
    expect(profile.contentInterests.map((s) => s.value)).not.toContain("faith");
    expect(profile.explicitExclusions.map((s) => s.key)).toContain("interest:faith");
  });
});

describe("BUILD 2 Pass 1 audit — FIX 5 equal-rank capacity boundary", () => {
  const equalRank = projectSemanticProfile(
    deriveSemanticProfile({ feeling: null, interests: FIVE }),
  );

  it("reports an unresolved equal-rank boundary for equal-authority interests", () => {
    expect(equalRank.priorityBoundary.status).toBe("unresolved-equal-rank");
    expect(equalRank.priorityBoundary.boundaryRank).toBeDefined();
  });

  it("tiedDimensions contains both sides of the cutoff rank group", () => {
    const tied = equalRank.priorityBoundary.tiedDimensions;
    const deferredDims = equalRank.deferred.map((d) => d.dimension);
    expect(tied.some((d) => equalRank.represented.includes(d))).toBe(true);
    expect(tied.some((d) => deferredDims.includes(d))).toBe(true);
  });

  it("deferred entries at an equal-rank split use equal-priority-capacity-boundary", () => {
    const tied = equalRank.priorityBoundary.tiedDimensions;
    for (const entry of equalRank.deferred) {
      if (tied.includes(entry.dimension))
        expect(entry.reason).toBe("equal-priority-capacity-boundary");
    }
  });

  it("permutations produce the same working set and boundary result", () => {
    const permuted = projectSemanticProfile(
      deriveSemanticProfile({ feeling: null, interests: [...FIVE].reverse() }),
    );
    expect(permuted.represented).toEqual(equalRank.represented);
    expect(permuted.priorityBoundary).toEqual(equalRank.priorityBoundary);
    expect(permuted.deferred).toEqual(equalRank.deferred);
  });

  it("a truthful declared priority changes semantic rank and makes the boundary decisive", () => {
    const projection = projectSemanticProfile(
      deriveSemanticProfile({
        feeling: null,
        interests: FIVE,
        priorityInterests: ["wine", "coast", "heritage"],
      }),
    );
    expect(projection.priorityBoundary.status).toBe("decisive");
    expect(projection.priorityBoundary.tiedDimensions).toEqual([]);
    for (const entry of projection.deferred) {
      expect(entry.reason).toBe("lower-ranked-overflow");
    }
    expect(projection.deferred.map((d) => d.dimension)).toContain("faith-reflection");
  });

  it("stable id carries no semantic authority — boundary rank equality ignores it", () => {
    const profile = deriveSemanticProfile({ feeling: null, interests: FIVE });
    const byKey = new Map(profile.contentInterests.map((s) => [s.key, s]));
    const wine = byKey.get("interest:wine")!;
    const faith = byKey.get("interest:faith")!;
    // Different stable keys, identical semantic rank.
    expect(wine.key).not.toBe(faith.key);
    expect(
      semanticRankEquals(
        {
          authority: wine.authority,
          confidence: wine.confidence,
          domainPrecedence: 1,
        },
        {
          authority: faith.authority,
          confidence: faith.confidence,
          domainPrecedence: 1,
        },
      ),
    ).toBe(true);
    expect(Object.keys(equalRank.priorityBoundary.boundaryRank ?? {}).sort()).toEqual([
      "authority",
      "confidence",
      "domainPrecedence",
    ]);
  });
});

describe("BUILD 2 Pass 1 — parity with current buildExperienceProfile()", () => {
  const corpus: Array<{ feeling: Feeling | null; interests: Interest[] }> = [
    { feeling: null, interests: [] },
    { feeling: "wine-food", interests: [] },
    { feeling: null, interests: ["wine"] },
    { feeling: null, interests: ["wine", "gastronomy"] },
    { feeling: null, interests: ["wine", "gastronomy", "coast", "heritage"] },
    { feeling: "coastal", interests: ["coast", "nature", "heritage"] },
    { feeling: "culture", interests: FIVE },
    { feeling: "hands-on", interests: ["hands-on", "local-life", "faith", "photography"] },
  ];

  it("A9 legacy compatibility projection matches production output exactly", () => {
    for (const fixture of corpus) {
      const legacy = buildExperienceProfile(fixture);
      const projected = projectSemanticProfile(deriveSemanticProfile(fixture));
      expect(projected.experienceProfile).toEqual(legacy);
      expect(projected.legacyCompatibilityProjection).toEqual(legacy);
    }
  });
});
