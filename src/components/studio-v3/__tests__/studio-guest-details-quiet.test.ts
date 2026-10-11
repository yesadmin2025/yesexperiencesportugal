import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The guest-details screen should open on the form, not on a wall of day
 * text, and should never present tour language as a decision the traveler
 * has to make. These locks keep both quiet.
 */
const source = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/GuestDetailsStep.tsx"),
  "utf8",
);

describe("Studio guest details — quiet first screen", () => {
  it("keeps the day summary closed until the traveler asks for it", () => {
    const summary = source.match(/<details\b[\s\S]*?data-testid="studio-v3-guest-day-summary"/);
    expect(summary).not.toBeNull();
    expect(summary?.[0]).not.toMatch(/\sopen\b/);
    // Closed, the row is a single 44px touch target rather than a panel.
    expect(source).toContain('className="group mt-5 rounded-[6px] border px-4 py-2"');
  });

  it("says what is inside the closed summary and shows its state", () => {
    expect(source).toContain('daySummary.stops.length === 1 ? "stop" : "stops"');
    expect(source).toContain("group-open:rotate-180");
  });

  it("presents tour language as a quiet line, not a required decision", () => {
    expect(source).not.toContain('label="Preferred tour language"');
    expect(source).toContain('label="Tour language"');
    expect(source).toContain('data-testid="studio-v3-language-change"');
    expect(source).toContain('data-testid="studio-v3-language-options"');
    // The alternative is still one tap away and keeps its accessible group.
    expect(source).toContain('aria-label="Tour language"');
    // Payload contract untouched: the chosen value still ships with the form.
    expect(source).toContain("language,");
  });
});
