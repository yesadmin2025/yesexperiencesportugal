/**
 * FINAL FUNCTIONAL CLOSURE — the eight closed truth gaps.
 *
 * A/B — the Your Day freeze preserves the COMPLETE structural timing tuple,
 *       so a frozen day stays evaluable by the canonical Time Authority;
 * C/D — one time authority for the live Your Day, with an explicit legacy
 *       fallback and add-on minutes counted exactly once;
 * E   — 12 stays self-service, 13–14 route to a curator before Stripe;
 * F   — no "quick version" customer action survives;
 * G   — rhythm copy describes pace, never a stop count;
 * H   — Close Studio tells the truth about session persistence.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { judgeRouteTimeFit } from "@/lib/studio-v3/timeAuthority";
import {
  SELF_SERVICE_MAX_PARTY,
  STUDIO_MAX_PARTY,
  curatorPartyMessage,
  requiresCuratorParty,
} from "@/lib/studio-v3/selfServiceParty";
import { RHYTHMS } from "../types";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const STUDIO = read("src/components/studio-v3/StudioV3.tsx");
const INTRO = read("src/components/studio-v3/StudioV3Intro.tsx");

/* -------------------------------------------------------------- A & B --- */

describe("A — the storyboard freeze copies the full structural tuple", () => {
  const block = STUDIO.slice(
    STUDIO.indexOf("committedRoutePoints: shown.map"),
    STUDIO.indexOf("committedRoutePoints: shown.map") + 900,
  );

  it("carries ids, coordinates, duration minutes and provenance", () => {
    for (const field of [
      "inventoryStopId: point.inventoryStopId",
      "blueprintStopId: point.blueprintStopId",
      "lat: point.lat",
      "lng: point.lng",
      "durationMinutes: point.durationMinutes",
      "durationSource: point.durationSource",
    ]) {
      expect(block).toContain(field);
    }
  });

  it("never re-infers duration from a label at the freeze seam", () => {
    expect(block).not.toContain("inferKind");
  });
});

describe("B — a frozen day with certified durations stays evaluable", () => {
  const frozen = [
    { stopId: "inv-1", durationMinutes: 60, durationSource: "inventory" as const },
    { stopId: "inv-2", durationMinutes: 90, durationSource: "sot-chapter" as const },
  ];

  it("is evaluable after the freeze", () => {
    const fit = judgeRouteTimeFit({ stops: frozen });
    expect(fit.evaluable).toBe(true);
    expect(fit.verdict).not.toBe("not-evaluable");
  });

  it("dropping provenance (the old freeze behaviour) would make it unprovable", () => {
    const stripped = frozen.map((s) => ({ stopId: s.stopId }));
    expect(judgeRouteTimeFit({ stops: stripped }).evaluable).toBe(false);
  });
});

/* -------------------------------------------------------------- C & D --- */

describe("C — canonical timing first, legacy only when not evaluable", () => {
  it("Your Day remaining time prefers the canonical authority", () => {
    const block = STUDIO.slice(
      STUDIO.indexOf("const dayRemainingMinutes = useMemo"),
      STUDIO.indexOf("const dayRemainingMinutes = useMemo") + 900,
    );
    const canonical = block.indexOf("canonicalDayFit.evaluable");
    const legacy = block.indexOf("summarizeDay({");
    expect(canonical).toBeGreaterThan(-1);
    expect(legacy).toBeGreaterThan(canonical); // legacy is the fallback branch
  });

  it("the price card and dwell hours share the canonical BASE route timing", () => {
    expect(STUDIO).toContain("canonicalBaseFit.evaluable\n                ? //");
    expect(STUDIO).toContain("? canonicalBaseFit.totalMin");
  });

  it("keeps the legacy summarizeDay/inferKind path for thin drafts", () => {
    expect(STUDIO).toContain("inferKind(ep.label)");
  });
});

