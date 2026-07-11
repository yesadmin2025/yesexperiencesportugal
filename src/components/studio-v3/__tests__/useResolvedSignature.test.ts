// Verifies useResolvedSignature respects the Pass 1 §1 constraint:
// no quote requests before phase === "confirmation" (finalSignature).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useResolvedSignature } from "../useResolvedSignature";

const fetchStudioQuote = vi.fn();
vi.mock("@/lib/studio-v3/quoteClient", () => ({
  fetchStudioQuote: (...args: unknown[]) => fetchStudioQuote(...args),
}));

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

const baseSnapshot = {
  commercialProductKey: "studio-v3-private-full-day" as const,
  signatureId: "sig-1",
  title: "Setúbal · Azeitão · Sesimbra",
  destinationRegion: "Setúbal · Azeitão · Sesimbra",
  pickupCity: "Lisbon",
  date: "2099-01-01",
  startTime: "09:00",
  language: "en" as const,
  guests: 3,
  routeStops: [{ id: "s1", label: "Mercado do Livramento" }],
  selectedAddOns: [{ id: "coastal-boat-sesimbra", quantity: 1 }],
  routeStatus: "pending-review" as const,
};

beforeEach(() => {
  fetchStudioQuote.mockReset();
  fetchStudioQuote.mockResolvedValue({
    quoteToken: "tok",
    revision: "abc",
    snapshotHash: "abc",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    pricing: {
      status: "quoted",
      commercialProductKey: "studio-v3-private-full-day",
      guests: 3,
      unitEur: 145,
      baseSubtotalEur: 435,
      addOnsSubtotalEur: 90,
      totalEur: 525,
      currency: "EUR",
    },
    addOns: [],
    inclusions: [],
    routeStatus: "pending-review",
    availabilityStatus: "pending-review",
    itinerary: {
      title: baseSnapshot.title,
      destinationRegion: baseSnapshot.destinationRegion,
      pickupCity: baseSnapshot.pickupCity,
      date: baseSnapshot.date,
      startTime: baseSnapshot.startTime,
      language: baseSnapshot.language,
      guests: baseSnapshot.guests,
      routeStops: baseSnapshot.routeStops,
    },
  });
});

describe("useResolvedSignature — Pass 1 §1 (no quote before finalSignature)", () => {
  it("does not fetch during storyboard / refine phases", async () => {
    const { rerender } = renderHook(
      ({ phase }) => useResolvedSignature({ phase, snapshot: baseSnapshot, debounceMs: 0 }),
      { wrapper: wrapper(), initialProps: { phase: "storyboard" } },
    );
    // give debounce + query enough microtasks
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchStudioQuote).not.toHaveBeenCalled();

    rerender({ phase: "map" });
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchStudioQuote).not.toHaveBeenCalled();
  });

  it("fetches when phase advances to confirmation (finalSignature alias)", async () => {
    const { result } = renderHook(
      () =>
        useResolvedSignature({ phase: "confirmation", snapshot: baseSnapshot, debounceMs: 0 }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(fetchStudioQuote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.quote?.pricing.totalEur).toBe(525));
  });
});
