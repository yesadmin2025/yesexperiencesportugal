import type { Page } from "@playwright/test";

/**
 * Cookie-consent state used by <CookieConsent /> (src/components/CookieConsent.tsx).
 *
 * The banner is a bottom-anchored dialog at z-[70] — it deliberately sits
 * above the mobile sticky CTA and therefore intercepts pointer events on
 * small viewports. Specs that exercise bottom-of-screen affordances must
 * pre-seed a decision so the banner never mounts, otherwise every click
 * times out on "subtree intercepts pointer events".
 */
const CONSENT_STORAGE_KEY = "yes.cookieConsent.v1";

/**
 * Seed an "accepted" consent choice before the app boots.
 *
 * Must be called BEFORE `page.goto()` — it installs an init script so the
 * value is present on first paint and the banner never flashes.
 */
export async function acceptCookiesBeforeLoad(page: Page) {
  await page.addInitScript(
    ({ key }) => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ analytics: true, marketing: true, decidedAt: Date.now() }),
        );
      } catch {
        /* storage blocked — banner will show; the spec will surface it */
      }
    },
    { key: CONSENT_STORAGE_KEY },
  );
}
