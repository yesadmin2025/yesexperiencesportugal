/**
 * @vitest-environment jsdom
 *
 * Session persistence must never contain personal data.
 *
 * StudioV3State carries `firstName` and `guestDraft` (name, email, phone,
 * pickup address, guide notes). Those are conversation/checkout data, not
 * composition answers — the tab-scoped session snapshot used for refresh
 * recovery must exclude them entirely, both on write and on read.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudioV3 } from "../StudioV3";
import { INITIAL_STATE, type StudioV3State } from "../types";

const KEY = "yes.studio-v3.session.v1";

const PII = {
  firstName: "Amélia",
  fullName: "Amélia Vasconcelos",
  email: "amelia.pii@example.com",
  phone: "+351911222333",
  pickupAddress: "Hotel Avenida Palace, Lisbon",
  guideNotes: "Please include Quinta do Piloto, an unlisted winery.",
};

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

const WITH_PII: StudioV3State = {
  ...INITIAL_STATE,
  phase: "rhythm",
  feeling: "wine-food",
  companions: "couple",
  interests: ["wine"],
  refinement: "wine-cellar-depth",
  destinationIntent: "arrabida-setubal-azeitao",
  firstName: PII.firstName,
  guestDraft: {
    fullName: PII.fullName,
    email: PII.email,
    phone: PII.phone,
    pickupAddress: PII.pickupAddress,
    guideNotes: PII.guideNotes,
  },
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("StudioV3 session snapshot excludes PII", () => {
  it("never writes a name, email, phone, pickup address or custom winery note", async () => {
    // Seed a payload that (wrongly) contains PII, as an older build could have.
    window.sessionStorage.setItem(KEY, JSON.stringify(WITH_PII));

    mount();

    await waitFor(() => {
      const raw = window.sessionStorage.getItem(KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string).phase).toBe("rhythm");
    });

    const raw = window.sessionStorage.getItem(KEY) as string;
    for (const value of Object.values(PII)) {
      expect(raw, `raw session value must not contain "${value}"`).not.toContain(value);
    }
    expect(raw).not.toContain("guideNotes");
  });

  it("restores composition answers with firstName and guestDraft nulled", async () => {
    window.sessionStorage.setItem(KEY, JSON.stringify(WITH_PII));

    mount();

    await waitFor(() => {
      expect(window.sessionStorage.getItem(KEY)).not.toBeNull();
    });

    const stored = JSON.parse(window.sessionStorage.getItem(KEY) as string) as StudioV3State;
    expect(stored.firstName).toBeNull();
    expect(stored.guestDraft).toBeNull();
    // Non-personal composition answers survive for refresh recovery.
    expect(stored.phase).toBe("rhythm");
    expect(stored.feeling).toBe("wine-food");
    expect(stored.companions).toBe("couple");
    expect(stored.interests).toEqual(["wine"]);
    expect(stored.refinement).toBe("wine-cellar-depth");
    expect(stored.destinationIntent).toBe("arrabida-setubal-azeitao");
  });
});
