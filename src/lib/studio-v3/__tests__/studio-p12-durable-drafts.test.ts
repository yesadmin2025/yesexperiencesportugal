import { describe, expect, it } from "vitest";
import {
  STUDIO_V3_DRAFT_MAX_AGE_MS,
  parseDurableStudioDraft,
  sanitizeStudioDurableState,
  serializeDurableStudioDraft,
} from "@/lib/studio-v3/draftSnapshot";

const NOW = Date.UTC(2026, 7, 26, 18, 0, 0);

const SAFE_PROGRESS = {
  phase: "rhythm",
  feeling: "wine-food",
  companions: "couple",
  interests: ["wine", "gastronomy"],
  rhythm: "slow",
  pickup: "lisbon",
  guests: 2,
  adults: 2,
  minorAges: [],
  destinationIntent: "arrabida-setubal-azeitao",
  pathMode: "guided",
  rerollCount: 0,
  decidedForMe: [],
  delegationMode: null,
};

describe("P12 durable Studio draft privacy boundary", () => {
  it("keeps composition but drops identity, contact, sensitive considerations and unknown fields", () => {
    const safe = sanitizeStudioDurableState({
      ...SAFE_PROGRESS,
      firstName: "Private Traveller",
      considerations: ["allergies", "reduced-mobility"],
      guestDraft: {
        fullName: "Private Traveller",
        email: "private@example.com",
        phone: "+351 910 000 000",
        pickupAddress: "Private hotel",
        guideNotes: "Medical and dietary detail",
      },
      paymentIntent: "pi_secret_should_never_survive",
      arbitraryFutureField: { email: "future@example.com" },
    });

    expect(safe.phase).toBe("rhythm");
    expect(safe.feeling).toBe("wine-food");
    expect(safe.companions).toBe("couple");
    expect(safe.interests).toEqual(["wine", "gastronomy"]);
    expect(safe.pickup).toBe("lisbon");

    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("firstName");
    expect(serialized).not.toContain("guestDraft");
    expect(serialized).not.toContain("considerations");
    expect(serialized).not.toContain("paymentIntent");
    expect(serialized).not.toContain("arbitraryFutureField");
    expect(serialized).not.toContain("Private Traveller");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("Medical and dietary detail");
  });

  it("normalises checkout-adjacent and legacy reveal phases back to Your Day", () => {
    for (const phase of ["map", "confirmation", "guestDetails", "checkoutSummary"]) {
      const safe = sanitizeStudioDurableState({ ...SAFE_PROGRESS, phase });
      expect(safe.phase).toBe("storyboard");
    }
  });

  it("rejects invalid enum injections while preserving other valid answers", () => {
    const safe = sanitizeStudioDurableState({
      ...SAFE_PROGRESS,
      feeling: "private@example.com",
      rhythm: "secret-name",
      pickup: "somebody's house",
      interests: ["wine", "private@example.com", "coast"],
    });

    expect(safe.feeling).toBeUndefined();
    expect(safe.rhythm).toBeUndefined();
    expect(safe.pickup).toBeUndefined();
    expect(safe.interests).toEqual(["wine", "coast"]);
  });

  it("writes a versioned 30-day envelope with only the durable allow-list", () => {
    const rawSession = JSON.stringify({
      ...SAFE_PROGRESS,
      firstName: "Private Traveller",
      considerations: ["allergies"],
      guestDraft: { email: "private@example.com" },
    });

    const serialized = serializeDurableStudioDraft(rawSession, NOW);
    expect(serialized).not.toBeNull();
    const parsed = JSON.parse(serialized as string) as {
      version: number;
      updatedAt: string;
      expiresAt: string;
      state: Record<string, unknown>;
    };

    expect(parsed.version).toBe(1);
    expect(Date.parse(parsed.updatedAt)).toBe(NOW);
    expect(Date.parse(parsed.expiresAt)).toBe(NOW + STUDIO_V3_DRAFT_MAX_AGE_MS);
    expect(parsed.state.phase).toBe("rhythm");
    expect(serialized).not.toContain("Private Traveller");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("allergies");
  });

  it("round-trips a valid draft and expires it deterministically", () => {
    const serialized = serializeDurableStudioDraft(JSON.stringify(SAFE_PROGRESS), NOW);
    expect(serialized).not.toBeNull();

    const beforeExpiry = parseDurableStudioDraft(
      serialized,
      NOW + STUDIO_V3_DRAFT_MAX_AGE_MS - 1,
    );
    expect(beforeExpiry?.state.feeling).toBe("wine-food");
    expect(beforeExpiry?.state.phase).toBe("rhythm");

    expect(parseDurableStudioDraft(serialized, NOW + STUDIO_V3_DRAFT_MAX_AGE_MS)).toBeNull();
  });

  it("never makes an empty, intro-only or malformed composition durable", () => {
    expect(serializeDurableStudioDraft("not-json", NOW)).toBeNull();
    expect(serializeDurableStudioDraft(JSON.stringify({ phase: "intro" }), NOW)).toBeNull();
    expect(parseDurableStudioDraft("not-json", NOW)).toBeNull();
    expect(parseDurableStudioDraft(JSON.stringify({ version: 99 }), NOW)).toBeNull();
  });
});
