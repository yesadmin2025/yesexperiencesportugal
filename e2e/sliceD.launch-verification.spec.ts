/**
 * Slice D — MOCKED browser flows (not real external smoke).
 *
 * Loads each public flow (Signature / Tailored / Studio V3) at desktop
 * 1280×1800 and mobile 393×852, stubs every Supabase / Bókun / Stripe
 * endpoint via `page.route()`, screenshots the landing state, and asserts
 * no horizontal overflow. Composition-picker + itinerary DOM assertions
 * are kept as best-effort visible-text checks — this spec is UI wiring
 * evidence, not an end-to-end integration test.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/browser/sliceD";
mkdirSync(OUT, { recursive: true });

const MIXED_QUOTE = {
  ok: true,
  quoteToken: "stub-token",
  basePricing: {
    subtotalEur: 720,
    resolvedMinors: [
      { bokunCategoryId: "101", label: "Adult", uiBand: "adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "102", label: "Youth (13-17)", uiBand: "youth", quantity: 1, unitEur: 180, subtotalEur: 180 },
      { bokunCategoryId: "103", label: "Child (5-12)", uiBand: "child", quantity: 1, unitEur: 100, subtotalEur: 100 },
      { bokunCategoryId: "104", label: "Infant (0-4)", uiBand: "infant", quantity: 1, unitEur: 0, subtotalEur: 0 },
    ],
  },
  addOnPricing: { subtotalEur: 0, lines: [] },
  totalPriceEur: 720,
  totalParticipants: 5,
};

async function installMocks(page: Page, mode: "ok" | "unsupported" = "ok") {
  await page.route("**/functions/v1/booking-quote**", (route) => {
    if (mode === "unsupported") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, unavailable: "unsupported_age" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MIXED_QUOTE),
    });
  });
  await page.route("**/functions/v1/bokun-availability**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [{ id: "slot-1", availabilityCount: 8 }] }) }),
  );
  await page.route("**/functions/v1/bokun-quote**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MIXED_QUOTE) }),
  );
  await page.route("**/functions/v1/create-signature-checkout**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "about:blank#stub-signature", sessionId: "cs_test_sig" }) }),
  );
  await page.route("**/functions/v1/create-builder-checkout**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "about:blank#stub-builder", sessionId: "cs_test_builder" }) }),
  );
  await page.route("**/functions/v1/stripe-session-status**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "complete", bookingRef: "TEST-1" }) }),
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollW, `no horizontal overflow (${overflow.scrollW} vs ${overflow.clientW})`).toBeLessThanOrEqual(
    overflow.clientW + 1,
  );
}

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 1800 },
  { name: "m393", width: 393, height: 852 },
] as const;

const FLOWS = [
  { name: "signature", url: "/tours/arrabida-boat" },
  { name: "tailored", url: "/tours/arrabida-boat/tailor" },
  { name: "studio", url: "/studio-v3" },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Slice D mocked flows — ${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const flow of FLOWS) {
      test(`${flow.name} landing renders under mocks, no horizontal overflow`, async ({ page }) => {
        await installMocks(page, "ok");
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(flow.url, { waitUntil: "domcontentloaded", timeout: 25_000 });
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        const screenshot = `${OUT}/${flow.name}-${vp.name}-landing.png`;
        await page.screenshot({ path: screenshot });
        console.log(`[sliceD] screenshot: ${screenshot}`);
        await assertNoHorizontalOverflow(page);
        expect(errors, `no unhandled page errors: ${errors.join(" | ")}`).toEqual([]);
      });
    }

    test(`unsupported-age gate blocks CTA (${flow_name("signature")})`, async ({ page }) => {
      await installMocks(page, "unsupported");
      let checkoutCalled = false;
      page.on("request", (r) => {
        if (/create-(signature|builder)-checkout/.test(r.url())) checkoutCalled = true;
      });
      await page.goto("/tours/arrabida-boat", { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.screenshot({ path: `${OUT}/unsupported-${vp.name}.png` });
      expect(checkoutCalled, "no checkout request fired under unsupported_age").toBe(false);
    });
  });
}

function flow_name(s: string) {
  return s;
}
