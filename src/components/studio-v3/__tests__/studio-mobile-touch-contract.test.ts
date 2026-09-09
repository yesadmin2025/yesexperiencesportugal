import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stepper = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3ProgressStepper.tsx"),
  "utf8",
);
const route = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/UnifiedYourDayRoute.tsx"),
  "utf8",
);
const finalReveal = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/FinalRevealStory.tsx"),
  "utf8",
);
const mobileCss = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/studioMobileA11y.css"),
  "utf8",
);

describe("Studio V3 mobile UX hardening", () => {
  it("gives every progress beat a real 44px minimum height", () => {
    const occurrences = stepper.match(/min-h-\[44px\]/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(stepper).toContain("justify-center gap-1.5");
  });

  it("gives the legacy inline moment controls a physical 44px box", () => {
    expect(mobileCss).toContain('button[aria-label^="Move "]');
    expect(mobileCss).toContain('button[aria-label^="Swap "]');
    expect(mobileCss).toContain('button[aria-label^="Remove "]');
    expect(mobileCss).toContain("width: 44px !important");
    expect(mobileCss).toContain("height: 44px !important");
  });

  it("offers a localized Edit moments action from the route overview", () => {
    expect(route).toContain('data-testid="studio-v3-edit-moments"');
    expect(route).toContain("Edit moments");
    expect(route).toContain('data-testid="studio-v3-stops-editor"');
    expect(route).toContain("scrollIntoView");
    expect(route).toContain("min-h-[44px]");
  });

  it("does not repeat stop descriptions in the timeline overview", () => {
    expect(route).toContain(
      "<YourDayTimeline moments={moments.map((m) => ({ label: m.label }))} />",
    );
    expect(route).not.toContain("story: m.story ?? null");
  });

  it("suppresses the redundant mini-legend only for timeline fallback", () => {
    expect(mobileCss).toContain('[data-route-mode="timeline"]');
    expect(mobileCss).toContain('[aria-label="Route stops in order"]');
    expect(mobileCss).toContain("display: none");
  });

  it("keeps Living Atlas rationale on one visible surface inside Your Day", () => {
    expect(finalReveal).toContain('data-testid="studio-v3-inline-why-this-fits"');
    expect(mobileCss).toContain(
      '[data-testid="studio-v3-signature-card"] [data-testid="studio-v3-inline-why-this-fits"]',
    );
    expect(mobileCss).toContain("dedicated \"Why this route works\" block");
  });
});
