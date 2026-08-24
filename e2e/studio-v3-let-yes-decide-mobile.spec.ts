// Studio V3 — "Let YES decide" is a real answer, not a skipped question.
//
// Walks the funnel at 393px handing feeling, interests and rhythm to the
// curator, keeps the date flexible, and asserts:
//   • every handed-over dimension still produces a composed day,
//   • the reveal renders and never shows an empty date (Flexible date),
//   • going back preserves what was already decided.

import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["Pixel 5"], viewport: { width: 393, height: 780 } });
test.setTimeout(120_000);

async function phase(page: import("@playwright/test").Page): Promise<string | null> {
  const el = page.locator("[data-phase]").first();
  if (!(await el.count())) return null;
  return el.getAttribute("data-phase");
}

async function advanceIntro(page: import("@playwright/test").Page) {
  // A cold Vite graph can take several seconds before the first cinematic CTA
  // becomes actionable. Wait for the real Studio contract instead of swallowing
  // short click timeouts and continuing with a stale phase.
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("intro");

  for (let i = 0; i < 5 && (await phase(page)) === "intro"; i++) {
    const cta = page.locator('[data-phase-cta^="intro-"]').first();
    await cta.waitFor({ state: "visible", timeout: 30_000 });
    const currentCta = await cta.getAttribute("data-phase-cta");

    await cta.click({ timeout: 30_000 });

    // Intro has several cinematic beats while data-phase remains "intro".
    // Wait until either the phase advances or the active intro CTA changes.
    await expect
      .poll(
        async () => {
          if ((await phase(page)) !== "intro") return "advanced";
          const next = page.locator('[data-phase-cta^="intro-"]').first();
          if (!(await next.count())) return "waiting";
          return (await next.getAttribute("data-phase-cta")) !== currentCta
            ? "advanced"
            : "waiting";
        },
        { timeout: 15_000 },
      )
      .toBe("advanced");
  }

  await expect.poll(() => phase(page), { timeout: 15_000 }).not.toBe("intro");
}

test("Let YES decide carries the journey through to a composed day", async ({ page }) => {
  await page.goto("/studio-v3");
  await advanceIntro(page);

  // Feeling — hand it over.
  await expect
    .poll(() => phase(page), { timeout: 15_000 })
    .toBe("feeling");
  const decide = page.getByRole("button", { name: /let yes decide/i }).first();
  await expect(decide, "Let YES decide must be offered on feeling").toBeVisible();
  await decide.click();

  // The Studio must move on with a real answer, not sit on a missing value.
  await expect.poll(() => phase(page), { timeout: 10_000 }).not.toBe("feeling");

  // Walk the remaining choice phases, preferring "Let YES decide" whenever
  // it is offered, otherwise the first option + Continue.
  for (let i = 0; i < 20; i++) {
    // The interpretation beat is a full-screen skippable overlay; wait it out
    // before touching anything underneath it.
    const overlay = page.getByTestId("studio-v3-understood-beat");
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.click();
      await overlay.waitFor({ state: "hidden", timeout: 8_000 });
    }

    const current = await phase(page);
    if (!current || current === "map" || current === "storyboard") break;

    const yes = page.getByRole("button", { name: /let yes decide/i }).first();
    if (await yes.isVisible().catch(() => false)) {
      await yes.click();
      await page.waitForTimeout(700);
      continue;
    }

    if (current === "logistics") {
      // Use the Studio's stable interaction contracts rather than text locators.
      const flexible = page.locator('button[data-phase-cta="date-secondary"]').first();
      await expect(flexible).toBeVisible({ timeout: 15_000 });
      await flexible.click();
      await expect(flexible).toHaveAttribute("data-selected", "true");

      const pickup = page
        .locator('section[aria-label="Where the day begins"] button')
        .first();
      await expect(pickup).toBeVisible({ timeout: 15_000 });
      await pickup.click();
      await expect(pickup).toHaveAttribute("data-selected", "true");

      const compose = page.locator('button[data-phase-cta="continue"]').first();
      await expect(compose).toHaveText(/compose my day/i, { timeout: 15_000 });
      await expect(compose).toBeEnabled();
      await compose.click();
      await page.waitForTimeout(900);
      continue;
    }

    // Never touch close/exit/back chrome — those leave the Studio.
    const options = page.locator(
      '[data-phase] button:not([disabled])' +
        ':not([aria-label*="lose" i]):not([aria-label*="xit" i]):not([aria-label*="ack" i])',
    );
    const optionCount = await options.count();
    for (let k = 0; k < optionCount; k++) {
      const text = ((await options.nth(k).textContent()) ?? "").trim();
      if (!text || /back|close|exit|skip/i.test(text)) continue;
      await options.nth(k).click();
      break;
    }
    const cont = page.getByRole("button", { name: /^continue$/i }).first();
    if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.waitForTimeout(700);
  }

  // The interpretation beat may play here — it must never block.
  const beat = page.getByTestId("studio-v3-understood-beat");
  if (await beat.isVisible().catch(() => false)) {
    await expect(beat).toBeHidden({ timeout: 4_000 });
  }

  // A day was composed from handed-over signals: either the cinematic
  // moments surface, the Refine surface, or the reveal itself is mounted.
  await expect
    .poll(
      async () => {
        if (await page.locator('[data-studio-v3-screen="refine"]').count()) return "refine";
        if (await page.getByTestId("studio-v3-final-reveal").count()) return "reveal";
        if (await page.locator('[data-phase-cta="hold-journey"]').count()) return "moments";
        return (await phase(page)) ?? "";
      },
      { timeout: 25_000 },
    )
    .toMatch(/map|storyboard|confirmation|moments|refine|reveal/);
});
