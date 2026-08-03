/**
 * @vitest-environment jsdom
 *
 * Session restoration race — regression lock.
 *
 * On first mount two effects fire in the same commit: the restore effect
 * (reads sessionStorage, schedules setState) and the persist effect (writes
 * the current state). With a ref-only gate the writer observed INITIAL_STATE
 * — phase "intro" — and DELETED the saved key before the restored state ever
 * landed, so a refresh mid-composition threw the traveller back to the start.
 *
 * These tests preload sessionStorage, mount the real StudioV3, and assert the
 * restored phase/answers survive (a) the first effect cycle and (b) a
 * subsequent refresh (remount). Malformed / obsolete payloads must fall back
 * to the intro without throwing.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudioV3 } from "../StudioV3";
import { INITIAL_STATE, type StudioV3State } from "../types";

const KEY = "yes.studio-v3.session.v1";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
    functions: { invoke: async () => ({ data: null, error: null }) },
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}));

function mount() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudioV3 />
    </QueryClientProvider>,
  );
}

function persisted(): (Partial<StudioV3State> & { phase?: string }) | null {
  const raw = window.sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

const IN_PROGRESS: StudioV3State = {
  ...INITIAL_STATE,
  phase: "rhythm",
  feeling: "wine-food",
  companions: "couple",
  interests: ["wine"],
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("StudioV3 sessionStorage restoration", () => {
  it("does not delete the saved composition during the first effect cycle", async () => {
    window.sessionStorage.setItem(KEY, JSON.stringify(IN_PROGRESS));
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

    mount();

    // The persist effect must never observe INITIAL_STATE and clear the key —
    // not even transiently, since a refresh inside that window loses the day.
    await waitFor(() => {
      expect(window.sessionStorage.getItem(KEY)).not.toBeNull();
    });
    expect(removeSpy.mock.calls.filter(([k]) => k === KEY)).toEqual([]);
    const after = persisted();
    expect(after?.phase).toBe("rhythm");
    expect(after?.feeling).toBe("wine-food");
    expect(after?.companions).toBe("couple");
    expect(after?.interests).toEqual(["wine"]);
  });

  it("survives a subsequent refresh (unmount + remount)", async () => {
    window.sessionStorage.setItem(KEY, JSON.stringify(IN_PROGRESS));

    const first = mount();
    await waitFor(() => expect(persisted()?.phase).toBe("rhythm"));
    first.unmount();

    mount();
    await waitFor(() => expect(persisted()?.phase).toBe("rhythm"));
    expect(persisted()?.feeling).toBe("wine-food");
  });

  it("falls back safely when the stored payload is malformed", async () => {
    window.sessionStorage.setItem(KEY, "{not json");
    expect(() => mount()).not.toThrow();
    await waitFor(() => {
      // Intro state persists nothing — the bad key is cleared, no crash.
      expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });
  });

  it("falls back safely when the stored phase is obsolete or non-restorable", async () => {
    for (const phase of ["some-removed-phase", "guestDetails", "checkoutSummary"]) {
      window.sessionStorage.setItem(KEY, JSON.stringify({ ...IN_PROGRESS, phase }));
      const view = mount();
      await waitFor(() => {
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
      });
      view.unmount();
    }
  });
});
