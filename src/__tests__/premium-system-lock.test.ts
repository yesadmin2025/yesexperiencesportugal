import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CTA_LABELS, RETIRED_PUBLIC_CTA_LABELS } from "@/content/cta-vocabulary";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("src/styles.css");

describe("Premium System Lock", () => {
  it("defines the complete semantic typography scale with Fraunces and Inter", () => {
    expect(css).toContain('--font-display: "Fraunces", serif');
    expect(css).toContain('--font-sans: "Inter", system-ui, sans-serif');
    for (const token of [
      ".t-display-xl",
      ".t-display",
      ".t-h1",
      ".t-h2",
      ".t-h3",
      ".t-body-lg",
      ".t-body",
      ".t-small",
      ".t-eyebrow",
      ".t-button",
    ]) expect(css).toContain(token);
  });

  it("locks the three motion tiers inside the approved ranges", () => {
    const value = (name: string) => Number(css.match(new RegExp(`${name}:\\s*(\\d+)ms`))?.[1]);
    expect(value("--dur-tap")).toBeGreaterThanOrEqual(140);
    expect(value("--dur-quick")).toBeLessThanOrEqual(200);
    expect(value("--dur-base")).toBeGreaterThanOrEqual(300);
    expect(value("--dur-slow")).toBeLessThanOrEqual(450);
    expect(value("--dur-cinematic")).toBeGreaterThanOrEqual(700);
    expect(value("--dur-cinematic")).toBeLessThanOrEqual(1000);
  });

  it("keeps the public CTA vocabulary canonical", () => {
    expect(CTA_LABELS.studio).toBe("Design your day");
    expect(CTA_LABELS.signatureBooking).toBe("Reserve this day");
    expect(CTA_LABELS.studioReveal).toBe("Love this day · Reserve it");
    const publicSources = [
      "src/components/Navbar.tsx",
      "src/components/home/FourWaysIn.tsx",
      "src/routes/experiences.tsx",
      "src/routes/portugal-travel-designer.tsx",
      "src/routes/proposal-in-portugal.tsx",
      "src/routes/corporate.tsx",
    ].map(read).join("\n");
    for (const retired of RETIRED_PUBLIC_CTA_LABELS) expect(publicSources).not.toContain(retired);
  });
});