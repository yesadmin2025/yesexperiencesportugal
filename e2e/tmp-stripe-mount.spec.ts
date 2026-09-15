/** TEMPORARY — inspects why the embedded Stripe form is not visible after Reserve. */
import { test } from "@playwright/test";

import { fillGuestDetails, reachGuestDetails } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 852 } });

test("inspect stripe mount", async ({ page }) => {
  test.setTimeout(180_000);
  const reached = await reachGuestDetails(page, {
    preferredOptionIds: ["wine", "gastronomy", "wine-cellar-depth"],
  });
  console.log("MOUNT reached=" + reached);
  await fillGuestDetails(page, { email: "qa+stripe-mount@example.com" });
  await page.getByTestId("studio-v3-guest-details-submit").click({ timeout: 8_000 });
  await page.getByTestId("studio-v3-checkout-summary").waitFor({ timeout: 25_000 });
  await page.getByTestId("studio-v3-checkout-summary-reserve").click();
  await page.waitForTimeout(20_000);

  const info = await page.evaluate(() => {
    const inline = document.querySelector('[data-testid="studio-v3-checkout-summary-stripe-inline"]');
    const iframes = Array.from(document.querySelectorAll("iframe")).map((f) => {
      const r = f.getBoundingClientRect();
      const cs = getComputedStyle(f);
      return {
        src: (f.getAttribute("src") ?? "").slice(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
      };
    });
    const inlineRect = inline?.getBoundingClientRect();
    return {
      inlineExists: Boolean(inline),
      inlineHtmlLen: inline?.innerHTML.length ?? 0,
      inlineRect: inlineRect
        ? { w: Math.round(inlineRect.width), h: Math.round(inlineRect.height) }
        : null,
      inlineStyle: inline ? getComputedStyle(inline as Element).display : null,
      inlineText: (inline as HTMLElement | null)?.innerText?.slice(0, 300) ?? null,
      iframes,
      toasts: Array.from(document.querySelectorAll("[data-sonner-toast]")).map(
        (t) => (t as HTMLElement).innerText,
      ),
    };
  });
  console.log("MOUNT " + JSON.stringify(info));
  await page.screenshot({ path: "/tmp/browser/stripe-mount.png" }).catch(() => undefined);
});
