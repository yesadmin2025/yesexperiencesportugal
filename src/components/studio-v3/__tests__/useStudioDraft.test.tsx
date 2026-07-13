// @vitest-environment jsdom

import { StrictMode, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStudioDraft } from "../useStudioDraft";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { STUDIO_DRAFT_STORAGE_KEY } from "../studioDraftStorage";

function Harness({
  savedToken,
  loadSaved = vi.fn(async () => ({ found: false })),
  onRestoreAddOns = vi.fn(),
}: {
  savedToken?: string;
  loadSaved?: (token: string) => Promise<{ found: boolean; state?: unknown }>;
  onRestoreAddOns?: (ids: string[]) => void;
}) {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const draft = useStudioDraft({
    state,
    setState,
    selectedAddOnIds: [],
    restoreAddOnIds: onRestoreAddOns,
    savedToken,
    loadSavedSignature: loadSaved,
  });
  return (
    <div>
      <span data-testid="status">{draft.status}</span>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="feeling">{state.feeling}</span>
      <span data-testid="notice">{draft.restoreNoticeId}</span>
      <button type="button" onClick={draft.clearDraft}>clear</button>
    </div>
  );
}

function seedLocalDraft() {
  window.localStorage.setItem(
    STUDIO_DRAFT_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      draftId: "draft-local",
      savedAt: 1,
      state: { ...INITIAL_STATE, phase: "feeling", feeling: "coastal" },
      tourId: null,
      addOnIds: [],
    }),
  );
}

describe("useStudioDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("commits local hydration once under Strict Mode", () => {
    seedLocalDraft();
    const restore = vi.fn();
    render(
      <StrictMode>
        <Harness onRestoreAddOns={restore} />
      </StrictMode>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getByTestId("feeling")).toHaveTextContent("coastal");
    expect(screen.getByTestId("notice")).toHaveTextContent("draft-local");
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("gives a saved link precedence and never applies the local draft", async () => {
    seedLocalDraft();
    const restore = vi.fn();
    const loadSaved = vi.fn(async () => ({
      found: true,
      state: { ...INITIAL_STATE, phase: "feeling", feeling: "romance" },
    }));
    render(
      <Harness savedToken="saved123" loadSaved={loadSaved} onRestoreAddOns={restore} />,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("loading-saved");
    await act(async () => Promise.resolve());
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getByTestId("phase")).toHaveTextContent("storyboard");
    expect(screen.getByTestId("feeling")).toHaveTextContent("romance");
    expect(screen.getByTestId("notice")).toBeEmptyDOMElement();
    expect(restore).toHaveBeenCalledWith([]);
  });

  it("issues one saved-link request and one commit under Strict Mode", async () => {
    const restore = vi.fn();
    const loadSaved = vi.fn(async () => ({
      found: true,
      state: { ...INITIAL_STATE, phase: "feeling", feeling: "romance" },
    }));
    render(
      <StrictMode>
        <Harness savedToken="saved123" loadSaved={loadSaved} onRestoreAddOns={restore} />
      </StrictMode>,
    );
    await act(async () => Promise.resolve());
    expect(loadSaved).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phase")).toHaveTextContent("storyboard");
  });

  it("does not write default state while saved-link hydration is pending", () => {
    seedLocalDraft();
    const before = window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
    const loadSaved = vi.fn(() => new Promise<{ found: boolean; state?: unknown }>(() => {}));
    render(<Harness savedToken="saved123" loadSaved={loadSaved} />);
    act(() => vi.advanceTimersByTime(2_000));
    expect(window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY)).toBe(before);
  });

  it("cancels a pending write when the draft is cleared", () => {
    seedLocalDraft();
    render(<Harness />);
    screen.getByRole("button", { name: "clear" }).click();
    act(() => vi.advanceTimersByTime(1_000));
    expect(window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
