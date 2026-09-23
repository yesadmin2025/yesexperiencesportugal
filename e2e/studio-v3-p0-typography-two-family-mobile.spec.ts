// P0 regression — Studio V3 audit BLOCKER #2.
//
// Enforces that Studio V3 phases never inline a retired font fallback in element
// style="…" strings. The two-family typography rule flows through the
// design tokens (--font-editorial / --font-body / --font-display /
// --font-serif / --font-sans); Newsreader and Inter are resolved at the
// token layer. Hardcoded retired fallbacks bypass that
// swap and re-introduce retired families — this test forbids the pattern.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

const FORBIDDEN = ["Times", "Roboto", "Lato", "Kaushan"];

async function assertNoHardcodedFallbacks(page: import("@playwright/test").Page, label: string) {
  const offenders = await page.evaluate((forbidden) => {
    const root =
      document.querySelector<HTMLElement>('[data-testid="studio-v3-root"]') ?? document.body;
    const out: Array<{ tag: string; style: string; text: string }> = [];
    const nodes = root.querySelectorAll<HTMLElement>("[style]");
    nodes.forEach((el) => {
      const inline = el.getAttribute("style") ?? "";
      // Only inspect inline font-family declarations — computed values must
      // resolve through the canonical Newsreader and Inter tokens.
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
  test.setTimeout(90_000);
  await page.goto("/studio");
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
