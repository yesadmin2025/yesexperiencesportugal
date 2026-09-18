import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mobile regression: both Studio date surfaces share one responsive calendar.
 * It uses 40px at 320px so seven columns fit, and the full 44px floor from 360px.
 */
const DATE_SURFACES = [
  "src/components/studio-v3/DatePhase.tsx",
  "src/components/studio-v3/LivingAtlasDateStep.tsx",
];

describe("studio date tap targets", () => {
  it.each(DATE_SURFACES)("%s uses the shared calendar geometry", (path) => {
    const code = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(code).toContain("StudioDateCalendar");
    expect(code).not.toContain("[--cell-size:");
  });

  it("fits seven days at 320px and restores 44px targets from 360px", () => {
    const code = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/StudioDateCalendar.tsx"),
      "utf8",
    );
    expect(code).toContain("[--cell-size:2.5rem]");
    expect(code).toContain("min-[360px]:[--cell-size:2.75rem]");
    expect(code).toContain("max-w-full");
    expect(code).toContain("overflow-hidden");
  });
});
