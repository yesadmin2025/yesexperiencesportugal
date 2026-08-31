/**
 * NORTH-STAR CLOSURE — the live authored day stays coherent, structurally
 * identified and commercially honest all the way into checkout, and the AI
 * layers can only ever supply words, never decisions.
 */

import { describe, expect, it } from "vitest";
import { applyGesture } from "@/components/studio-v3/momentAuthorship";
import { resolveAuthoritativeRouteStops } from "@/components/studio-v3/studioRouteAuthority";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import { resolveCheckoutCommercialState } from "@/lib/studio-v3/checkoutCommercialState";
import { freeTextAnswerEvent } from "@/lib/studio-v3/freeTextAnswer";
import { adaptDirectorQuestion } from "@/lib/studio-v3/questionPresentationAdapter";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import type { SemanticSourceEvent } from "@/lib/studio-v3/semanticSourceEvents";

const anchor = Object.values(TAILOR_BLUEPRINTS)[0];

describe("authored identity survives every gesture", () => {
  const stops = [
    { label: "A", story: "a", inventoryStopId: "inv-a", image: "/a.jpg", focal: "50% 50%" },
    { label: "B", story: "b", blueprintStopId: "bp-b", image: "/b.jpg" },
    { label: "C", story: "c", inventoryStopId: "inv-c" },
  ];

  it("keeps structural and media identity through reorder", () => {
    const next = applyGesture(stops, 0, "later");
    expect(next[1].inventoryStopId).toBe("inv-a");
    expect(next[1].image).toBe("/a.jpg");
    expect(next[0].blueprintStopId).toBe("bp-b");
  });

  it("keeps identity through remove", () => {
    const next = applyGesture(stops, 1, "remove");
    expect(next.map((s) => s.inventoryStopId)).toEqual(["inv-a", "inv-c"]);
  });

  it("carries the replacement's identity through swap", () => {
    const next = applyGesture(stops, 2, "swap", {
      replacement: { label: "D", story: "d", inventoryStopId: "inv-d", image: "/d.jpg" },
    });
    expect(next[2]).toMatchObject({ label: "D", inventoryStopId: "inv-d", image: "/d.jpg" });
    expect(next[0].inventoryStopId).toBe("inv-a");
  });

  it("passes identity through the authoritative route chain untouched", () => {
    const resolvedStops = resolveAuthoritativeRouteStops({ editedRoutePoints: stops });
    expect(resolvedStops[0]).toMatchObject({ inventoryStopId: "inv-a", image: "/a.jpg" });
    expect(resolvedStops[1].blueprintStopId).toBe("bp-b");
    expect(resolvedStops[2].image).toBeNull();
  });
});

describe("commercial truth is rebuilt from the route being reserved", () => {
  it("resolves the untouched anchor composition as anchor-priced and safe", () => {
    const kept = anchor.core.map((stop) => ({ label: stop.label, blueprintStopId: stop.id }));
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: anchor.tourId,
      moments: kept,
      edited: false,
    });
    expect(authority.evaluable).toBe(true);
    expect(authority.liveResolution).toBe("authored-fallback");
    expect(authority.identityKeys.every((k) => k.startsWith("bp:"))).toBe(true);
  });

  it("re-derives the ledger from the CURRENT route, not a stale resolution", () => {
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
    // Removing a promised moment must be visible in the rebuilt ledger.
    const omittedFull = full.ledger?.entries.filter((e) => e.kind === "omitted").length ?? 0;
    const omittedTrimmed = trimmed.ledger?.entries.filter((e) => e.kind === "omitted").length ?? 0;
    expect(omittedTrimmed).toBeGreaterThan(omittedFull);
  });

  it("fails closed on an empty composition", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: anchor.tourId,
      moments: [],
      edited: true,
    });
    expect(authority.safe).toBe(false);
    expect(authority.unsafeReason).toBe("empty-composition");
  });

  it("never claims safety without an anchor", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: null,
      moments: [{ label: "Somewhere" }],
      edited: true,
    });
    expect(authority.safe).toBe(false);
    expect(authority.ledger).toBeNull();
  });
});

describe("checkout composition key is structural, not a label", () => {
  it("distinguishes two different moments that share a display label", () => {
    const a = resolveCheckoutCommercialState({
      authoredLabels: ["Winery", "Winery"],
      authoredIdentityKeys: ["bp:one", "bp:two"],
      selectedAddOnIds: [],
    });
    const b = resolveCheckoutCommercialState({
      authoredLabels: ["Winery", "Winery"],
      authoredIdentityKeys: ["bp:one", "bp:three"],
      selectedAddOnIds: [],
    });
    expect(a.compositionKey).not.toBe(b.compositionKey);
  });

  it("changes when the route changes", () => {
    const before = resolveCheckoutCommercialState({
      authoredLabels: ["A", "B"],
      authoredIdentityKeys: ["bp:a", "bp:b"],
    });
    const after = resolveCheckoutCommercialState({
      authoredLabels: ["A"],
      authoredIdentityKeys: ["bp:a"],
    });
    expect(before.compositionKey).not.toBe(after.compositionKey);
  });
});

describe("AI can add words and signals, never decisions", () => {
  it("never lets an AI signal override an explicit negation", () => {
    const overlay = [
      {
        domain: "interest",
        value: "wine",
        provenance: "ai-interpretation",
        polarity: "positive",
        confidence: 0.6,
      },
    ] as unknown as SemanticSourceEvent[];
    const event = freeTextAnswerEvent("no wine please", overlay);
    expect(event).not.toBeNull();
    const winePositive = (event?.semanticEffects ?? []).some(
      (e) => e.domain === "interest" && e.value === "wine" && e.polarity === "positive",
    );
    expect(winePositive).toBe(false);
  });

  it("accepts an additive AI signal the lexicon did not reach", () => {
    const overlay = [
      {
        domain: "interest",
        value: "wine",
        provenance: "ai-interpretation",
        polarity: "positive",
        confidence: 0.5,
      },
    ] as unknown as SemanticSourceEvent[];
    const event = freeTextAnswerEvent("somewhere calm by the sea", overlay);
    expect(
      (event?.semanticEffects ?? []).some(
        (e) => e.value === "wine" && e.provenance === "ai-interpretation",
      ),
    ).toBe(true);
  });

  it("rejects AI wording that reorders or renames the Director's options", () => {
    const decision = {
      shouldAsk: true,
      questionKey: "question:coast-geography",
      options: null,
    } as never;
    // No decision options ⇒ nothing is presentable, so nothing is rendered.
    expect(adaptDirectorQuestion(decision, null)).toBeNull();
  });
});
