/**
 * Instant booking — Studio / Signature / Tailor → Stripe + Bókun wiring.
 *
 * Verifies, without opening the Stripe checkout window, that:
 *
 *   1. Each of the three instant-booking surfaces (Studio reveal, Signature
 *      "as designed", and Tailor) successfully calls the
 *      `create-signature-checkout` edge function and receives a real
 *      `https://checkout.stripe.com/...` session URL.
 *   2. The Signature tour used in the test is mapped to a Bókun product via
 *      the `tour_bokun_mapping` table — i.e. the webhook will push the
 *      booking to Bókun after Stripe confirms payment.
 *
 * The test talks to the deployed edge function and the public Supabase
 * REST endpoint directly. It never navigates to Stripe — which is exactly
 * what we want in CI.
 */
import { expect, test } from "@playwright/test";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://kqygnqetygcvkaauwbji.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeWducWV0eWdjdmthYXV3YmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc1NzUsImV4cCI6MjA5Mjg1MzU3NX0.1ilgY0HVPZUntxjNke4Ii3BXOSu1DJ_AlhE2zaHR_Tg";

// A real Signature with a Bókun mapping and tier pricing.
const TOUR_ID = "sintra-cascais";
const TOUR_TITLE = "Sintra & Cascais — Palaces and Coast";
const ORIGIN = "https://yesexperiencesportugal.com";

type CheckoutBody = {
  tourId: string;
  tourTitle: string;
  guests: number;
  stopLabels: string[];
  pickupLabel: string;
  dateExact: string;
  journeyTitle: string;
  priceFromEur: number;
  returnUrl: string;
  cancelUrl: string;
  environment: "sandbox" | "live";
  tailored: boolean;
};

const baseBody: Omit<CheckoutBody, "tailored" | "stopLabels" | "journeyTitle"> = {
  tourId: TOUR_ID,
  tourTitle: TOUR_TITLE,
  guests: 2,
  pickupLabel: "09:00",
  dateExact: tomorrowISO(),
  priceFromEur: 320,
  returnUrl: `${ORIGIN}/tours/${TOUR_ID}?checkout=success`,
  cancelUrl: `${ORIGIN}/tours/${TOUR_ID}?checkout=cancelled`,
  environment: "sandbox",
};

function tomorrowISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function invokeCheckout(body: CheckoutBody) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-signature-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { url?: string; sessionId?: string; bokunMapped?: boolean; error?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* leave empty */
  }
  return { status: res.status, json, raw: text };
}

test.describe("instant booking checkout", () => {
  test("Studio reveal — Say YES returns a Stripe checkout URL", async () => {
    // Studio reveal posts the resolved Signature + chosen guest count.
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
      journeyTitle: "Sintra & Cascais",
      tailored: false,
    });
    expect(status, `studio checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(json.sessionId).toMatch(/^cs_/);
  });

  test("Signature — Reserve as designed returns a Stripe checkout URL", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
      journeyTitle: TOUR_TITLE.split("—")[0].trim(),
      tailored: false,
    });
    expect(status, `signature checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test("Tailor — Reserve with adjusted stops returns a Stripe checkout URL", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      // Tailored: one swapped stop. Booking goes through Stripe; the webhook
      // routes it to needs_review in Bókun for operator reconciliation.
      stopLabels: ["Quinta da Regaleira", "Pena Palace", "Cascais Old Town"],
      journeyTitle: TOUR_TITLE.split("—")[0].trim(),
      tailored: true,
    });
    expect(status, `tailor checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test("Bókun is wired — Signature tour has a Bókun product mapping", async () => {
    // RLS allows anon SELECT on tour_bokun_mapping (public reference data).
    // If RLS hides it for anon, the webhook (service role) still sees it —
    // we surface that case with a clear message so CI fails loudly.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tour_bokun_mapping?tour_id=eq.${TOUR_ID}&select=tour_id,bokun_product_id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    expect(res.status, "tour_bokun_mapping query failed").toBe(200);
    const rows = (await res.json()) as Array<{ bokun_product_id: string }>;
    expect(
      rows.length,
      `No Bókun mapping returned for ${TOUR_ID} — either the row is missing or RLS hides it from anon. The webhook still uses the service role, but tests can't see it; expose a narrow public SELECT or add an admin smoke test.`,
    ).toBeGreaterThan(0);
    expect(rows[0].bokun_product_id).toBeTruthy();
  });
});
