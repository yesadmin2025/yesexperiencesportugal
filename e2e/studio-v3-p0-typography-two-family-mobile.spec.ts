// P0 regression — Studio V3 audit BLOCKER #2.
//
// Enforces that Studio V3 phases never inline a hardcoded Montserrat /
// Georgia / Times / Cormorant / Newsreader / Kaushan fallback in element
// style="…" strings. The two-family typography rule flows through the
// design tokens (--font-editorial / --font-body / --font-display /
// --font-serif / --font-sans); when Fraunces is later swapped in at the
// token layer, everything picks it up. Hardcoded fallbacks bypass that
// swap and re-introduce retired families — this test forbids the pattern.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

const FORBIDDEN = ["Montserrat", "Georgia", "Times", "Cormorant", "Newsreader", "Kaushan"];

async function assertNoHardcodedFallbacks(page: import("@playwright/test").Page, label: string) {
  const offenders = await page.evaluate((forbidden) => {
    const root =
      document.querySelector<HTMLElement>('[data-testid="studio-v3-root"]') ?? document.body;
    const out: Array<{ tag: string; style: string; text: string }> = [];
    const nodes = root.querySelectorAll<HTMLElement>("[style]");
    nodes.forEach((el) => {
      const inline = el.getAttribute("style") ?? "";
      // Only inspect inline font-family declarations — computed values may
      // legitimately resolve to Montserrat today (token layer swap pending).
      const match = inline.match(/font-family:\s*([^;]+)/i);
      if (!match) return;
      const family = match[1];
      if (forbidden.some((f) => family.includes(f))) {
        out.push({
          tag: el.tagName.toLowerCase(),
          style: family.trim().slice(0, 120),
          text: (el.textContent ?? "").slice(0, 60),
        });
      }
    });
    return out.slice(0, 8);
  }, FORBIDDEN);
  expect(
    offenders,
    `${label}: hardcoded font fallbacks found — ${JSON.stringify(offenders)}`,
  ).toEqual([]);
}

test("studio-v3 inline styles never hardcode retired font families", async ({ page }) => {
  await page.goto("/studio-v3");
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await assertNoHardcodedFallbacks(page, "intro");

  await walkToReveal(page);
  await assertNoHardcodedFallbacks(page, "storyboard/refine");

  await advanceRefineToStorytelling(page);
  await page
    .getByTestId("studio-v3-final-reveal")
    .waitFor({ timeout: 6_000 })
    .catch(() => undefined);
  await assertNoHardcodedFallbacks(page, "storytelling");
});
