/** TEMPORARY — choice fidelity + add-on/edit interactions before Reserve. */
import { test } from "@playwright/test";

import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 852 } });

const CASES = [
  { name: "wine", ids: ["wine", "gastronomy", "wine-cellar-depth"], expect: /wine|table|cellar|quinta|winery/i },
  { name: "cheese", ids: ["hands-on", "gastronomy", "hands-make-cheese"], expect: /cheese|azeit/i },
  { name: "tile", ids: ["hands-on", "heritage", "hands-paint-tile"], expect: /tile|azulejo/i },
  { name: "faith", ids: ["faith", "heritage", "faith-sanctuary-time"], expect: /f[áa]tima|sanctuar|faith|chapel|church/i },
  { name: "coast", ids: ["coast", "nature", "coast-from-the-water"], expect: /coast|cliff|beach|sesimbra|atlantic|boat/i },
  { name: "heritage", ids: ["heritage", "photography", "photo-landmarks"], expect: /palace|castle|heritage|monast|roman/i },
] as const;

for (const c of CASES) {
  test(`fidelity ${c.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    const out: Record<string, unknown> = { case: c.name };
    await resetStudioV3State(page);
    await walkToReveal(page, { preferredOptionIds: c.ids });

    const refine = page.locator('[data-studio-v3-screen="refine"]').first();
    const text = ((await refine.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    out["matchesChoice"] = c.expect.test(text);
    out["refineExcerpt"] = text.slice(0, 400);

    const cta = refine.getByTestId("studio-v3-handoff-primary").first();
    out["certifiedBefore"] = await cta.getAttribute("data-day-certified").catch(() => null);
    out["gateBefore"] = await cta.getAttribute("data-reserve-gate").catch(() => null);

    // Real-user action 1: tick the first enabled add-on.
    const addon = page
      .locator('[data-testid="studio-v3-add-ons"] button[data-addon-id]:not([data-state="disabled"])')
      .first();
    if (await addon.isVisible().catch(() => false)) {
      out["addonId"] = await addon.getAttribute("data-addon-id");
      await addon.click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      out["certifiedAfterAddon"] = await cta.getAttribute("data-day-certified").catch(() => null);
      out["gateAfterAddon"] = await cta.getAttribute("data-reserve-gate").catch(() => null);
      out["blockedReason"] = await page
        .getByTestId("studio-v3-reserve-blocked-reason")
        .first()
        .textContent()
        .catch(() => null);
    } else {
      out["addonId"] = null;
    }

    console.log("FID " + JSON.stringify(out));
  });
}
