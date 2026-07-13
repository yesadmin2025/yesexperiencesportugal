// Regression: EVERY public Signature tour MUST render the category-aware
// BandedSignatureBookingForm (with the TravellerCompositionPicker), even
// when the client readiness mirror is EMPTY. Empty readiness means "not
// synced yet" — the `booking-quote` edge function performs the server-side
// category synchronisation on first call. A silent fallback to the legacy
// adults-only stepper would strand every mixed-family booking on a public
// Signature route.
//
// If a 13th tour is ever added to the registry, this test extends
// automatically. That's the whole point.

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { publicSignatureTourIds } from "@/lib/tours/signatureRegistry";
import { signatureTours } from "@/data/signatureTours";

// Force useTourBokunReadinessFor to return an EMPTY-mirror shape (first-visit
// case). This is the exact failure mode reported in production.
vi.mock("@/hooks/use-tour-bokun-readiness", () => ({
  useTourBokunReadinessFor: () => ({ readiness: undefined, isLoading: false }),
  useTourBokunReadiness: () => ({ data: {}, isLoading: false }),
}));

// Stub the checkout drawer + details dialog + link — they pull in Stripe /
// router internals we don't need for this shape test.
vi.mock("@/components/checkout/BrandedCheckoutDrawer", () => ({
  BrandedCheckoutDrawer: () => null,
}));
vi.mock("@/components/checkout/FinalDetailsDialog", () => ({
  FinalDetailsDialog: () => null,
}));
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    useNavigate: () => () => {},
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
// Booking-quote hook is a network call — stub it to inert state.
vi.mock("@/hooks/use-booking-quote", () => ({
  useBookingQuote: () => ({
    loading: false,
    quote: null,
    unavailable: null,
    error: null,
    pricingRevision: "test",
    refresh: () => {},
  }),
}));

import { SimpleBookingForm } from "@/components/SimpleBookingForm";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Public Signature booking form routing", () => {
  const registryIds = publicSignatureTourIds();
  const tourById = new Map(signatureTours.map((t) => [t.id, t]));

  it("has at least 12 public Signature tours in the registry", () => {
    expect(registryIds.length).toBeGreaterThanOrEqual(12);
  });

  it.each(registryIds)(
    "%s renders the category-aware form (TravellerCompositionPicker), no legacy Guests stepper, even with empty readiness",
    (id) => {
      const tour = tourById.get(id);
      expect(tour, `signatureTours missing entry for registry id ${id}`).toBeDefined();
      const { getByText, queryByLabelText } = renderWithProviders(
        <SimpleBookingForm tour={tour!} />,
      );
      // Category-aware picker is present.
      expect(getByText(/Who is travelling\?/i)).toBeTruthy();
      // Legacy adults-only stepper is NOT present.
      expect(queryByLabelText(/Decrease guests/i)).toBeNull();
      expect(queryByLabelText(/Increase guests/i)).toBeNull();
    },
  );
});
