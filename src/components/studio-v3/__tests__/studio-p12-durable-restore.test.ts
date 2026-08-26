/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearStudioDraftPersistence,
  consumeDurableStudioDraftRestore,
  restoreDurableStudioDraftBeforeMount,
} from "@/components/studio-v3/studioSessionPrivacy";
import {
  STUDIO_V3_DURABLE_DRAFT_KEY,
  STUDIO_V3_DRAFT_MAX_AGE_MS,
  STUDIO_V3_SESSION_KEY,
  serializeDurableStudioDraft,
} from "@/lib/studio-v3/draftSnapshot";

const NOW = Date.UTC(2026, 7, 26, 18, 0, 0);

function durableProgress(now = Date.now()) {
  return serializeDurableStudioDraft(
    JSON.stringify({
      phase: "logistics",
      feeling: "coastal",
      companions: "couple",
      interests: ["coast", "gastronomy"],
      rhythm: "slow",
      firstName: "Private Traveller",
      considerations: ["allergies"],
      guestDraft: { email: "private@example.com" },
    }),
    now,
  );
}

afterEach(() => {
  window.history.replaceState({}, "", "/studio-v3");
  clearStudioDraftPersistence();
  consumeDurableStudioDraftRestore();
});

describe("P12 durable Studio browser restore", () => {
  it("restores a valid local draft into the existing session channel", () => {
    const raw = durableProgress();
    expect(raw).not.toBeNull();
    window.localStorage.setItem(STUDIO_V3_DURABLE_DRAFT_KEY, raw as string);

    expect(restoreDurableStudioDraftBeforeMount()).toBe(true);

    const session = window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY);
    expect(session).not.toBeNull();
    expect(session).toContain('"phase":"logistics"');
    expect(session).toContain('"feeling":"coastal"');
    expect(session).not.toContain("Private Traveller");
    expect(session).not.toContain("private@example.com");
    expect(session).not.toContain("allergies");
    expect(consumeDurableStudioDraftRestore()).toBe(true);
    expect(consumeDurableStudioDraftRestore()).toBe(false);
  });

  it("never lets a shared ?saved= view replace the traveller's session", () => {
    const raw = durableProgress();
    window.localStorage.setItem(STUDIO_V3_DURABLE_DRAFT_KEY, raw as string);
    window.history.replaceState({}, "", "/studio-v3?saved=abc123");

    expect(restoreDurableStudioDraftBeforeMount()).toBe(false);
    expect(window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(STUDIO_V3_DURABLE_DRAFT_KEY)).toBe(raw);
  });

  it("does not overwrite an active same-tab session with an older durable draft", () => {
    const raw = durableProgress();
    window.localStorage.setItem(STUDIO_V3_DURABLE_DRAFT_KEY, raw as string);
    window.sessionStorage.setItem(
      STUDIO_V3_SESSION_KEY,
      JSON.stringify({ phase: "rhythm", feeling: "wine-food" }),
    );

    expect(restoreDurableStudioDraftBeforeMount()).toBe(false);
    expect(window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY)).toContain("wine-food");
  });

  it("drops an expired durable draft instead of reviving stale state", () => {
    const raw = durableProgress(NOW);
    window.localStorage.setItem(STUDIO_V3_DURABLE_DRAFT_KEY, raw as string);

    const realNow = Date.now;
    Date.now = () => NOW + STUDIO_V3_DRAFT_MAX_AGE_MS;
    try {
      expect(restoreDurableStudioDraftBeforeMount()).toBe(false);
      expect(window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY)).toBeNull();
      expect(window.localStorage.getItem(STUDIO_V3_DURABLE_DRAFT_KEY)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});
