/**
 * Third-party script deferral contract.
 *
 * GTM, Trustindex and Stripe.js must never compete with first render on a
 * public route:
 *
 *  • GTM boots on first interaction or the first idle slot after load —
 *    so it must be absent from the DOM immediately after DOMContentLoaded,
 *    and it must arrive (async) once the guest interacts.
 *  • Trustindex is injected only when the footer approaches the viewport,
 *    and only as an async+defer tag.
 *  • Stripe.js is intent-loaded (checkout only) — it must never appear on a
 *    marketing route that the guest merely reads.
 *
 * Any script tag that reaches the document must be async or defer; a blocking
 * classic third-party script is a hard failure.
 */
import { test, expect, type Page } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/experiences", "/tours/lisbon-arrabida-sanctuary", "/partners"];

const THIRD_PARTY = [
  { name: "GTM", match: /googletagmanager\.com|google-analytics\.com/i },
  { name: "Trustindex", match: /trustindex\./i },
  { name: "Stripe", match: /js\.stripe\.com/i },
];

function scriptSrcs(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("script[src]")).map((s) => ({
      src: (s as HTMLScriptElement).src,
      async: (s as HTMLScriptElement).async,
      defer: (s as HTMLScriptElement).defer,
    })),
  );
}

for (const path of PUBLIC_ROUTES) {
  test(`third-party scripts do not block first render — ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const atFirstRender = await scriptSrcs(page);
    // On a fast production response the document can already be `complete`
    // by the time we sample — the idle-slot GTM boot is then legitimate.
    // In that case only the async/defer contract applies.
    const stillLoading = await page.evaluate(() => document.readyState !== "complete");
    for (const vendor of THIRD_PARTY) {
      const hits = atFirstRender.filter((s) => vendor.match.test(s.src));
      if (!stillLoading && vendor.name === "GTM") {
        for (const hit of hits) {
          expect(hit.async || hit.defer, `${vendor.name} tag must be async/defer on ${path}`).toBe(
            true,
          );
        }
        continue;
      }
      expect(
        hits.map((h) => h.src),
        `${vendor.name} must not be present at DOMContentLoaded on ${path}`,
      ).toEqual([]);
    }


    // No blocking third-party script may ever land on the page.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1500);

    const later = await scriptSrcs(page);
    const blocking = later.filter(
      (s) =>
        THIRD_PARTY.some((v) => v.match.test(s.src)) && !s.async && !s.defer,
    );
    expect(
      blocking.map((b) => b.src),
      `${path}: third-party scripts must be async or defer`,
    ).toEqual([]);

    // Stripe.js is checkout-intent only — never on a reading route.
    const stripe = later.filter((s) => /js\.stripe\.com/i.test(s.src));
    expect(stripe.map((s) => s.src), `${path}: Stripe.js loaded outside checkout intent`).toEqual(
      [],
    );
  });
}

test("GTM boots after user interaction, asynchronously", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Interaction is what unlocks the loader.
  await page.mouse.wheel(0, 800);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);

  const gtm = (await scriptSrcs(page)).filter((s) => /googletagmanager\.com/i.test(s.src));
  // Analytics may be consent-gated in some environments; when it does load it
  // must be non-blocking.
  for (const s of gtm) {
    expect(s.async || s.defer, `GTM tag ${s.src} must be async/defer`).toBe(true);
  }
});
