// P0 regression — Studio V3 audit BLOCKER #2.
//
// Enforces the two-family typography rule (Fraunces + Inter) across the
// walked Studio V3 phases on mobile 393×588. Any Montserrat / Georgia /
// Times / Cormorant reference in a computed font-family fails the test.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

const FORBIDDEN = ["Montserrat", "Georgia", "Times", "Cormorant", "Newsreader", "Kaushan"];

async function assertNoForbiddenFonts(page: import("@playwright/test").Page, label: string) {
  const offenders = await page.evaluate((forbidden) => {
    const root = document.querySelector<HTMLElement>('[data-testid="studio-v3-root"]') ?? document.body;
    const out: Array<{ tag: string; family: string; text: string }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let n = walker.currentNode as Element | null;
    while (n) {
      const el = n as HTMLElement;
      if (el.offsetParent !== null || el === root) {
        const cs = window.getComputedStyle(el);
        const family = cs.fontFamily;
        if (family && forbidden.some((f) => family.includes(f))) {
          out.push({
            tag: el.tagName.toLowerCase(),
            family,
            text: (el.textContent ?? "").slice(0, 60),
          });
          if (out.length >= 5) break;
        }
      }
      n = walker.nextNode() as Element | null;
    }
    return out;
  }, FORBIDDEN);
  expect(offenders, `${label}: forbidden font-families found — ${JSON.stringify(offenders)}`).toEqual([]);
}

test("typography stays two-family across intro / feeling / storytelling", async ({ page }) => {
  await page.goto("/studio-v3");
  await page.waitForLoadState("networkidle");
  await assertNoForbiddenFonts(page, "intro");

  await walkToReveal(page);
  await assertNoForbiddenFonts(page, "storyboard/refine");

  await advanceRefineToStorytelling(page);
  await page.getByTestId("studio-v3-final-reveal").waitFor({ timeout: 6_000 }).catch(() => undefined);
  await assertNoForbiddenFonts(page, "storytelling");
});
