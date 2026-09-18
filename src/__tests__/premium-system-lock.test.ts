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

  it("keeps conversion controls quiet after a one-shot entrance cue", () => {
    const cta = read("src/components/ui/CtaButton.tsx");
    const checkout = read("src/components/studio-v3/CheckoutSummary.tsx");
    const studioShell = read("src/components/studio-v3/PhaseShell.tsx");

    expect(cta).toContain("cta-arrow-cue");
    expect(cta).not.toContain("cta-arrow-idle");
    expect(css).toContain("animation: ctaArrowEntranceCue var(--dur-image)");
    expect(css).not.toMatch(/\.cta-arrow-cue\s*\{[^}]*infinite/s);
    expect(checkout).toContain('behavior: "auto"');
    expect(studioShell).not.toContain("studioV3Breathe");
  });

  it("activates editorial motion centrally while excluding transactional journeys", () => {
    const hook = read("src/hooks/use-marketing-motion.ts");
    const root = read("src/routes/__root.tsx");

    expect(root).toContain("usePublicEditorialMotion(pathname)");
    expect(hook).toContain("NON_EDITORIAL_PATHS");
    expect(hook).toMatch(/\/\^\\\/checkout/);
    expect(hook).toMatch(/\/\^\\\/studio/);
    expect(hook).toContain('document.documentElement.dataset.motionScope = "marketing"');
    expect(hook).toContain('import("@/lib/home-motion")');
    expect(hook).toContain("requestAnimationFrame");
    expect(hook).not.toContain("MutationObserver");
    expect(css).not.toContain("filter: blur(2px)");
  });

  it("uses Inter for public micro-labels and controls", () => {
    const publicUi = [
      "src/components/Footer.tsx",
      "src/components/home/RecentJourney.tsx",
      "src/components/travel-designer/TravelFilePreview.tsx",
      "src/components/ui/GuestMomentsStrip.tsx",
      "src/routes/multi-day.tsx",
    ].map(read).join("\n");

    expect(publicUi).not.toMatch(/font-\[family-name:var\(--font-display\)\][^"\n]*(?:uppercase|text-\[1[012](?:\.5)?px\])/);
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