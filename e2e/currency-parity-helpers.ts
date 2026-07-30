import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for currency-toggle E2E tests.
 *
 * `FX_RATES` mirrors src/config/fx-rates.ts. Kept in sync manually — the
 * pricing SSOT test in src/__tests__ already guards the numeric contract;
 * we only need the display rate here.
 */
export const FX_RATES = { EUR: 1, USD: 1.08 } as const;
export type Currency = keyof typeof FX_RATES;

export function expectedDisplay(amountEur: number, currency: Currency): number {
  return Math.round(amountEur * FX_RATES[currency]);
}

export interface ScrapedPrice {
  eur: number;
  text: string;
  variant: string | null;
  role: string | null;
}

export async function scrapePrices(page: Page): Promise<ScrapedPrice[]> {
  return page.$$eval("[data-price-eur]", (nodes) =>
    nodes.map((n) => ({
      eur: Number(n.getAttribute("data-price-eur")),
      text: (n.textContent ?? "").trim(),
      variant: n.getAttribute("data-price-variant"),
      role: n.getAttribute("data-price-role"),
    })),
  );
}

/**
 * Clicks the currency chip and waits until the choice actually applied.
 *
 * The chip is server-rendered, so a click that lands before hydration is
 * silently dropped. We retry until `aria-pressed` flips.
 */
export async function setCurrency(page: Page, currency: Currency) {
  const btn = page.locator(`[data-currency-option="${currency}"]`).first();
  await btn.scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () => {
        if ((await btn.getAttribute("aria-pressed")) === "true") return "true";
        // Dispatch directly: on mobile viewports the sticky CTA overlays
        // the footer chip, so a real tap lands on the overlay instead.
        await btn.dispatchEvent("click").catch(() => undefined);
        return btn.getAttribute("aria-pressed");
      },
      { timeout: 20_000, intervals: [200, 300, 500, 800, 1000] },
    )
    .toBe("true");
}

export function parseAmount(text: string): number | null {
  // Handles "€245", "$265", "€1,250", "$1,350"
  const cleaned = text.replace(/[€$\s,]/g, "");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function hasSymbol(text: string, currency: Currency): boolean {
  return currency === "USD" ? text.includes("$") : text.includes("€");
}

/**
 * Waits until every rendered price uses the given currency symbol.
 *
 * Display currency is applied on the client, so straight after a reload the
 * server-rendered markup is still in EUR for a frame or two.
 */
export async function expectAllPricesIn(page: Page, currency: Currency) {
  await expect
    .poll(
      async () => {
        const prices = await scrapePrices(page);
        return prices.length > 0 && prices.every((p) => hasSymbol(p.text, currency));
      },
      { timeout: 15_000, intervals: [200, 300, 500, 800, 1000] },
    )
    .toBe(true);
}
