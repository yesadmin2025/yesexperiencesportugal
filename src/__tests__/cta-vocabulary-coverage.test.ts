import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PUBLIC_FILES = [
  "src/components/FloatingActions.tsx",
  "src/components/journal/GuideBookingCta.tsx",
  "src/components/builder/StickyBar.tsx",
  "src/routes/luxury-tours-portugal.tsx",
  "src/routes/portugal-tours.tsx",
];

describe("public CTA vocabulary", () => {
  it("keeps retired or competing purchase labels out of conversion surfaces", () => {
    const source = PUBLIC_FILES.map((path) => readFileSync(path, "utf8")).join("\n");
    for (const label of [
      "Start Your Experience",
      "Explore Signature Tours",
      "Check dates & book",
      "Or design your own day",
      "Confirm experience",
    ]) {
      expect(source).not.toContain(label);
    }
  });
});