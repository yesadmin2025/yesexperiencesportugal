/**
 * PASS 1A — fail-closed live commercial authority + local AI copy safety.
 *
 * Proves that an edited/composed day that cannot be certified is never
 * bookable and never reuses an earlier ledger, that an untouched canonical
 * anchor keeps its existing sovereign pricing path, and that the LOCAL
 * validator (not the model prompt) is the safety boundary for Director copy.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import { resolveCheckoutCommercialState } from "@/lib/studio-v3/checkoutCommercialState";
import { adaptDirectorQuestion } from "@/lib/studio-v3/questionPresentationAdapter";
import { deriveStudioDirectorRuntime } from "@/lib/studio-v3/studioDirectorRuntime";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";

const anchor = Object.values(TAILOR_BLUEPRINTS)[0];
const LEGACY_ANCHOR = "legacy-anchor-with-no-blueprint";

const STUDIO_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

describe("A — edited route with no structural authority is not bookable", () => {
  it("marks an edited no-blueprint composition unsafe and non-evaluable", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: LEGACY_ANCHOR,
      moments: [{ label: "A cove" }, { label: "A local winery" }],
      edited: true,
    });
    expect(authority.evaluable).toBe(false);
    expect(authority.safe).toBe(false);
    expect(authority.unsafeReason).toBe("not-evaluable");
  });

  it("the Reserve gate blocks on any unsafe authority, not only evaluable ones", () => {
    expect(STUDIO_SOURCE).toContain("if (!liveAuthority.safe) {");
    expect(STUDIO_SOURCE).not.toContain("!liveAuthority.safe && liveAuthority.evaluable");
    // The reviewed Summary is never ejected: an unsafe authority surfaces an
    // explicit in-place checkout block the traveller can act on.
    const gateIndex = STUDIO_SOURCE.indexOf("if (!liveAuthority.safe) {");
    expect(STUDIO_SOURCE.slice(gateIndex, gateIndex + 320)).toContain("setCheckoutBlock(");

  });
});

describe("B — an untouched canonical anchor keeps its existing path", () => {
  it("is safe only when truly unedited", () => {
    const moments = [{ label: "A cove" }, { label: "A local winery" }];
    const unedited = rebuildLiveCommercialAuthority({
      anchorTourId: LEGACY_ANCHOR,
      moments,
      edited: false,
    });
    expect(unedited.evaluable).toBe(false);
    expect(unedited.safe).toBe(true);
    expect(unedited.liveResolution).toBe("authored-fallback");

    const edited = rebuildLiveCommercialAuthority({
      anchorTourId: LEGACY_ANCHOR,
      moments,
      edited: true,
    });
    expect(edited.safe).toBe(false);
  });

  it("never claims safety with an empty composition", () => {
    const empty = rebuildLiveCommercialAuthority({
      anchorTourId: LEGACY_ANCHOR,
      moments: [],
      edited: false,
    });
    expect(empty.safe).toBe(false);
    expect(empty.unsafeReason).toBe("empty-composition");
  });
});

describe("C — no stale ledger and no base-pricing fallback", () => {
  it("the checkout gate feeds the REBUILT ledger only", () => {
    expect(STUDIO_SOURCE).toContain("ledger: liveAuthority.ledger,");
    expect(STUDIO_SOURCE).toContain("liveResolution: liveAuthority.liveResolution,");
    expect(STUDIO_SOURCE).not.toContain("checkoutResolved.livingAtlasLive?.commercialLedger");
  });

  it("blocks checkout when the composed day is commercially unresolved", () => {
    const state = resolveCheckoutCommercialState({
      ledger: {
        anchorTourId: anchor.tourId,
        entries: [],
        actions: [],
        disposition: "commercial-unresolved",
        notes: [],
      },
      liveResolution: "composed",
      selectedAddOnIds: [],
      authoredLabels: ["A", "B"],
      authoredIdentityKeys: ["bp:a", "bp:b"],
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReason).toBe("commercial-unresolved");
  });
});

describe("D — the current route rebuilds and reconciles the CURRENT basket", () => {
  it("re-derives the ledger from the live composition", () => {
    const kept = anchor.core.map((stop) => ({ label: stop.label, blueprintStopId: stop.id }));
    const full = rebuildLiveCommercialAuthority({
      anchorTourId: anchor.tourId,
      moments: kept,
      edited: true,
    });
    const trimmed = rebuildLiveCommercialAuthority({
      anchorTourId: anchor.tourId,
      moments: kept.slice(0, Math.max(1, kept.length - 1)),
      edited: true,
    });
    expect(full.evaluable).toBe(true);
    const omittedFull = full.ledger?.entries.filter((e) => e.kind === "omitted").length ?? 0;
    const omittedTrimmed = trimmed.ledger?.entries.filter((e) => e.kind === "omitted").length ?? 0;
    expect(omittedTrimmed).toBeGreaterThan(omittedFull);
  });

  it("charges an add-on carried by the route exactly once", () => {
    const state = resolveCheckoutCommercialState({
      ledger: {
        anchorTourId: anchor.tourId,
        entries: [],
        actions: [{ actionId: "addon:sunset-cruise", priceAction: "signature-addon", quantity: 1 }],
        disposition: "known-price-action-required",
        notes: [],
      },
      liveResolution: "composed",
      selectedAddOnIds: ["sunset-cruise", "other-addon"],
      authoredLabels: ["A", "B"],
      authoredIdentityKeys: ["bp:a", "bp:b"],
    });
    expect(state.blocked).toBe(false);
    expect(state.suppressedAddOnIds).toContain("sunset-cruise");
    expect(state.chargeableAddOnIds).not.toContain("sunset-cruise");
    expect(state.chargeableAddOnIds).toContain("other-addon");
  });
});

/* ------------------------------------------------------------------ *
 * Director copy safety — against a REAL presentable decision.
 * ------------------------------------------------------------------ */

