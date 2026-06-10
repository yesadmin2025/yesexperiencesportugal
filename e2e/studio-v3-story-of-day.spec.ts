import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — "Story of the day" containment e2e.
 *
 * The three story chapters (Opening / Heart / Closing) must be generated
 * ONLY from the composed, edited route points. They must:
 *   · reference stops that are visible in the inline route editor
 *   · never invent new stop names
 *   · never duplicate the old "Suggested route" pickup → A · B · C → pickup
 *     string (which has been retired in Phase 6E)
 *
 * Mobile viewport (project default). No routes/backend touched.
 */

async function walkToReveal(page: Page) {
  await page.goto("/studio-v3");
  await page.getByRole("button", { name: /^Begin$/ }).click();
  await page.getByRole("button", { name: /^Skip$/ }).click();

  await page.getByRole("radio", { name: /Coastal escape/i }).click();
  await page.getByRole("radio", { name: /^Solo/i }).click();
  await page.getByRole("radio", { name: /Just because/i }).click();

  await page.getByRole("button", { name: /I don't know yet/i }).click();

  await expect(page.getByText(/the day begin\?/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio", { name: /Lisbon/i }).first().click();

  await expect(page.getByText(/draws you/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByText(/rhythm/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio").first().click();

  await expect(page.getByText(/investment|shape/i).first()).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: /skip|continue/i }).click();
}

/** Normalise a label the same way StoryboardHandoff#cleanLabel does. */
function cleanLabel(s: string): string {
  return s.split(/[—–-]/)[0].split(",")[0].trim();
}

test.describe("Studio V3 — Story of the day containment", () => {
  test("chapters reference only composed edited stops and not the retired suggested-route string", async ({
    page,
  }) => {
    await walkToReveal(page);

    // Reveal arrived.
    await expect(page.getByText(/this is your Signature/i)).toBeVisible({
      timeout: 15_000,
    });

    const story = page.getByTestId("studio-v3-story-of-day");
    await expect(story).toBeVisible({ timeout: 6000 });

    // Three chapter eyebrows present, in order.
    await expect(story.getByText(/^Opening$/)).toBeVisible();
    await expect(story.getByText(/^The heart of the day$/)).toBeVisible();
    await expect(story.getByText(/^Closing note$/)).toBeVisible();

    // Collect the cleaned labels of every stop currently in the editor —
    // this is the single source of truth the story is allowed to draw from.
    const editor = page.getByTestId("studio-v3-stops-editor");
    await expect(editor).toBeVisible();
    const stopLabels = await editor
      .getByTestId("studio-v3-stop-row")
      .locator("p")
      .first()
      .allInnerTexts()
      .then((texts) => texts.map(cleanLabel).filter((s) => s.length > 0));
    expect(stopLabels.length).toBeGreaterThan(0);

    const storyText = (await story.innerText()).trim();
    expect(storyText.length).toBeGreaterThan(0);

    // 1. The retired "Suggested route" eyebrow must not appear in the reveal.
    await expect(page.getByText(/Suggested route/i)).toHaveCount(0);

    // 2. The retired arrow pattern (pickup → A · B · C → pickup) must not
    //    appear anywhere on the reveal. Story copy uses prose only.
    const reveal = page.locator('[data-testid="studio-v3-reveal-map"]').locator("..");
    await expect(reveal).not.toContainText(/→.*·.*→/);

    // 3. Every capitalised, multi-letter token in the story text that looks
    //    like a stop name must either be in the editor's stop list or in a
    //    small allow-list of city/region/connector words. This guards against
    //    invented stop names being inserted by the chapter composer.
    const ALLOWED = new Set<string>([
      // Pickup cities surfaced by pickupCityLabel().
      "Lisbon",
      "Porto",
      "Cascais",
      "Sintra",
      "Évora",
      "Faro",
      "Albufeira",
      "Setúbal",
      "Sesimbra",
      "Comporta",
      "Tróia",
      "Coimbra",
      // Reveal section words / fixed copy.
      "Opening",
      "The",
      "Heart",
      "Closing",
      "Note",
      "Your",
      "Signature",
      "DNA",
      "Portugal",
      "YES",
      "From",
      "Created",
      "Ready",
      "Save",
      "Refine",
      "Need",
      "Ask",
      "Availability",
      "Shaping",
      "Reset",
      "Edited",
      "Move",
      "Remove",
      "Swap",
      "Fine-tune",
      "Reorder",
    ]);
    for (const stop of stopLabels) {
      for (const token of stop.split(/\s+/)) {
        if (token.length > 1) ALLOWED.add(token);
      }
    }

    const tokens = storyText.match(/\b[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][a-záâãàéêíóôõúç-]+\b/g) ?? [];
    const suspicious = tokens.filter((t) => !ALLOWED.has(t));
    expect(
      suspicious,
      `Story of the day referenced tokens that are not in the composed route nor in the safe allow-list: ${suspicious.join(", ")}`,
    ).toEqual([]);
  });
});
