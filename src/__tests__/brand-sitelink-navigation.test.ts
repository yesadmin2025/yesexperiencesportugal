/**
 * Brand navigation and sitelink-readiness contract.
 * Google decides which sitelinks appear; this test only protects the
 * permanent descriptive internal links that help visitors and crawlers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const footer = readFileSync(join(process.cwd(), "src/components/Footer.tsx"), "utf8");
const services = ["src/routes/index.tsx", "src/components/home/RecentJourney.tsx"].map(path => readFileSync(join(process.cwd(), path), "utf8")).join("\n");

const targets = [
  "/experiences",
  "/studio",
  "/portugal-travel-designer",
  "/proposal-in-portugal",
  "/corporate",
] as const;

describe("YES five-service site navigation", () => {
  it("provides the five real commercial routes as crawlable internal links", () => {
    for (const to of targets) {
      expect(footer).toContain(`to: "${to}"`);
      expect(services).toMatch(new RegExp(`(?:to=|to: )"${to}"`));
    }
  });

  it("retains the services in actual homepage sections and permanent footer navigation", () => {
    expect(services).toContain('id="signatures"');
    expect(services).toContain('id="builder"');
    expect(services).toContain('id="special-occasions"');
    expect(services).toContain('id="multi-day"');
  });

  it("gives the always-visible footer navigation a descriptive landmark", () => {
    expect(footer).toContain('<nav aria-label="Explore YES Experiences Portugal services and company"');
    expect(footer).toContain("Proposals & Celebrations");
    expect(footer).toContain("Corporate & Groups");
    expect(footer).toContain("About YES Experiences Portugal");
    expect(footer).toContain('to: "/lisbon-wine-tours"');
  });
});
