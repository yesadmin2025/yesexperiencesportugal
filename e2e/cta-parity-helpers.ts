import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

/**
 * Shared CTA parity helpers used by both the mobile and tablet specs.
 *
 * Why this lives in its own module:
 *   • The two parity specs must run identical assertions so the contract
 *     stays in lock-step across breakpoints.
 *   • Each parity test attaches a structured JSON payload describing
 *     every check (label, primary value, secondary value, delta,
 *     tolerance, pass/fail) so the `cta-parity-summary` reporter can
 *     render a per-viewport pass/fail + deltas table in the GitHub
 *     Actions step summary.
 *
 * Behavior contract:
 *   • Every check is recorded — even after a failure — so the summary
 *     table shows the full picture, not just the first failing field.
 *   • After all checks run, the helper throws if any check failed,
 *     preserving the existing fail-fast semantics for CI.
 */

export const PX_TOLERANCE = 0.5;
export const CTA_PARITY_ATTACHMENT_NAME = "cta-parity-report";

export type CtaMetrics = {
  width: number;
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: string;
  textAlign: string;
  iconWidth: number;
  iconHeight: number;
  iconRightOffset: number;
  iconVerticalCenterOffset: number;
};

export type ParityCheck =
  | {
      kind: "numeric";
      label: string;
      primary: number;
      secondary: number;
      delta: number;
      tolerance: number;
      passed: boolean;
    }
  | {
      kind: "string";
      label: string;
      primary: string;
      secondary: string;
      passed: boolean;
    }
  | {
      kind: "single";
      label: string;
      value: number;
      tolerance: number;
      passed: boolean;
      target: "primary" | "secondary";
    };

export type CtaParityReport = {
  viewportLabel: string;
  viewportWidth: number;
  viewportHeight: number;
  checks: ParityCheck[];
  failedCount: number;
  totalCount: number;
};

