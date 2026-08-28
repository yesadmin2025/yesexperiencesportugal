import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { toEditorialChapters } from "@/lib/tailor-chapters";
import { getTailorBlueprint } from "@/data/tailorBlueprints";
import { INSTANT_CONFIRMATION } from "@/content/signature-day-copy";

const STUDIO_SRC = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

describe("instant-booking copy truth", () => {
  it("Studio composing overlay drops manual confirmation and uses instant truth", () => {
    expect(STUDIO_SRC).not.toContain("We confirm everything before you book");
    expect(STUDIO_SRC).toContain("{INSTANT_CONFIRMATION}");
    expect(INSTANT_CONFIRMATION).toBe(
      "Instant confirmation. Your date is held the moment you reserve.",
    );
  });

  it("winery editorial chapter exposes no supplier or confirmation language", () => {
    const chapters = toEditorialChapters("arrabida-wine-allinclusive");
    expect(chapters).toBeTruthy();
    const bp = getTailorBlueprint("arrabida-wine-allinclusive")!;
    const winery = chapters!.find((c) => /winery|wineries/i.test(c.label))!;
    expect(winery).toBeTruthy();

    const text = `${winery.label} ${winery.story}`;
    expect(text).not.toMatch(/confirm|availability|pending|subject to/i);
    for (const opt of bp.choice!.options) {
      expect(text.toLowerCase()).not.toContain(opt.label.toLowerCase());
    }

    // Count matches blueprint pickMin.
    const n = bp.choice!.pickMin;
    const word = n === 1 ? "One" : n === 2 ? "Two" : n === 3 ? "Three" : String(n);
    expect(winery.label.startsWith(word)).toBe(true);
    expect(winery.story.startsWith(word)).toBe(true);
  });

  it("non-winery choice pools keep their legitimate note", () => {
    const ids = ["sintra-cascais", "evora-alentejo", "tiles-workshop"];
    let checked = 0;
    for (const id of ids) {
      const bp = getTailorBlueprint(id);
      if (!bp?.choice || bp.choice.options[0].category === "winery") continue;
      const chapters = toEditorialChapters(id)!;
      const chapter = chapters.find((c) => c.story === bp.choice!.note);
      expect(chapter).toBeTruthy();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
