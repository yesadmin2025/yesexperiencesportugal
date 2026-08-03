/**
 * @vitest-environment jsdom
 *
 * The Studio session key (`yes.studio-v3.session.v1`) is a refresh-recovery
 * convenience for composition answers only. It must never contain personal
 * data the traveller types about themselves: name, email, phone, pickup
 * address or free-text guide notes (e.g. an unlisted winery request).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { StudioV3 } from "../StudioV3";
import type { StudioV3State } from "../types";

const KEY = "yes.studio-v3.session.v1";

const NAME = "Ana Ferreira";
const EMAIL = "ana.ferreira@example.com";
const PHONE = "+351911111111";
const PICKUP = "Hotel Avenida Palace, Lisbon";
const NOTE = "Please include Quinta do Piloto, it is not on your list.";

/** A mid-composition state seeded WITH personal data, as an older build could. */
const SEEDED = {
  phase: "confirmation",
  feeling: "wine-food",
  companions: "couple",
  occasion: "none",
  dateMode: "exact",
  dateExact: "2099-10-09",
  pickup: "lisbon",
  guests: 2,
  adults: 2,
  minorAges: [],
  interests: ["wine"],
  rhythm: "balanced",
  refinement: null,
  considerations: ["none"],
  language: "en",
  investment: "elevated",
  tourId: "arrabida-wine-allinclusive",
  journeyTitle: "Arrábida, cellar stories and the Portuguese table",
  guestsInferred: false,
  guestsPrivateEvent: false,
  firstName: NAME,
  editedRoutePoints: null,
  destinationIntent: "arrabida-setubal-azeitao",
  pathMode: "guided",
  rerollCount: 0,
  guestDraft: {
    fullName: NAME,
    email: EMAIL,
    phone: PHONE,
    pickupAddress: PICKUP,
    guideNotes: NOTE,
  },
} as unknown as StudioV3State;

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("Studio session persistence excludes personal data", () => {
  it("never writes name, email, phone, pickup address or guide notes", async () => {
    window.sessionStorage.setItem(KEY, JSON.stringify(SEEDED));

    await act(async () => {
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
      render(
        <QueryClientProvider client={client}>
          <StudioV3 />
        </QueryClientProvider>,
      );
    });

    const raw = window.sessionStorage.getItem(KEY) ?? "";
    for (const secret of [NAME, EMAIL, PHONE, PICKUP, NOTE]) {
      expect(raw, `persisted session must not contain "${secret}"`).not.toContain(secret);
    }

    const parsed = JSON.parse(raw) as Partial<StudioV3State>;
    expect(parsed.firstName).toBeNull();
    expect(parsed.guestDraft).toBeNull();

    // Non-personal composition answers still survive a refresh.
    expect(parsed.tourId).toBe("arrabida-wine-allinclusive");
    expect(parsed.feeling).toBe("wine-food");

    // Nothing leaks into localStorage either.
    expect(JSON.stringify(window.localStorage)).not.toContain(EMAIL);
  });
});
