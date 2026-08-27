import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mobile regression: the react-day-picker default cell size is 2rem (32px),
 * which puts Studio date cells and month-nav arrows below the 44px tap-target
 * floor at 393px. Both Studio date surfaces must raise --cell-size.
 */
const DATE_SURFACES = [
  "src/components/studio-v3/DatePhase.tsx",
  "src/components/studio-v3/LivingAtlasDateStep.tsx",
];

describe("studio date tap targets", () => {
  it.each(DATE_SURFACES)("%s renders calendar cells at >= 44px", (path) => {
    const code = readFileSync(resolve(process.cwd(), path), "utf8");
    const match = code.match(/\[--cell-size:([\d.]+)rem\]/);
    expect(match, `${path} must set --cell-size on <Calendar>`).toBeTruthy();
    expect(Number(match![1]) * 16).toBeGreaterThanOrEqual(44);
  });
});
