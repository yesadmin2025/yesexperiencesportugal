/**
 * Mobile regression (393px): while the cookie banner is visible on a first
 * visit, the floating WhatsApp support button must sit above it (via the
 * --cookie-banner-lift custom property) and return to its normal position
 * once the banner is dismissed. Consent logic itself is untouched.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CookieConsent } from "@/components/CookieConsent";

const FAB_SRC = readFileSync(
  join(process.cwd(), "src/components/support/WhatsAppSupportButton.tsx"),
  "utf8",
);
const FLOATING_ACTIONS_SRC = readFileSync(
  join(process.cwd(), "src/components/FloatingActions.tsx"),
  "utf8",
);

describe("cookie banner vs floating WhatsApp button (393px)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty("--cookie-banner-lift");
    // iPhone-class mobile viewport
    (window as unknown as { innerWidth: number }).innerWidth = 393;
    (window as unknown as { innerHeight: number }).innerHeight = 852;
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty("--cookie-banner-lift");
  });

  it("floating buttons consume --cookie-banner-lift in their bottom offset", () => {
    expect(FAB_SRC).toContain("var(--cookie-banner-lift,0px)");
    expect(FLOATING_ACTIONS_SRC).toContain("var(--cookie-banner-lift,0px)");
  });

  it("first visit: banner sets --cookie-banner-lift, dismissing removes it", () => {
    render(<CookieConsent />);

    // Banner is shown on a first visit (no stored consent).
    expect(screen.getByRole("dialog")).toBeTruthy();

    const lift = document.documentElement.style.getPropertyValue("--cookie-banner-lift");
    // jsdom reports 0 height; the contract is "banner height + 12px gap".
    expect(lift).toBe("12px");

    // Dismiss via "Accept all" — the lift must be removed so the button
    // returns to its normal position.
    fireEvent.click(screen.getByRole("button", { name: /accept all/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--cookie-banner-lift")).toBe("");
  });

  it("returning visitor with stored consent: no banner, no lift", () => {
    window.localStorage.setItem(
      "yes.cookieConsent.v1",
      JSON.stringify({ analytics: "denied", ads: "denied", decidedAt: "2026-09-25T00:00:00Z", version: 1 }),
    );
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--cookie-banner-lift")).toBe("");
  });

  it("both banner actions and the lift contract keep controls tappable (min 44px)", () => {
    render(<CookieConsent />);
    for (const name of [/customise/i, /essential only/i, /accept all/i]) {
      const btn = screen.getByRole("button", { name });
      expect(btn.className).toContain("min-h-11");
    }
    // FAB keeps its 48px mobile target and transition for the lift change.
    expect(FAB_SRC).toContain("h-[48px] w-[48px]");
    expect(FAB_SRC).toContain("transition-all");
  });
});
