import { test, expect } from "@playwright/test";
import { signatureTours } from "../src/data/signatureTours";

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

for (const tour of signatureTours) {
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