describe("D — add-on minutes are counted exactly once", () => {
  const stops = [
    { stopId: "inv-1", durationMinutes: 60, durationSource: "inventory" as const },
    { stopId: "inv-2", durationMinutes: 60, durationSource: "inventory" as const },
  ];

  it("the admission judgement includes selected add-on minutes", () => {
    const base = judgeRouteTimeFit({ stops });
    const withAddOns = judgeRouteTimeFit({ stops, addOnsMinutes: 45 });
    expect(base.totalMin + 45).toBe(withAddOns.totalMin);
    expect(withAddOns.remainingMin).toBeLessThan(base.remainingMin);
  });

  it("only the day fit passes addOnsMinutes; the base fit stays add-on free", () => {
    const dayFit = STUDIO.slice(
      STUDIO.indexOf("const canonicalDayFit = useMemo"),
      STUDIO.indexOf("const canonicalDayFit = useMemo") + 500,
    );
    const baseFit = STUDIO.slice(
      STUDIO.indexOf("const canonicalBaseFit = useMemo"),
      STUDIO.indexOf("const canonicalBaseFit = useMemo") + 400,
    );
    expect(dayFit).toContain("addOnsMinutes: selectedAddOnMinutes");
    expect(baseFit).not.toContain("addOnsMinutes");
  });
});

/* ------------------------------------------------------------------ E --- */

describe("E — 12 is self-service, 13–14 are curator-confirmed", () => {
  it("classifies party sizes with one product truth", () => {
    expect(SELF_SERVICE_MAX_PARTY).toBe(12);
    expect(STUDIO_MAX_PARTY).toBe(12);
    expect(requiresCuratorParty(12)).toBe(false);
    expect(requiresCuratorParty(13)).toBe(true);
    expect(requiresCuratorParty(14)).toBe(true);
    expect(requiresCuratorParty(null)).toBe(false);
  });

  it("the curator message is premium and never quotes a price", () => {
    const msg = curatorPartyMessage(13);
    expect(msg).toContain("13");
    expect(msg).toMatch(/curator/i);
    expect(msg).not.toMatch(/€|eur/i);
  });

  it("the preflight refuses an unsupported party in place, never via a lead sheet", () => {
    const block = STUDIO.slice(
      STUDIO.indexOf("if (!isSupportedStudioParty(committedTotal))"),
      STUDIO.indexOf("if (!isSupportedStudioParty(committedTotal))") + 400,
    );
    expect(block).toContain("setLogisticsConflict(");
    expect(block).toContain("return;");
    expect(STUDIO).not.toContain("openLeadSheet(");
  });


  it("the checkout guard runs before any Stripe work, from state or details", () => {
    const handler = STUDIO.slice(
      STUDIO.indexOf("const handleStripeCheckout = useCallback"),
      STUDIO.indexOf("setCheckoutPending(true)"),
    );
    const guardAt = handler.indexOf("requiresCuratorParty(partyTotal)");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(handler.indexOf("resolveStudioStrictPerPaxEur"));
    expect(handler).toContain("currentState.minorAges?.length ?? 0");
  });
});

/* ------------------------------------------------------------------ F --- */

describe("F — the false quick-version choice is gone", () => {
  it("removes the customer action and its test hooks", () => {
    expect(INTRO).not.toContain("Use the quick version");
    expect(INTRO).not.toContain("studio-v3-intro-quick");
    expect(INTRO).not.toMatch(/onComplete\([^)]*"fast"/);
  });
});

/* ------------------------------------------------------------------ G --- */

describe("G — rhythm copy describes pace, not stop counts", () => {
  it("has no numeric stop promise in any whisper", () => {
    for (const r of RHYTHMS) {
      expect(r.whisper ?? "").not.toMatch(/\b(one|two|three|four|five|six|\d+)\s+stops?\b/i);
    }
  });

  it("keeps the four canonical rhythm ids untouched", () => {
    expect(RHYTHMS.map((r) => r.id)).toEqual(["slow", "balanced", "full", "immersive"]);
  });
});

/* ------------------------------------------------------------------ H --- */

describe("H — Close Studio tells the truth", () => {
  it("derives progress from answered state, not from the phase", () => {
    expect(STUDIO).toContain("hasProgress={hasMeaningfulStudioProgress(state)}");
    expect(STUDIO).not.toContain('hasProgress={state.phase !== "who"}');
  });

  it("explains session persistence without promising an account", () => {
    expect(STUDIO).not.toContain("won't be saved");
    expect(STUDIO).toContain("Your progress stays in this browser tab");
  });
});
