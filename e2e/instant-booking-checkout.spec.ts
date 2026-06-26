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

type Flow = "studio" | "signature" | "tailor";

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
  flow?: Flow;
};

const baseBody: Omit<CheckoutBody, "tailored" | "stopLabels" | "journeyTitle" | "flow"> = {
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

type CheckoutResponse = {
  url?: string;
  sessionId?: string;
  bokunMapped?: boolean;
  flow?: Flow;
  productName?: string;
  lineItemDescription?: string;
  submitMessage?: string;
  error?: string;
};

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
  let json: CheckoutResponse = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* leave empty */
  }
  return { status: res.status, json, raw: text };
}

test.describe("instant booking checkout", () => {
  test("Studio reveal — Say YES returns a Stripe checkout URL with Studio copy", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
      journeyTitle: "Sintra & Cascais",
      tailored: false,
      flow: "studio",
    });
    expect(status, `studio checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(json.sessionId).toMatch(/^cs_/);
    expect(json.flow).toBe("studio");
    expect(json.productName).toBe(`YES Studio — ${TOUR_TITLE}`);
    expect(json.lineItemDescription).toContain("Built moment by moment");
    expect(json.submitMessage).toContain("Your Studio day is reserved");
  });

  test("Signature — Reserve as designed returns a Stripe checkout URL with Signature copy", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
      journeyTitle: TOUR_TITLE.split("—")[0].trim(),
      tailored: false,
      flow: "signature",
    });
    expect(status, `signature checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(json.flow).toBe("signature");
    expect(json.productName).toBe(`YES Signature — ${TOUR_TITLE}`);
    expect(json.lineItemDescription).toContain("Reserved as designed");
    expect(json.submitMessage).toContain("Your Signature day is reserved");
  });

  test("Tailor — Reserve with adjusted stops returns a Stripe checkout URL with Tailor copy", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Pena Palace", "Cascais Old Town"],
      journeyTitle: TOUR_TITLE.split("—")[0].trim(),
      tailored: true,
      flow: "tailor",
    });
    expect(status, `tailor checkout failed: ${raw}`).toBe(200);
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(json.flow).toBe("tailor");
    expect(json.productName).toBe(`YES Tailored — ${TOUR_TITLE}`);
    expect(json.lineItemDescription).toContain("Tailored stops applied");
    expect(json.submitMessage).toContain("Your tailored day is reserved");
    expect(json.submitMessage).toContain("within 2 hours");
  });

  test("Bókun is wired — checkout response confirms a Bókun product mapping", async () => {
    const { status, json, raw } = await invokeCheckout({
      ...baseBody,
      stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
      journeyTitle: TOUR_TITLE.split("—")[0].trim(),
      tailored: false,
      flow: "signature",
    });
    expect(status, `bokun-mapping probe failed: ${raw}`).toBe(200);
    expect(
      json.bokunMapped,
      `No Bókun mapping for ${TOUR_ID}. The Stripe webhook will mark this booking as needs_review instead of confirming in Bókun.`,
    ).toBe(true);
  });
});
