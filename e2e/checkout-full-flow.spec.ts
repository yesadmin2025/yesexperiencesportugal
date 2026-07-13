/**
 * End-to-end confirmation-page flow for Builder, Tailored, and Signature.
 *
 * This spec ACTUALLY completes a Stripe sandbox payment for each of the three
 * surfaces and asserts the branded /booking-confirmed page renders "Confirmed"
 * with a receipt reference.
 *
 * Because it hits the live Stripe sandbox + a public Lovable-hosted return URL,
 * it is opt-in via `STRIPE_E2E=1`. A dedicated GitHub workflow
 * (`checkout-full-flow.yml`, workflow_dispatch) sets the flag when you want to
 * run it. The default smoke suite stays untouched.
 *
 * How it works per surface:
 *   1. POST to the surface's Stripe-session edge function with
 *      `uiMode: "hosted"` — returns a real https://checkout.stripe.com URL.
 *   2. Playwright fills the Stripe-hosted form with the classic test card
 *      4242 4242 4242 4242 and submits.
 *   3. Stripe redirects to `${BASE}/booking-confirmed?session_id=cs_test_…`.
 *   4. Assert the "Confirmed" eyebrow + "Your day in Portugal is reserved"
 *      title + Reference tail render.
 *
 * Child pricing/session creation is covered by bokun-checkout-coverage.spec.ts,
 * before this payment-completion suite reaches Stripe's hosted page.
 */

import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = "https://kqygnqetygcvkaauwbji.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeWducWV0eWdjdmthYXV3YmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc1NzUsImV4cCI6MjA5Mjg1MzU3NX0.1ilgY0HVPZUntxjNke4Ii3BXOSu1DJ_AlhE2zaHR_Tg";

// Public https origin Stripe will redirect back to. Must be in the
// edge-function return-url allowlist (lovable.app / yesexperiences.pt).
const CONFIRMED_ORIGIN =
  process.env.PLAYWRIGHT_CONFIRMED_ORIGIN ??
  "https://yesexperiencesportugal.lovable.app";

const ENABLED = process.env.STRIPE_E2E === "1";
const describe = ENABLED ? test.describe : test.describe.skip;

interface HostedResponse {
  url?: string;
  error?: string;
}

async function edgeCall(path: string, body: unknown): Promise<HostedResponse> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as HostedResponse;
}

const returnUrl = `${CONFIRMED_ORIGIN}/booking-confirmed`;

const surfaces: Array<{
  name: "Signature" | "Tailored" | "Builder";
  createSession: () => Promise<HostedResponse>;
}> = [
  {
    name: "Signature",
    createSession: () =>
      edgeCall("create-signature-checkout", {
        tourId: "arrabida-wine-allinclusive",
        tourTitle: "Arrábida wine — verification",
        guests: 2,
        stopLabels: ["Full-flow E2E"],
        pickupLabel: "Hotel pickup included",
        journeyTitle: "e2e-signature",
        priceFromEur: 180,
        returnUrl,
        environment: "sandbox",
        flow: "signature",
        uiMode: "hosted",
        guestDetails: { hotelPickupIncluded: true },
      }),
  },
  {
    name: "Tailored",
    createSession: () =>
      edgeCall("create-signature-checkout", {
        tourId: "arrabida-wine-allinclusive",
        tourTitle: "Arrábida wine — tailored verification",
        guests: 2,
        stopLabels: ["Full-flow E2E — tailored"],
        pickupLabel: "Hotel pickup included",
        journeyTitle: "e2e-tailored",
        priceFromEur: 200,
        returnUrl,
        environment: "sandbox",
        flow: "tailor",
        tailored: true,
        uiMode: "hosted",
        guestDetails: { hotelPickupIncluded: true },
      }),
  },
  {
    name: "Builder",
    createSession: () =>
      edgeCall("create-builder-checkout", {
        guests: 2,
        regionLabel: "Lisbon & Sintra",
        stopLabels: ["Full-flow E2E stop"],
        pace: "balanced",
        returnUrl,
        environment: "sandbox",
        uiMode: "hosted",
      }),
  },
];

async function completeStripeHostedCheckout(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Email — hosted page shows it top-of-page.
  const email = page.getByLabel(/email/i).first();
  await email.fill(`e2e+${Date.now()}@yesexperiences.pt`);

  // Card number / expiry / CVC / name.
  await page.getByLabel(/card number/i).fill("4242 4242 4242 4242");
  await page.getByLabel(/expir/i).fill("12 / 34");
  await page.getByLabel(/cvc/i).fill("123");
  const nameField = page.getByLabel(/name on card/i);
  if (await nameField.count()) await nameField.fill("E2E Test");

  // Country if shown.
  const country = page.getByLabel(/country|region/i).first();
  if (await country.count()) {
    try {
      await country.selectOption({ label: "Portugal" });
    } catch {
      /* combobox variant — skip */
    }
  }

  // Pay button — label varies ("Pay €X", "Subscribe"). Fall back to the
  // submit button on the payment form if the label match fails.
  const payByLabel = page.getByRole("button", { name: /^pay\b/i });
  if (await payByLabel.count()) {
    await payByLabel.first().click();
  } else {
    await page.locator('button[type="submit"]').last().click();
  }

  // Stripe redirects to the return URL.
  await page.waitForURL(/\/booking-confirmed\?.*session_id=cs_test_/, {
    timeout: 45_000,
  });
}

describe("End-to-end booking confirmation", () => {
  test.describe.configure({ timeout: 90_000 });

  for (const surface of surfaces) {
    test(`${surface.name} — completes payment and lands on branded confirmation`, async ({
      page,
    }) => {
      const session = await surface.createSession();
      expect(session.url, `hosted url for ${surface.name}: ${session.error ?? ""}`).toMatch(
        /^https:\/\/checkout\.stripe\.com\//,
      );

      await completeStripeHostedCheckout(page, session.url!);

      // Branded confirmation UI.
      await expect(page.getByText(/confirmed/i).first()).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("heading", { name: /your day in portugal is reserved/i }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/^reference · /i)).toBeVisible();
    });
  }
});
