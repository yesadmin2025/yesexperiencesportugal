/** TEMPORARY — dump the recorded answers + composed day for mismatch cases. */
import { test } from "@playwright/test";

import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 852 } });

const CASES = [
  { name: "coast-water", ids: ["coast", "nature", "coast-from-the-water"] },
  { name: "cheese", ids: ["hands-on", "gastronomy", "hands-make-cheese"] },
] as const;

for (const c of CASES) {
  test(`history ${c.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await resetStudioV3State(page);
    await walkToReveal(page, { preferredOptionIds: c.ids });

    const dump = await page.evaluate(() => {
      const read = (k: string) => {
        try {
          const raw = window.sessionStorage.getItem(k) ?? window.localStorage.getItem(k);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      };
      const s: any = read("yes.studio-v3.session.v1") ?? read("yes.studio-v3.draft.v1");
      const state = s?.state ?? s ?? {};
      return {
        tourId: state.skeletonTourKey ?? state.tourId ?? null,
        refinement: state.refinement ?? null,
        interests: state.interests ?? null,
        destinationIntent: state.destinationIntent ?? null,
        history: (state.questionHistory ?? []).map((e: any) => ({
          q: e.questionId ?? e.question?.id ?? null,
          selected: e.selectedOptionIds ?? e.selected ?? null,
          offered: (e.offeredOptionIds ?? e.question?.options?.map((o: any) => o.id)) ?? null,
        })),
      };
    });
    const day = await page
      .locator('[data-studio-v3-screen="refine"]')
      .first()
      .innerText()
      .catch(() => "");
    console.log("HIST " + JSON.stringify({ case: c.name, dump, day: day.replace(/\s+/g, " ").slice(0, 350) }));
  });
}
