import { test, expect } from "@playwright/test";
// Derived from the canonical Signature registry — NEVER hand-maintain a
// parallel list. When a 13th (or 14th, or …) tour is added to
// `src/lib/tours/signatureRegistry.ts`, this coverage extends automatically
// so no tour can silently escape the category-aware checkout gate.
import { publicSignatureTourIds } from "../src/lib/tours/signatureRegistry";

const SIGNATURE_TOUR_IDS = publicSignatureTourIds();

test("SIGNATURE_TOUR_IDS covers every public Signature tour in the registry", () => {
  expect(SIGNATURE_TOUR_IDS.length).toBeGreaterThanOrEqual(12);
  // Guard against accidental duplication.
  expect(new Set(SIGNATURE_TOUR_IDS).size).toBe(SIGNATURE_TOUR_IDS.length);
});


/**
 * Full tour-by-tour verification:
 *  • Every signature has a Bókun product mapping AND a price tier row.
 *  • The `create-signature-checkout` edge function returns a clientSecret
 *    + publishableKey for embedded mode, and a `url` for hosted mode.
 *
 * Drives the public Supabase Edge endpoint directly — no UI flake.
 */

const SUPABASE_URL = "https://kqygnqetygcvkaauwbji.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeWducWV0eWdjdmthYXV3YmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc1NzUsImV4cCI6MjA5Mjg1MzU3NX0.1ilgY0HVPZUntxjNke4Ii3BXOSu1DJ_AlhE2zaHR_Tg";

function futureDate(days = 14) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function callFunction(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function callCheckout(tourId: string, uiMode: "embedded" | "hosted") {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-signature-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({
      tourId,
      tourTitle: tourId,
      guests: 2,
      stopLabels: ["Verification"],
      pickupLabel: "Hotel pickup included — verification",
      journeyTitle: `verify-${tourId}`,
      priceFromEur: 180,
      returnUrl: "https://yesexperiencesportugal.com/booking-confirmed",
      environment: "sandbox",
      flow: "signature",
      uiMode,
      guestDetails: { hotelPickupIncluded: true },
    }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

for (const tourId of SIGNATURE_TOUR_IDS) {
  const tour = { id: tourId };
  test(`[${tour.id}] embedded + hosted checkout resolve with bokunMapped`, async () => {
    const embedded = await callCheckout(tour.id, "embedded");
    expect(embedded.status, `embedded ${tour.id}`).toBe(200);
    expect(embedded.body.clientSecret, `clientSecret ${tour.id}`).toBeTruthy();
    expect(embedded.body.publishableKey, `publishableKey ${tour.id}`).toBeTruthy();
    expect(embedded.body.bokunMapped, `bokunMapped ${tour.id}`).toBe(true);

    const hosted = await callCheckout(tour.id, "hosted");
    expect(hosted.status, `hosted ${tour.id}`).toBe(200);
    expect(hosted.body.url, `hosted url ${tour.id}`).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(hosted.body.bokunMapped, `hosted bokunMapped ${tour.id}`).toBe(true);
  });
}

for (const flow of ["signature", "tailor"] as const) {
  test(`${flow} adult + child quote opens embedded checkout immediately`, async () => {
    const quote = await callFunction("booking-quote", {
      flow,
      commercialProductKey: "arrabida-wine-allinclusive",
      date: futureDate(),
      startTime: "09:00",
      travellerComposition: { adults: 2, minorAges: [8] },
      addOns: [],
      ...(flow === "tailor" ? { itineraryRevision: "child-checkout-regression" } : {}),
    });
    expect(quote.status, JSON.stringify(quote.body)).toBe(200);
    expect(quote.body.availabilityStatus).toBe("available");
    expect(quote.body.quoteToken).toMatch(/^bq3\./);

    const checkout = await callFunction("create-signature-checkout", {
      mode: "booking-quote-create-session",
      quoteToken: quote.body.quoteToken,
      environment: "sandbox",
      returnUrl: "https://yesexperiencesportugal.com/booking-confirmed?tour=arrabida-wine-allinclusive",
      uiMode: "embedded",
      tourTitle: "Arrábida Wine — All Inclusive",
      pickupLabel: "Hotel pickup",
      journeyTitle: "Arrábida Wine",
      customerEmail: `${flow}-child-checkout@yesexperiencesportugal.com`,
    });
    expect(checkout.status, JSON.stringify(checkout.body)).toBe(200);
    expect(checkout.body.flow).toBe(flow);
    expect(checkout.body.sessionId).toMatch(/^cs_test_/);
    expect(checkout.body.clientSecret).toBeTruthy();
    expect(checkout.body.publishableKey).toMatch(/^pk_test_/);
  });
}
