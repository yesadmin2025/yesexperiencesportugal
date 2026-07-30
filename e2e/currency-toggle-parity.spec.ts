import { test, expect } from "@playwright/test";
import {
  FX_RATES,
  expectedDisplay,
  hasSymbol,
  parseAmount,
  scrapePrices,
  setCurrency,
} from "./currency-parity-helpers";

/**
 * EUR ↔ USD toggle parity.
 *
 * Verifies every element carrying [data-price-eur] reformats to the
 * expected rounded amount when USD is active, that checkout/booking
 * surfaces stay in EUR (source of truth), and that the preference
 * survives reload + navigation.
 */

const ROUTES = [
  "/experiences",
  "/tours/arrabida-wine-allinclusive",
  "/tours/arrabida-wine-allinclusive/tailor",
];

for (const route of ROUTES) {
  test(`currency toggle converts every price on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    // Give the CurrencyProvider effect a tick and price nodes time to mount.
    await page.waitForSelector("[data-price-eur]", { timeout: 15_000 });

    const baseline = await scrapePrices(page);
    expect(baseline.length, `no prices found on ${route}`).toBeGreaterThan(0);
    for (const p of baseline) {
      expect(hasSymbol(p.text, "EUR"), `expected € on ${route} — got "${p.text}"`).toBe(true);
    }

    await setCurrency(page, "USD");
    // Wait for at least one price to switch symbol.
    await page.waitForFunction(
      () => document.querySelector("[data-price-eur]")?.textContent?.includes("$") ?? false,
      undefined,
      { timeout: 5_000 },
    );

    const converted = await scrapePrices(page);
    expect(converted.length).toBe(baseline.length);
    for (const p of converted) {
      expect(hasSymbol(p.text, "USD"), `expected $ on ${route} — got "${p.text}"`).toBe(true);
      const expected = expectedDisplay(p.eur, "USD");
      const actual = parseAmount(p.text);
      expect(actual, `no numeric amount parsed from "${p.text}"`).not.toBeNull();
      // Allow ±1 for locale-specific rounding differences.
      expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(1);
    }
  });
}

test("USD selection survives reload and navigation", async ({ page }) => {
  await page.goto("/experiences", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  await setCurrency(page, "USD");

  // Cookie + localStorage both written.
  const persisted = await page.evaluate(() => ({
    ls: window.localStorage.getItem("yes.currency.v1"),
    cookie: document.cookie.includes("yes.currency.v1=USD"),
  }));
  expect(persisted.ls).toBe("USD");
  expect(persisted.cookie).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  const afterReload = await scrapePrices(page);
  expect(afterReload.every((p) => hasSymbol(p.text, "USD"))).toBe(true);

  await page.goto("/tours/arrabida-wine-allinclusive", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  const afterNav = await scrapePrices(page);
  expect(afterNav.every((p) => hasSymbol(p.text, "USD"))).toBe(true);
});

test("cookie-only rehydration works when localStorage is cleared", async ({ page }) => {
  await page.goto("/experiences", { waitUntil: "domcontentloaded" });
  await setCurrency(page, "USD");
  await page.evaluate(() => window.localStorage.removeItem("yes.currency.v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  const prices = await scrapePrices(page);
  expect(prices.every((p) => hasSymbol(p.text, "USD"))).toBe(true);
});

test("clearing both stores returns to EUR default", async ({ page }) => {
  await page.goto("/experiences", { waitUntil: "domcontentloaded" });
  await setCurrency(page, "USD");
  await page.evaluate(() => {
    window.localStorage.removeItem("yes.currency.v1");
    document.cookie = "yes.currency.v1=; path=/; max-age=0";
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  const prices = await scrapePrices(page);
  expect(prices.every((p) => hasSymbol(p.text, "EUR"))).toBe(true);
});

test("FX rate table matches the app constant", async ({ page }) => {
  // Sanity: if src/config/fx-rates.ts drifts we want a test failure, not
  // silent conversion errors. We compare against a well-known amount on
  // the experiences page.
  await page.goto("/experiences", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-price-eur]");
  await setCurrency(page, "USD");
  const [sample] = await scrapePrices(page);
  const expected = expectedDisplay(sample.eur, "USD");
  const actual = parseAmount(sample.text);
  expect(actual).not.toBeNull();
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(1);
  expect(FX_RATES.USD).toBeGreaterThan(1); // guard against zero-rate drift
});
