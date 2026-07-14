// E6 verification — Studio V3 end-to-end path.
//
// Locks in the guarantees the corrected plan promises for the
// composition → refine → storytelling → guest details → summary-above-
// Stripe journey:
//
//   1. Submitting Guest Details exactly once fires exactly one
//      sendSignatureStoryEmail call. A second submit with an identical
//      email address is deduped client-side (storyDispatchedForRef) and
//      never enqueues a second dispatch.
//   2. Entering the Checkout Summary phase triggers exactly one
//      create-signature-checkout server call (the auto-fire useEffect
//      in StudioV3 is idempotent per revision).
//   3. No Bókun request is made from the client at any point in this
//      flow — booking hand-off is server-side only.
//
// If the funnel walker fails to reach guest details in this environment
// (Mapbox/AI/data gaps), the spec skips rather than failing — this
// contract test is about the tail of the flow, not the walker.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

interface Counters {
  storyEmail: number;
  createCheckout: number;
  bokun: number;
}

test("guest-details submit is single-shot + no client-side Bókun call", async ({ page }) => {
  const counters: Counters = { storyEmail: 0, createCheckout: 0, bokun: 0 };

  // Count every relevant network call. TanStack server fns POST to
  // /_serverFn/* with a hash — match by referenced function name in the
  // path or body when available; fall back to endpoint fragments.
  page.on("request", (req) => {
    const url = req.url();
    if (/bokun|bocum/i.test(url)) counters.bokun++;
    if (/create-signature-checkout/i.test(url)) counters.createCheckout++;
    if (/sendSignatureStoryEmail|signature-story/i.test(url)) counters.storyEmail++;
  });
  // Server-fn URLs are hashed. Also inspect POST bodies for the fn name.
  page.on("request", async (req) => {
    if (req.method() !== "POST") return;
    const url = req.url();
    if (!/_serverFn/.test(url)) return;
    try {
      const body = req.postData() ?? "";
      if (/sendSignatureStoryEmail|signature-story/i.test(body)) counters.storyEmail++;
    } catch {
      /* ignore */
    }
  });

  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);

  const cont = page.getByTestId("studio-v3-final-reveal-continue");
  if (await cont.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await cont.click({ timeout: 4_000 }).catch(() => undefined);
  }

  const cta = page.getByTestId("studio-v3-guest-details-submit");
  if (!(await cta.isVisible({ timeout: 6_000 }).catch(() => false))) {
    test.skip(true, "Funnel did not reach Guest Details in this environment.");
  }

  // Fill the minimum required fields.
  const email = "e6-verify@yesexperiences.test";
  await page.getByLabel(/email/i).first().fill(email);
  const pickupField = page.getByLabel(/pickup address/i).first();
  if (await pickupField.isVisible().catch(() => false)) {
    await pickupField.fill("Hotel Avenida Palace, Lisbon");
  }
  const nameField = page.getByLabel(/full name|your name/i).first();
  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill("E6 Verify");
  }
  const phoneField = page.getByLabel(/phone|whatsapp/i).first();
  if (await phoneField.isVisible().catch(() => false)) {
    await phoneField.fill("+351911111111");
  }

  // Snapshot counters BEFORE the first submit so we can attribute deltas.
  const before = { ...counters };
  await cta.click({ timeout: 4_000 });

  // Wait for the checkout summary to mount (auto-fires create-checkout).
  await page.getByTestId("studio-v3-checkout-summary").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1_500);

  const afterFirst = { ...counters };

  expect(
    afterFirst.storyEmail - before.storyEmail,
    "exactly one Signature story email dispatch per submit",
  ).toBe(1);
  expect(
    afterFirst.createCheckout - before.createCheckout,
    "checkout summary auto-fires create-signature-checkout exactly once",
  ).toBe(1);
  expect(counters.bokun, "no Bókun request may originate from the client").toBe(0);

  // Navigate back and resubmit with the SAME email — client dedupes.
  const back = page.getByRole("button", { name: /^back/i }).first();
  if (await back.isVisible().catch(() => false)) {
    await back.click({ timeout: 4_000 }).catch(() => undefined);
    if (await cta.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const before2 = { ...counters };
      await cta.click({ timeout: 4_000 }).catch(() => undefined);
      await page.waitForTimeout(1_500);
      expect(
        counters.storyEmail - before2.storyEmail,
        "resubmit with identical email must not enqueue a second dispatch",
      ).toBe(0);
    }
  }

  expect(counters.bokun, "no Bókun request across the entire flow").toBe(0);
});
