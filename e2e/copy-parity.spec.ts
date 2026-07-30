/**
 * Copy parity lock — legal pages, contact, footer, FAQ.
 *
 * Asserts that the canonical sources of truth
 * (src/config/business-nap.ts, src/content/faq-data.ts) actually
 * appear in the rendered DOM on every relevant route. If a page starts
 * hard-coding an email, phone, license label or "book" verb again, this
 * suite fails before the drift can ship.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_HREF,
  LICENSE_LABEL,
  LICENSE_LABEL_PT,
  SOCIAL,
  CANCELLATION,
} from "../src/config/business-nap";
import { HOMEPAGE_FAQ } from "../src/content/faq-data";
import { SIGNATURE_FAQ } from "../src/content/seo-faq";
import {
  LEGACY_CTAS,
  SIGNATURE_PRODUCT_TOURS,
  SIGNATURE_STANDALONE_ROUTES,
} from "./copy-parity-constants";

async function bodyText(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  return page.locator("body").innerText();
}

test.describe("Legal pages — NAP + license from single source of truth", () => {
  for (const route of ["/terms", "/privacy", "/cookies"]) {
    test(`${route} shows canonical email and license label`, async ({ page }) => {
      const text = await bodyText(page, route);
      expect(text, `${route} must show ${EMAIL}`).toContain(EMAIL);
      // Either EN or PT label is acceptable per route locale.
      const hasLabel = text.includes(LICENSE_LABEL) || text.includes(LICENSE_LABEL_PT);
      expect(hasLabel, `${route} must show RNAAT label`).toBe(true);
      // mailto link must point at the canonical address.
      await expect(page.locator(`a[href="${EMAIL_HREF}"]`).first()).toHaveCount(1);
    });
  }
});

test.describe("Contact page — clickable info rows", () => {
  test("/contact has mailto + tel with canonical values", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await expect(page.locator(`a[href="${EMAIL_HREF}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="${PHONE_HREF}"]`).first()).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).toContain(EMAIL);
    expect(text).toContain(PHONE_DISPLAY);
  });
});

test.describe("Footer parity across routes", () => {
  const routes = ["/", "/experiences", "/portugal-travel-designer"];
  for (const route of routes) {
    test(`${route} footer uses canonical social + license`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      // Instagram + Facebook from SOCIAL constant.
      if (SOCIAL.instagram) {
        await expect(page.locator(`footer a[href="${SOCIAL.instagram}"]`)).toHaveCount(1);
      }
      if (SOCIAL.facebook) {
        await expect(page.locator(`footer a[href="${SOCIAL.facebook}"]`)).toHaveCount(1);
      }
      // No duplicate /contact link in the legal bar (kept only in main nav).
      const contactLinks = await page.locator('footer a[href="/contact"]').count();
      expect(
        contactLinks,
        `${route}: /contact must not be duplicated in footer legal bar`,
      ).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("FAQ verb parity — 'reserve' not 'book' in canonical Q/A", () => {
  test("HOMEPAGE_FAQ never uses 'book' where 'reserve' is canonical", () => {
    // Source-level: if a copy edit reintroduces "book" the on-page copy
    // will drift from the SEO FAQ JSON-LD. This is a fast unit-style guard
    // so drift is caught even without a running dev server.
    for (const { q, a } of HOMEPAGE_FAQ) {
      const combined = `${q}\n${a}`;
      expect(
        /\bbook\b/i.test(combined),
        `FAQ item uses 'book' — canonical verb is 'reserve': ${q}`,
      ).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Shared helpers used by the product / tailor / checkout blocks below.
// Kept in-file (small, one-off) rather than exported; the two constants
// they lean on (LEGACY_CTAS, canonical NAP) live in modules already.
// ─────────────────────────────────────────────────────────────────────

async function assertCanonicalFooter(page: Page, url: string) {
  const footer = page.locator("footer");
  await expect(footer, `${url}: footer must render`).toHaveCount(1);
  const footerText = await footer.innerText();
  expect(footerText, `${url}: footer must show ${EMAIL}`).toContain(EMAIL);
  const hasLicense = footerText.includes(LICENSE_LABEL) || footerText.includes(LICENSE_LABEL_PT);
  expect(hasLicense, `${url}: footer must show RNAAT label`).toBe(true);
  await expect(page.locator(`footer a[href="${EMAIL_HREF}"]`).first()).toHaveCount(1);
}

async function assertNoLegacyCta(page: Page, url: string) {
  const bodyText = await page.locator("body").innerText();
  for (const legacy of LEGACY_CTAS) {
    expect(bodyText, `${url}: legacy CTA "${legacy}" must not appear`).not.toContain(legacy);
  }
}

test.describe("Signature product pages — canonical copy + CTAs", () => {
  const productRoutes = [
    ...SIGNATURE_PRODUCT_TOURS.map((slug) => `/tours/${slug}`),
    ...SIGNATURE_STANDALONE_ROUTES,
  ];

  for (const route of productRoutes) {
    test(`${route} shows canonical footer + approved CTAs`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      await assertCanonicalFooter(page, route);
      await assertNoLegacyCta(page, route);

      // Approved Signature CTA pair must be present (any anchor/button).
      // Use count-based assertion so a genuine drift fails fast instead
      // of waiting on toBeVisible's default retry window.
      const reserveCount = await page.getByText(/check availability & reserve/i).count();
      const tailorCount = await page.getByText(/tailor this day/i).count();
      expect(reserveCount, `${route}: approved primary CTA must appear`).toBeGreaterThan(0);
      expect(tailorCount, `${route}: approved secondary CTA must appear`).toBeGreaterThan(0);
    });
  }

  // FAQ wording must match the SIGNATURE_FAQ source of truth on the
  // canonical /tours/$tourId surface (JSON-LD + visible FAQ share the
  // same source). One representative tour keeps the suite fast.
  test("/tours/arrabida-wine-allinclusive visible FAQ matches SIGNATURE_FAQ SSOT", async ({
    page,
  }) => {
    await page.goto("/tours/arrabida-wine-allinclusive", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    const bodyText = await page.locator("body").innerText();
    for (const { q } of SIGNATURE_FAQ) {
      expect(bodyText, `SIGNATURE_FAQ question drifted from rendered page: "${q}"`).toContain(q);
    }
  });

  // Signature routes must show the Signature cancellation copy — never
  // the deprecated Studio/custom variant, which lives on custom flows only.
  test("Signature product page shows Signature cancellation copy", async ({ page }) => {
    await page.goto("/tours/arrabida-wine-allinclusive", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText,
      "Signature cancellation copy must appear verbatim (single source of truth)",
    ).toContain(CANCELLATION.signature.en);
  });
});

test.describe("Tailor pages — footer parity + no legacy CTAs", () => {
  for (const slug of SIGNATURE_PRODUCT_TOURS) {
    const route = `/tours/${slug}/tailor`;
    test(`${route} keeps canonical footer + approved CTA vocabulary`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      await assertCanonicalFooter(page, route);
      await assertNoLegacyCta(page, route);

      // At least one approved conversion verb must be reachable from the
      // Tailor page — either the reserve verb or the Studio-final verb.
      const approvedRegex = /(check availability & reserve|reserve securely|reserve now)/i;
      const approvedCta = page.getByRole("link", { name: approvedRegex }).first();
      const approvedButton = page.getByRole("button", { name: approvedRegex }).first();
      const linkCount = await approvedCta.count();
      const buttonCount = await approvedButton.count();
      expect(
        linkCount + buttonCount,
        `${route}: at least one approved reserve CTA must be present`,
      ).toBeGreaterThan(0);
    });
  }
});

test.describe("Checkout token page — canonical recovery copy on invalid token", () => {
  // /checkout/$token is token-gated. A deliberately invalid token
  // renders the recovery state; we assert its copy uses approved
  // vocabulary and doesn't hard-code a support email that diverges
  // from `business-nap.ts`.
  const INVALID_TOKEN_ROUTE = "/checkout/copy-parity-fixture-invalid";

  test("invalid token renders the recovery state with approved copy", async ({ page }) => {
    await page.goto(INVALID_TOKEN_ROUTE, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    const bodyText = await page.locator("body").innerText();

    // No legacy CTA vocabulary anywhere in the recovery UI.
    for (const legacy of LEGACY_CTAS) {
      expect(bodyText, `Checkout recovery must not surface legacy CTA "${legacy}"`).not.toContain(
        legacy,
      );
    }

    // If the recovery state exposes a support email, it MUST be the
    // canonical one — no hand-typed fallbacks. Any other mailto is a bug.
    const mailtos = await page
      .locator('a[href^="mailto:"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href") || ""));
    for (const href of mailtos) {
      expect(href, `Checkout must only expose ${EMAIL_HREF}, found ${href}`).toBe(EMAIL_HREF);
    }

    // Recovery navigation must exist and point at an approved home
    // route — never at a legacy funnel URL.
    const recoveryHref = await page
      .getByRole("link", { name: /(back to home|back to experiences|design & book|home)/i })
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (recoveryHref) {
      expect(
        ["/", "/experiences", "/portugal-travel-designer"].includes(recoveryHref),
        `Checkout recovery link must target an approved route, got: ${recoveryHref}`,
      ).toBe(true);
    }
  });
});
