/**
 * Static guard: prevents horizontal overflow regressions.
 *
 * We don't render the full app under jsdom (it would be flaky), so we
 * verify the two CSS preconditions that, together, guarantee mobile
 * pages can never produce horizontal scroll:
 *
 *   1. <html> and <body> set `overflow-x: clip` (or `hidden`).
 *      This contains any single runaway descendant.
 *   2. No raw `100vw` width on a child element (which on iOS Safari
 *      includes the scrollbar width and can spill 8–15px past the
 *      viewport). Use `w-full` / `100%` / `100dvw` instead.
 *
 * If either invariant breaks in the future this test fails immediately,
 * before it ever ships to a phone.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesPath = resolve(__dirname, "../styles.css");

describe("Mobile horizontal overflow guards", () => {
  it("locks html and body to overflow-x: clip", () => {
    const css = readFileSync(stylesPath, "utf8");

    // html { ... overflow-x: clip|hidden ... }
    const htmlBlock = css.match(/\bhtml\s*\{[^}]*\}/);
    expect(htmlBlock, "no `html { ... }` block found in styles.css").toBeTruthy();
    expect(htmlBlock![0]).toMatch(/overflow-x:\s*(clip|hidden)/);

    // body { ... overflow-x: clip|hidden ... }
    const bodyBlock = css.match(/\bbody\s*\{[^}]*\}/);
    expect(bodyBlock, "no `body { ... }` block found in styles.css").toBeTruthy();
    expect(bodyBlock![0]).toMatch(/overflow-x:\s*(clip|hidden)/);
  });

  it("does not declare any 100vw width that would spill past the iOS viewport", () => {
    // We allow `100vw` for left:50% slide-out tricks etc. only when
    // they appear inside a `.full-bleed` rule (intentional, full-bleed
    // hero band that lives inside an overflow-clip ancestor). Anything
    // else must fail the guard.
    const css = readFileSync(stylesPath, "utf8");

    const offenders: string[] = [];
    const ruleRegex = /([^{}]*)\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = ruleRegex.exec(css))) {
      const selector = m[1].trim();
      const body = m[2];
      // Skip @keyframes, @media, comment-only blocks
      if (selector.startsWith("@")) continue;
      if (selector.includes("full-bleed")) continue;
      // Find any width-ish 100vw declaration
      const offending = body.match(/\b(?:width|min-width|max-width)\s*:\s*100vw\b/);
      if (offending) offenders.push(`${selector} → ${offending[0]}`);
    }
    expect(offenders, `100vw widths found outside .full-bleed:\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });
});
