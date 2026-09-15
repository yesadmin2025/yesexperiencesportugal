/**
 * TEMPORARY diagnostic — deleted at the end of the Studio checkout pass.
 *
 * Walks the Studio the way a real traveller might (unsteered, or steering
 * toward paths the steered sweep never exercises), records the day it
 * proposed, and pushes through to the Stripe payment surface.
 */

import { test } from "@playwright/test";

import { fillGuestDetails, reachGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 852 } as const;

const CASES: ReadonlyArray<{
  name: string;
  preferredOptionIds?: readonly string[];
  partyAdults?: number;
}> = [
  { name: "unsteered" },
  {
    name: "let-yes-decide",
    preferredOptionIds: ["let-yes-decide", "surprise-me", "undecided", "not-sure"],
  },
  { name: "party-of-ten", preferredOptionIds: ["wine", "gastronomy"], partyAdults: 10 },
  { name: "family", preferredOptionIds: ["family", "heritage", "coast"] },
  { name: "celebration", preferredOptionIds: ["celebration", "romance", "gastronomy"] },
  { name: "faith-fatima", preferredOptionIds: ["faith", "faith-sanctuary-time"] },
  { name: "coast-sesimbra", preferredOptionIds: ["coast", "coast-from-the-water"] },
];

test.describe("TMP Studio diagnostic", () => {
  test.use({ viewport: VIEWPORT });

  for (const scenario of CASES) {
    test(`diagnose: ${scenario.name}`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 200));
      });

      const report: Record<string, unknown> = { scenario: scenario.name };

      const reached = await reachGuestDetails(page, {
        ...(scenario.preferredOptionIds ? { preferredOptionIds: scenario.preferredOptionIds } : {}),
        ...(scenario.partyAdults ? { partyAdults: scenario.partyAdults } : {}),
      });
      report["reachedGuestDetails"] = reached;
      report["dayTitle"] = (
        (await page.locator("h1, h2").first().textContent().catch(() => "")) ?? ""
      ).trim();

      if (reached) {
        await fillGuestDetails(page, { email: "qa+studio-diag@example.com" });
        const submit = page.getByTestId("studio-v3-guest-details-submit");
        await submit.scrollIntoViewIfNeeded().catch(() => undefined);
        await submit.click({ timeout: 8_000 }).catch(() => undefined);

        const summary = page.getByTestId("studio-v3-checkout-summary");
        const atSummary = await summary
          .waitFor({ state: "visible", timeout: 25_000 })
          .then(() => true)
          .catch(() => false);
        report["reachedSummary"] = atSummary;

        if (atSummary) {
          const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
          report["reserveDisabled"] = await reserve.isDisabled().catch(() => null);
          const responded = page
            .waitForResponse(
              (r) =>
                r.url().includes("create-signature-checkout") && r.request().method() === "POST",
              { timeout: 45_000 },
            )
            .then(async (r) => ({ status: r.status(), len: (await r.text()).length }))
            .catch(() => null);
          await reserve.click({ timeout: 8_000 }).catch(() => undefined);
          report["checkout"] = await responded;
          report["stripeMounted"] = await page
            .locator('iframe[src*="stripe.com"]')
            .first()
            .isVisible({ timeout: 30_000 })
            .catch(() => false);
        }
      }

      report["consoleErrors"] = errors.slice(0, 4);
      console.log("DIAG " + JSON.stringify(report));
      await page
        .screenshot({ path: `/tmp/browser/studio-${scenario.name}.png` })
        .catch(() => undefined);
    });
  }
});