const BASE_INPUT = {
  feeling: "wine-food" as const,
  interests: ["wine", "coast", "heritage", "local-life", "hands-on"] as const,
  rhythm: "balanced" as const,
  destinationIntent: "no-preference" as const,
};

function realDecision() {
  const runtime = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: [] });
  expect(runtime.decision.shouldAsk).toBe(true);
  const fallback = adaptDirectorQuestion(runtime.decision, null);
  expect(fallback).not.toBeNull();
  return { decision: runtime.decision, fallback: fallback! };
}

function candidateFrom(ids: readonly string[], questionKey: string, copy?: Partial<{ title: string }>) {
  return {
    questionKey,
    eyebrow: "The table",
    title: copy?.title ?? "Which thread should the day",
    titleAccent: "follow first?",
    hint: "Nothing is fixed yet.",
    options: ids.map((id) => ({ id, label: "A quieter thread", whisper: "Slower, closer." })),
  };
}

describe("E — option membership and order are sovereign", () => {
  it("rejects reordered, dropped and added option ids", () => {
    const { decision, fallback } = realDecision();
    const ids = fallback.presentation.offeredOptionIds;
    if (ids.length < 2) return;

    const reordered = adaptDirectorQuestion(
      decision,
      candidateFrom([...ids].reverse(), fallback.presentation.questionKey),
    )!;
    expect(reordered.adapted).toBe(false);
    expect(reordered.rejection).toBe("option-order-mismatch");

    const dropped = adaptDirectorQuestion(
      decision,
      candidateFrom(ids.slice(0, ids.length - 1), fallback.presentation.questionKey),
    )!;
    expect(dropped.adapted).toBe(false);
    expect(dropped.rejection).toBe("option-count-mismatch");

    const added = adaptDirectorQuestion(
      decision,
      candidateFrom([...ids, "invented-option"], fallback.presentation.questionKey),
    )!;
    expect(added.adapted).toBe(false);
    expect(added.rejection).toBe("option-count-mismatch");
  });
});

describe("F — unsafe AI copy falls back to deterministic wording", () => {
  const unsafeTitles: Array<[string, string]> = [
    ["supplier identity", "A morning at Quinta de Alcube"],
    ["clock time", "Your day begins at 09:30"],
    ["price", "Included for €120 per guest"],
    ["percentage", "A 90% coastal day"],
    ["numeric claim", "Three wineries in one morning"],
    ["internal key", "question:coast_geography decides this"],
    ["exclamation", "Choose the coast!"],
    ["hype", "The best day in Portugal"],
    ["ai wording", "Our AI recommends the coast"],
  ];

  for (const [name, title] of unsafeTitles) {
    it(`rejects ${name} and returns the deterministic copy`, () => {
      const { decision, fallback } = realDecision();
      const ids = fallback.presentation.offeredOptionIds;
      const adapted = adaptDirectorQuestion(
        decision,
        candidateFrom(ids, fallback.presentation.questionKey, { title }),
      )!;
      expect(adapted.adapted).toBe(false);
      expect(adapted.rejection).toBe("unsafe-copy");
      expect(adapted.presentation.title).toBe(fallback.presentation.title);
      expect(adapted.presentation.offeredOptionIds).toEqual(ids);
    });
  }
});

describe("G — safe AI wording is accepted without changing the decision", () => {
  it("keeps exact option ids and order while replacing only words", () => {
    const { decision, fallback } = realDecision();
    const ids = fallback.presentation.offeredOptionIds;
    const adapted = adaptDirectorQuestion(
      decision,
      candidateFrom(ids, fallback.presentation.questionKey, {
        title: "Which thread should the day",
      }),
    )!;
    expect(adapted.adapted).toBe(true);
    expect(adapted.presentation.title).toBe("Which thread should the day");
    expect(adapted.presentation.offeredOptionIds).toEqual(ids);
    expect(adapted.presentation.options.map((o) => o.id)).toEqual(ids);
    expect(adapted.presentation.questionKey).toBe(fallback.presentation.questionKey);
  });

  it("still allows generic category language such as a local winery", () => {
    const { decision, fallback } = realDecision();
    const ids = fallback.presentation.offeredOptionIds;
    const adapted = adaptDirectorQuestion(
      decision,
      candidateFrom(ids, fallback.presentation.questionKey, {
        title: "A local winery, or the coast",
      }),
    )!;
    expect(adapted.adapted).toBe(true);
  });
});
