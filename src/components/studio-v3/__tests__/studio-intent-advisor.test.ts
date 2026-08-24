import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildStudioIntentAdvisorInput,
  prioritiseResolvedRefineIntents,
  studioIntentAdvisorKey,
  validateStudioIntentInterpretation,
  STUDIO_INTENT_SCHEMA_VERSION,
  STUDIO_PREFERENCE_KEYS,
  type StudioIntentAdvisorInput,
  type StudioPreferenceKey,
  type StudioPreferenceWeight,
} from "@/components/studio-v3/studioIntentAdvisor";
import {
  availableAdaptiveQuestionKinds,
  resolveAdaptiveQuestion,
} from "@/components/studio-v3/adaptiveQuestions";
import { hasExplicitWineIntent } from "@/components/studio-v3/studioWineIntent";
import {
  requestStudioIntentAdviceCached,
  resetStudioIntentAdvisorCache,
} from "@/components/studio-v3/useStudioIntentAdvisor";
import { INITIAL_STATE, type StudioV3State } from "@/components/studio-v3/types";

function stateWith(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

/** A fully-populated, personal-data-heavy state. Nothing personal may leave it. */
const PERSONAL_STATE = stateWith({
  feeling: "coastal",
  companions: "couple",
  interests: ["coast", "gastronomy"],
  rhythm: "balanced",
  destinationIntent: "arrabida-setubal-azeitao",
  firstName: "Nidia",
  tourId: "arrabida-signature",
  journeyTitle: "A private Arrábida day",
  dateMode: "exact",
  dateExact: "2026-09-14",
  pickup: "lisbon",
  guests: 2,
  adults: 2,
  investment: "elevated",
  guestDraft: {
    fullName: "Nidia de Almeida",
    email: "nidia@example.com",
    phone: "+351900000000",
    pickupAddress: "Hotel Avenida Palace, Lisbon",
    guideNotes: "Please stop for coffee near the cellar",
  },
});

const FORBIDDEN_FRAGMENTS = [
  "nidia",
  "example.com",
  "351900000000",
  "avenida",
  "palace",
  "hotel",
  "coffee",
  "cellar",
  "arrabida-signature",
  "private arrábida day",
  "2026-09-14",
  "signature",
];

function weights(
  overrides: Partial<Record<StudioPreferenceKey, StudioPreferenceWeight>> = {},
): Record<StudioPreferenceKey, StudioPreferenceWeight> {
  const base = {} as Record<StudioPreferenceKey, StudioPreferenceWeight>;
  for (const key of STUDIO_PREFERENCE_KEYS) base[key] = 1;
  return { ...base, ...overrides };
}

function rawInterpretation(patch: Record<string, unknown> = {}) {
  return {
    schemaVersion: STUDIO_INTENT_SCHEMA_VERSION,
    confidence: "high",
    preferenceWeights: weights(),
    paceBias: "balanced",
    preferredAdaptiveKind: null,
    suggestedRefineIntentIds: [],
    rationaleCode: "clear-fit",
    ...patch,
  };
}

function inputFor(state: StudioV3State): StudioIntentAdvisorInput {
  const input = buildStudioIntentAdvisorInput(state, availableAdaptiveQuestionKinds(state));
  expect(input).not.toBeNull();
  return input as StudioIntentAdvisorInput;
}

describe("buildStudioIntentAdvisorInput — payload minimisation", () => {
  it("sends only non-identifying preference fields", () => {
    const input = inputFor(PERSONAL_STATE);

    expect(Object.keys(input).sort()).toEqual(
      [
        "allowedRefineIntentIds",
        "availableAdaptiveKinds",
        "companions",
        "destinationIntent",
        "feeling",
        "interests",
        "refinementAnswered",
        "rhythm",
        "schemaVersion",
      ].sort(),
    );
  });

  it("never serialises identity, contact, pickup, payment, product or itinerary data", () => {
    const serialised = JSON.stringify(inputFor(PERSONAL_STATE)).toLowerCase();
    for (const fragment of FORBIDDEN_FRAGMENTS) {
      expect(serialised).not.toContain(fragment);
    }
    for (const key of ["firstname", "guestdraft", "email", "phone", "pickup", "tourid", "price"]) {
      expect(serialised).not.toContain(key);
    }
  });

  it("returns null until the deterministic preference set is complete", () => {
    expect(buildStudioIntentAdvisorInput(INITIAL_STATE, [])).toBeNull();
    expect(
      buildStudioIntentAdvisorInput(stateWith({ feeling: "coastal", interests: [] }), []),
    ).toBeNull();
  });
});

describe("studioIntentAdvisorKey", () => {
  it("is stable for equivalent preference state regardless of ordering", () => {
    const a = inputFor(
      stateWith({
        feeling: "coastal",
        companions: "couple",
        interests: ["coast", "gastronomy"],
        rhythm: "balanced",
        destinationIntent: "arrabida-setubal-azeitao",
      }),
    );
    const b = inputFor(
      stateWith({
        feeling: "coastal",
        companions: "couple",
        interests: ["gastronomy", "coast"],
        rhythm: "balanced",
        destinationIntent: "arrabida-setubal-azeitao",
      }),
    );
    expect(studioIntentAdvisorKey(a)).toBe(studioIntentAdvisorKey(b));
  });

  it("changes when a real preference changes, and carries no identity data", () => {
    const base = inputFor(PERSONAL_STATE);
    const slower = inputFor(stateWith({ ...PERSONAL_STATE, rhythm: "slow" }));
    expect(studioIntentAdvisorKey(base)).not.toBe(studioIntentAdvisorKey(slower));

    const key = studioIntentAdvisorKey(base).toLowerCase();
    for (const fragment of FORBIDDEN_FRAGMENTS) {
      expect(key).not.toContain(fragment);
    }
  });
});

describe("validateStudioIntentInterpretation — trust boundary", () => {
  const coastalInput = () =>
    inputFor(
      stateWith({
        feeling: "coastal",
        companions: "couple",
        interests: ["coast"],
        rhythm: "balanced",
        destinationIntent: "arrabida-setubal-azeitao",
      }),
    );

  it("accepts a well-formed high-confidence classification", () => {
    const result = validateStudioIntentInterpretation(rawInterpretation(), coastalInput());
    expect(result?.confidence).toBe("high");
  });

  it("rejects low confidence", () => {
    expect(
      validateStudioIntentInterpretation(rawInterpretation({ confidence: "low" }), coastalInput()),
    ).toBeNull();
  });

  it("rejects unknown or malformed values", () => {
    const input = coastalInput();
    expect(validateStudioIntentInterpretation(null, input)).toBeNull();
    expect(validateStudioIntentInterpretation("nope", input)).toBeNull();
    expect(
      validateStudioIntentInterpretation(rawInterpretation({ schemaVersion: "9" }), input),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(rawInterpretation({ confidence: "certain" }), input),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(rawInterpretation({ paceBias: "rushed" }), input),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(rawInterpretation({ rationaleCode: "vibes" }), input),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(
        rawInterpretation({ preferenceWeights: { wine: 1 } }),
        input,
      ),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(
        rawInterpretation({ preferenceWeights: weights({ coast: 7 as StudioPreferenceWeight }) }),
        input,
      ),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(
        rawInterpretation({ preferredAdaptiveKind: "helicopter" }),
        input,
      ),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(
        rawInterpretation({ suggestedRefineIntentIds: ["free-upgrade"] }),
        input,
      ),
    ).toBeNull();
    expect(
      validateStudioIntentInterpretation(
        rawInterpretation({ suggestedRefineIntentIds: "slower" }),
        input,
      ),
    ).toBeNull();
  });

  it("cannot prefer an adaptive kind that is not currently available", () => {
    const input = coastalInput();
    expect(input.availableAdaptiveKinds).toContain("coast");
    expect(input.availableAdaptiveKinds).not.toContain("faith");

    const result = validateStudioIntentInterpretation(
      rawInterpretation({ preferredAdaptiveKind: "faith" }),
      input,
    );
    expect(result?.preferredAdaptiveKind).toBeNull();
  });

  it("cannot prefer an adaptive kind once the refinement was already answered", () => {
    const input = { ...coastalInput(), refinementAnswered: true };
    const result = validateStudioIntentInterpretation(
      rawInterpretation({ preferredAdaptiveKind: "coast" }),
      input,
    );
    expect(result?.preferredAdaptiveKind).toBeNull();
  });

  it("cannot prefer wine and forces wine weight to 0 without explicit wine intent", () => {
    const input = {
      ...coastalInput(),
      availableAdaptiveKinds: ["coast", "wine"] as StudioIntentAdvisorInput["availableAdaptiveKinds"],
    };
    const result = validateStudioIntentInterpretation(
      rawInterpretation({
        preferredAdaptiveKind: "wine",
        preferenceWeights: weights({ wine: 3 }),
      }),
      input,
    );
    expect(result?.preferredAdaptiveKind).toBeNull();
    expect(result?.preferenceWeights.wine).toBe(0);
  });

  it("keeps wine weight when the traveller asked for wine explicitly", () => {
    const input = inputFor(
      stateWith({
        feeling: "wine-food",
        companions: "couple",
        interests: ["wine"],
        rhythm: "balanced",
        destinationIntent: "arrabida-setubal-azeitao",
      }),
    );
    const result = validateStudioIntentInterpretation(
      rawInterpretation({ preferenceWeights: weights({ wine: 3 }) }),
      input,
    );
    expect(result?.preferenceWeights.wine).toBe(3);
  });

  it("drops refine intents that are not currently allowed", () => {
    const input = {
      ...coastalInput(),
      allowedRefineIntentIds: ["slower"] as StudioIntentAdvisorInput["allowedRefineIntentIds"],
    };
    const result = validateStudioIntentInterpretation(
      rawInterpretation({ suggestedRefineIntentIds: ["more-ocean", "slower"] }),
      input,
    );
    expect(result?.suggestedRefineIntentIds).toEqual(["slower"]);
  });
});

describe("wine intent stays explicit", () => {
  const cases: Array<[string, Partial<StudioV3State>]> = [
    ["gastronomy only", { interests: ["gastronomy"] }],
    ["romance", { feeling: "romance", interests: ["gastronomy"] }],
    ["slow luxury", { feeling: "slow-luxury", interests: ["nature"] }],
    ["Arrábida geography alone", { destinationIntent: "arrabida-setubal-azeitao" }],
    [
      "Arrábida plus gastronomy and romance",
      {
        feeling: "romance",
        interests: ["gastronomy"],
        destinationIntent: "arrabida-setubal-azeitao",
      },
    ],
  ];

  for (const [label, patch] of cases) {
    it(`${label} is not wine intent`, () => {
      const state = stateWith(patch);
      expect(
        hasExplicitWineIntent({
          feeling: state.feeling,
          interests: state.interests,
          destinationIntent: state.destinationIntent,
        }),
      ).toBe(false);
      expect(availableAdaptiveQuestionKinds(state)).not.toContain("wine");
    });
  }

  it("explicit wine interest or wine feeling is wine intent", () => {
    expect(hasExplicitWineIntent({ interests: ["wine"] })).toBe(true);
    expect(hasExplicitWineIntent({ feeling: "wine-food" })).toBe(true);
  });
});

describe("resolveAdaptiveQuestion — preferred kind is advisory only", () => {
  const arrabidaCulture = stateWith({
    feeling: "culture",
    companions: "couple",
    interests: ["heritage", "coast"],
    rhythm: "balanced",
    destinationIntent: "arrabida-setubal-azeitao",
  });

  it("honours a preferred kind only when it is already valid", () => {
    const available = availableAdaptiveQuestionKinds(arrabidaCulture);
    expect(available.length).toBeGreaterThan(1);
    const other = available[1]!;
    expect(resolveAdaptiveQuestion(arrabidaCulture, other)?.kind).toBe(other);
  });

  it("falls back to the deterministic first valid kind for an unavailable preference", () => {
    const deterministic = resolveAdaptiveQuestion(arrabidaCulture)?.kind;
    expect(resolveAdaptiveQuestion(arrabidaCulture, "faith")?.kind).toBe(deterministic);
    expect(resolveAdaptiveQuestion(arrabidaCulture, "wine")?.kind).toBe(deterministic);
  });

  it("cannot conjure a question where the deterministic engine has none", () => {
    expect(resolveAdaptiveQuestion(INITIAL_STATE, "coast")).toBeNull();
  });
});

describe("prioritiseResolvedRefineIntents", () => {
  const resolved = [{ id: "more-ocean" as const }, { id: "less-wine" as const }, { id: "slower" as const }];

  it("reorders already-resolved intents without losing any", () => {
    expect(prioritiseResolvedRefineIntents(resolved, ["slower"])).toEqual([
      { id: "slower" },
      { id: "more-ocean" },
      { id: "less-wine" },
    ]);
  });

  it("cannot inject an intent that was not resolved", () => {
    const onlySlower = [{ id: "slower" as const }];
    expect(prioritiseResolvedRefineIntents(onlySlower, ["more-ocean", "less-wine"])).toEqual(
      onlySlower,
    );
  });

  it("is identity when no preference is supplied and ignores duplicates", () => {
    expect(prioritiseResolvedRefineIntents(resolved, [])).toEqual(resolved);
    expect(prioritiseResolvedRefineIntents(resolved, ["slower", "slower"])).toEqual([
      { id: "slower" },
      { id: "more-ocean" },
      { id: "less-wine" },
    ]);
  });
});

describe("requestStudioIntentAdviceCached", () => {
  beforeEach(() => {
    resetStudioIntentAdvisorCache();
  });

  it("deduplicates simultaneous identical requests", async () => {
    let resolveFn: (value: { interpretation: null; source: "fallback" }) => void = () => {};
    const request = vi.fn(
      () =>
        new Promise<{ interpretation: null; source: "fallback" }>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const a = requestStudioIntentAdviceCached("key-a", request);
    const b = requestStudioIntentAdviceCached("key-a", request);
    resolveFn({ interpretation: null, source: "fallback" });
    await Promise.all([a, b]);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("caches subsequent identical requests", async () => {
    const request = vi.fn(async () => ({ interpretation: null, source: "fallback" as const }));
    await requestStudioIntentAdviceCached("key-b", request);
    await requestStudioIntentAdviceCached("key-b", request);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps different keys independent", async () => {
    const first = vi.fn(async () => ({ interpretation: null, source: "fallback" as const }));
    const second = vi.fn(async () => ({ interpretation: null, source: "ai" as const }));
    const a = await requestStudioIntentAdviceCached("key-c", first);
    const b = await requestStudioIntentAdviceCached("key-d", second);
    expect(a.source).toBe("fallback");
    expect(b.source).toBe("ai");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
