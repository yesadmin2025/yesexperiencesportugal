// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STUDIO_DRAFT_STORAGE_KEY,
  claimStudioDraftRestoreNotice,
  createStudioDraftEnvelope,
  readStudioDraft,
  validAddOnIdsForState,
} from "../studioDraftStorage";
import { INITIAL_STATE } from "../types";

describe("Studio draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("migrates v1 state while dropping computed add-on data", () => {
    window.localStorage.setItem(
      STUDIO_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: 10,
        state: { ...INITIAL_STATE, phase: "storyboard", tourId: "arrabida-boat" },
        tourId: "arrabida-boat",
        addOnIds: ["azulejo-workshop"],
        addOnItems: [{ id: "stale", priceEur: 9999 }],
        addOnsTotalEur: 9999,
      }),
    );

    const restored = readStudioDraft();
    expect(restored?.version).toBe(2);
    expect(restored?.state.phase).toBe("storyboard");
    expect(restored?.addOnIds).toEqual(["azulejo-workshop"]);
    expect(JSON.parse(window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY)!)).not.toHaveProperty(
      "addOnItems",
    );
  });

  it("removes corrupt payloads instead of partially restoring them", () => {
    window.localStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, "not-json");
    expect(readStudioDraft()).toBeNull();
    expect(window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("keeps only add-ons eligible for the restored tour", () => {
    const state = {
      ...INITIAL_STATE,
      phase: "storyboard" as const,
      tourId: "arrabida-boat",
    };
    const valid = validAddOnIdsForState(state, [
      "azulejo-workshop",
      "sintra-detour",
      "unknown-addon",
    ]);
    expect(valid).toContain("azulejo-workshop");
    expect(valid).not.toContain("sintra-detour");
    expect(valid).not.toContain("unknown-addon");
  });

  it("claims the restore notice only once per draft in a tab session", () => {
    expect(claimStudioDraftRestoreNotice("draft-a")).toBe(true);
    expect(claimStudioDraftRestoreNotice("draft-a")).toBe(false);
    expect(claimStudioDraftRestoreNotice("draft-b")).toBe(true);
  });

  it("retains a stable draft id across writes", () => {
    vi.spyOn(Date, "now").mockReturnValue(20);
    const envelope = createStudioDraftEnvelope({
      draftId: "stable-id",
      state: { ...INITIAL_STATE, phase: "feeling", feeling: "coastal" },
      addOnIds: [],
    });
    expect(envelope.draftId).toBe("stable-id");
    expect(envelope.savedAt).toBe(20);
  });
});
