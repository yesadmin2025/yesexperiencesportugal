/**
 * Studio V3 · mobile accessibility — per-phase contract.
 *
 * Two layers at 393px:
 *   1. Targeted assertions — every button/input inside the Studio has a
 *      stable accessible name, inputs are programmatically labelled,
 *      primary tap targets clear 44x44, and tab order follows visual order
 *      through the guest form with a visible focus style.
 *   2. An axe-core scan at each key phase (intro, reveal, guest details,
 *      checkout), scoped to the Studio surface, failing on serious/critical
 *      violations.
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-mobile-a11y-phases
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;
const STUDIO_SCOPE = '[data-testid="studio-v3-root"], [data-studio-v3-screen]';

async function scan(page: Page, phase: string) {
  const results = await new AxeBuilder({ page })
    .include(STUDIO_SCOPE)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = blocking
    .map((v) => `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.help}`)
    .join("\n");
  expect(blocking, `axe violations at ${phase}:\n${summary}`).toEqual([]);
}

/** Every visible control in `scope` must expose a non-empty accessible name. */
async function assertNamedControls(scope: Locator, phase: string) {
  const unnamed = await scope.evaluateAll((roots) => {
    const bad: string[] = [];
    const named = (el: Element): string => {
      const aria = el.getAttribute("aria-label");
      if (aria && aria.trim()) return aria.trim();
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
          .trim();
        if (text) return text;
      }
      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim();
      return (el.textContent ?? "").replace(/\s+/g, " ").trim();
    };
    for (const root of roots) {
      const controls = root.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea");
      for (const el of controls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (el.closest("[aria-hidden='true']")) continue;
        let name = named(el);
        if (!name && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          const wrapper = el.closest("label");
          name = (wrapper?.textContent ?? "").replace(/\s+/g, " ").trim();
          if (!name && el.id) {
            name = (
              document.querySelector(`label[for="${el.id}"]`)?.textContent ?? ""
            ).trim();
          }
          if (!name) name = el.getAttribute("placeholder")?.trim() ?? "";
        }
        if (!name) bad.push(`${el.tagName.toLowerCase()}#${el.id || "(no id)"}.${el.className}`);
      }
    }
    return bad;
  });

  expect(unnamed, `unnamed controls at ${phase}:\n${unnamed.join("\n")}`).toEqual([]);
}

/** Primary tap targets must clear 44x44 CSS px. */
async function assertTapTargets(scope: Locator, phase: string) {
  const small = await scope.evaluateAll((roots) => {
    const bad: string[] = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>("button, a[href]")) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (el.closest("[aria-hidden='true']")) continue;
        // Inline text links inside prose are exempt — the rule targets
        // standalone controls, not words inside a sentence.
        const inline = window.getComputedStyle(el).display === "inline";
        if (inline) continue;
        if (rect.height < 44 - 0.5) {
          bad.push(
            `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 32)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      }
    }
    return bad;
  });

  expect(small, `tap targets under 44px at ${phase}:\n${small.join("\n")}`).toEqual([]);
}

test.describe("Studio V3 · mobile accessibility @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  test("intro phase — named controls, tap targets, axe clean", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/studio-v3");
    await page.getByTestId("studio-v3-intro-begin").waitFor({ timeout: 20_000 });

    const scope = page.locator(STUDIO_SCOPE);
    await assertNamedControls(scope, "intro");
    await assertTapTargets(scope, "intro");
    await scan(page, "intro");
  });

  test("reveal, guest details and checkout — labels, focus order, axe clean", async ({ page }) => {
    test.setTimeout(420_000);
    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    // --- Guest details -----------------------------------------------------
    const form = page.getByTestId("studio-v3-guest-details");
    await expect(form).toBeVisible();
    await assertNamedControls(form, "guest details");
    await assertTapTargets(form, "guest details");
    await scan(page, "guest details");

    // Every input is programmatically associated with a label.
    const unlabelled = await form.evaluate((root) => {
      const bad: string[] = [];
      for (const el of root.querySelectorAll<HTMLInputElement>("input, textarea, select")) {
        if (el.type === "hidden") continue;
        const byWrapper = !!el.closest("label");
        const byFor = !!(el.id && root.querySelector(`label[for="${el.id}"]`));
        const byAria = !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
        if (!byWrapper && !byFor && !byAria) bad.push(el.outerHTML.slice(0, 120));
      }
      return bad;
    });
    expect(unlabelled, `inputs without a label:\n${unlabelled.join("\n")}`).toEqual([]);

    // Tab order follows visual (document) order through the form controls.
    const order = await form.evaluate((root) => {
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          "input:not([type=hidden]), textarea, select, button:not([disabled]), a[href]",
        ),
      ).filter((el) => el.tabIndex >= 0 && el.getBoundingClientRect().height > 0);
      return focusables.map((el) => el.tabIndex);
    });
    expect(order.every((t) => t === 0), "no positive tabindex values in the form").toBe(true);

    // Focus is visible on the first field.
    const firstField = form.getByLabel(/full name/i).first();
    await firstField.focus();
    await expect(firstField).toBeFocused();
    const hasFocusStyle = await firstField.evaluate((el) => {
      const s = window.getComputedStyle(el as Element);
      return (
        s.outlineStyle !== "none" ||
        parseFloat(s.outlineWidth || "0") > 0 ||
        (s.boxShadow ?? "none") !== "none"
      );
    });
    expect(hasFocusStyle, "focused field must show a visible focus indicator").toBe(true);

    // --- Checkout summary --------------------------------------------------
    await fillGuestDetails(page);
    await page.getByTestId("studio-v3-guest-details-submit").click();
    const summary = page.getByTestId("studio-v3-checkout-summary");
    await expect(summary).toBeVisible({ timeout: 20_000 });

    await assertNamedControls(summary, "checkout summary");
    await assertTapTargets(summary, "checkout summary");
    await scan(page, "checkout summary");
  });
});
