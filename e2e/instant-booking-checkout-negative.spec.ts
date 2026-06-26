/**
 * Negative tests for `create-signature-checkout`.
 *
 * Asserts the API rejects:
 *   - Unknown `flow` values (e.g. "premium", "", 123)
 *   - Mismatched `flow` + `tailored` combinations:
 *       * flow="tailor"    with tailored=false
 *       * flow="studio"    with tailored=true
 *       * flow="signature" with tailored=true
 *
 * Each rejection must return HTTP 400 with a clear `error` message.
 * The function must NOT create a Stripe session in any of these cases.
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

const TOUR_ID = "sintra-cascais";
const TOUR_TITLE = "Sintra & Cascais — Palaces and Coast";
const ORIGIN = "https://yesexperiencesportugal.com";

function tomorrowISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const baseBody = {
  tourId: TOUR_ID,
  tourTitle: TOUR_TITLE,
  guests: 2,
  pickupLabel: "09:00",
  dateExact: tomorrowISO(),
  priceFromEur: 320,
  returnUrl: `${ORIGIN}/tours/${TOUR_ID}?checkout=success`,
  cancelUrl: `${ORIGIN}/tours/${TOUR_ID}?checkout=cancelled`,
  environment: "sandbox" as const,
  stopLabels: ["Quinta da Regaleira", "Cabo da Roca", "Cascais Old Town"],
  journeyTitle: "Sintra & Cascais",
};

async function invokeCheckout(body: Record<string, unknown>) {
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
  let json: { url?: string; error?: string; sessionId?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* leave empty */
  }
  return { status: res.status, json, raw: text };
}

test.describe("instant booking checkout — negative (flow validation)", () => {
  test("rejects unknown flow string", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: false,
      flow: "premium",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid flow/i);
    expect(json.url).toBeUndefined();
    expect(json.sessionId).toBeUndefined();
  });

  test("rejects empty flow string", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: false,
      flow: "",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid flow/i);
    expect(json.url).toBeUndefined();
  });

  test("rejects non-string flow", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: false,
      flow: 123,
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid flow/i);
    expect(json.url).toBeUndefined();
  });

  test("rejects flow='tailor' with tailored=false", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: false,
      flow: "tailor",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/mismatch/i);
    expect(json.error).toMatch(/tailor/i);
    expect(json.url).toBeUndefined();
  });

  test("rejects flow='studio' with tailored=true", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: true,
      flow: "studio",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/mismatch/i);
    expect(json.error).toMatch(/studio/i);
    expect(json.url).toBeUndefined();
  });

  test("rejects flow='signature' with tailored=true", async () => {
    const { status, json } = await invokeCheckout({
      ...baseBody,
      tailored: true,
      flow: "signature",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/mismatch/i);
    expect(json.error).toMatch(/signature/i);
    expect(json.url).toBeUndefined();
  });
});