export async function gotoHero(page: Page, route = "/?hero=last") {
  await page.goto(route);
  const h1 = page.locator(".hero-h1");
  await expect(h1).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector(".hero-h1") as HTMLElement | null;
    return !!el && getComputedStyle(el).opacity === "1";
  });
  // Freeze in-flight CTA fade/breathe animations so measurements are stable.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
      }
      .cta-breathe, .cta-attention { animation: none !important; }
    `,
  });
  await page.waitForTimeout(150);
}

export async function measureCta(cta: Locator): Promise<CtaMetrics> {
  return cta.evaluate((el) => {
    const button = el as HTMLElement;
    const cs = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    const icon = button.querySelector("svg") as SVGElement | null;
    if (!icon) {
      throw new Error("CTA is missing its icon (svg)");
    }
    const iconRect = icon.getBoundingClientRect();

    const lh =
      cs.lineHeight === "normal" ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight);

    return {
      width: rect.width,
      height: rect.height,
      paddingTop: parseFloat(cs.paddingTop),
      paddingRight: parseFloat(cs.paddingRight),
      paddingBottom: parseFloat(cs.paddingBottom),
      paddingLeft: parseFloat(cs.paddingLeft),
      fontSize: parseFloat(cs.fontSize),
      lineHeight: lh,
      letterSpacing: cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing),
      textTransform: cs.textTransform,
      textAlign: cs.textAlign,
      iconWidth: iconRect.width,
      iconHeight: iconRect.height,
      iconRightOffset: rect.right - iconRect.right,
      iconVerticalCenterOffset: Math.abs(
        iconRect.top + iconRect.height / 2 - (rect.top + rect.height / 2),
      ),
    };
  });
}

/**
 * Run the full parity contract against a measured primary/secondary
 * pair, record every check, attach the structured report to the test,
 * then throw if any check failed (preserves fail-fast for CI).
 */
export async function runParityChecks(
  testInfo: TestInfo,
  viewport: { label: string; width: number; height: number },
  primary: CtaMetrics,
  secondary: CtaMetrics,
): Promise<CtaParityReport> {
  const checks: ParityCheck[] = [];

  const numeric = (label: string, a: number, b: number, tolerance = PX_TOLERANCE) => {
    const delta = Math.abs(a - b);
    checks.push({
      kind: "numeric",
      label,
      primary: a,
      secondary: b,
      delta,
      tolerance,
      passed: delta <= tolerance,
    });
  };

  const stringEq = (label: string, a: string, b: string, expected?: string) => {
    let passed = a === b;
    if (passed && typeof expected === "string") {
      passed = a === expected;
    }
    checks.push({ kind: "string", label, primary: a, secondary: b, passed });
  };

  const singleWithin = (
    label: string,
    value: number,
    tolerance: number,
    target: "primary" | "secondary",
  ) => {
    checks.push({
      kind: "single",
      label,
      value,
      tolerance,
      target,
      passed: value <= tolerance,
    });
  };

  // ─── Geometry ─────────────────────────────────────────────────────
  numeric("width", primary.width, secondary.width);
  numeric("height", primary.height, secondary.height, 1); // border-[1.5px] vs none can shift by ≤ 1px
  numeric("padding-top", primary.paddingTop, secondary.paddingTop);
  numeric("padding-right", primary.paddingRight, secondary.paddingRight);
  numeric("padding-bottom", primary.paddingBottom, secondary.paddingBottom);
  numeric("padding-left", primary.paddingLeft, secondary.paddingLeft);

  // ─── Typography ───────────────────────────────────────────────────
  numeric("font-size", primary.fontSize, secondary.fontSize);
  numeric("line-height", primary.lineHeight, secondary.lineHeight);
  numeric("letter-spacing", primary.letterSpacing, secondary.letterSpacing, 0.05);
  stringEq("text-transform", primary.textTransform, secondary.textTransform, "uppercase");
  stringEq("text-align", primary.textAlign, secondary.textAlign, "left");

  // ─── Icon layout ──────────────────────────────────────────────────
  numeric("icon-width", primary.iconWidth, secondary.iconWidth);
  numeric("icon-height", primary.iconHeight, secondary.iconHeight);
  numeric("icon-right-offset", primary.iconRightOffset, secondary.iconRightOffset);
  singleWithin(
    "primary icon vertical-center offset",
    primary.iconVerticalCenterOffset,
    1,
    "primary",
  );
  singleWithin(
    "secondary icon vertical-center offset",
    secondary.iconVerticalCenterOffset,
    1,
    "secondary",
  );

  const failedCount = checks.filter((c) => !c.passed).length;
  const report: CtaParityReport = {
    viewportLabel: viewport.label,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    checks,
    failedCount,
    totalCount: checks.length,
  };

  await testInfo.attach(CTA_PARITY_ATTACHMENT_NAME, {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });

  // Preserve fail-fast: surface the first failure as a clean assertion
  // error so Playwright's HTML report points to the right field.
  const firstFailure = checks.find((c) => !c.passed);
  if (firstFailure) {
    if (firstFailure.kind === "numeric") {
      expect(
        firstFailure.delta,
        `${firstFailure.label}: primary=${firstFailure.primary.toFixed(2)} vs secondary=${firstFailure.secondary.toFixed(2)} (Δ ${firstFailure.delta.toFixed(2)}px, max ${firstFailure.tolerance}px)`,
      ).toBeLessThanOrEqual(firstFailure.tolerance);
    } else if (firstFailure.kind === "single") {
      expect(
        firstFailure.value,
        `${firstFailure.label}: ${firstFailure.value.toFixed(2)}px (max ${firstFailure.tolerance}px)`,
      ).toBeLessThanOrEqual(firstFailure.tolerance);
    } else {
      expect(
        firstFailure.secondary,
        `${firstFailure.label}: primary="${firstFailure.primary}" vs secondary="${firstFailure.secondary}"`,
      ).toBe(firstFailure.primary);
    }
  }

  return report;
}
