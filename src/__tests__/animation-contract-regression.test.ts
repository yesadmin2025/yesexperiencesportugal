/**
 * Real animation regression test.
 *
 * Beyond "visibility lands within 2.5s", this suite proves the
 * animation primitives still exist and behave the way the UI relies on:
 *
 *   1. `.reveal`     starts at opacity:0 with a transition for opacity AND transform.
 *   2. `.reveal.is-visible`   flips opacity to 1 and removes the translateY offset.
 *   3. `.reveal-stagger`  has the same start/end contract.
 *   4. `.section-enter` is opacity-only (no transform conflict).
 *   5. `.section-enter.is-visible` is opacity:1.
 *   6. Reduced-motion media query forces `.reveal` and `.reveal-stagger`
 *      to opacity:1 with `transition:none`.
 *
 * Approach: parse `src/styles.css` directly. We don't rely on jsdom's
 * computed styles (jsdom doesn't fully implement them). We assert that
 * the rules continue to exist with the right declarations — so a future
 * accidental edit (e.g. someone removes `.reveal { opacity: 0 }`,
 * making the homepage feel static) breaks the build.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleBlock(selector: string): string {
  // Match an occurrence of `<selector> {...}` where the selector starts
  // at a line boundary (optionally indented) — this avoids accidentally
  // matching scoped variants like `.home-energy .reveal {` when we want
  // the canonical `.reveal {`. Returns the body of the first such block.
  const re = new RegExp(`(^|\\n)[\\t ]*${escapeRe(selector)}`, "m");
  const m = re.exec(CSS);
  if (!m) return "";
  const idx = m.index + m[0].length - selector.length;
  const open = CSS.indexOf("{", idx);
  if (open < 0) return "";
  let depth = 1;
  for (let i = open + 1; i < CSS.length; i++) {
    const ch = CSS[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  return "";
}

describe("reveal animation contract — CSS rules", () => {
  it(".reveal starts hidden with translateY and animates opacity + transform", () => {
    const body = ruleBlock("html.reveal-ready .reveal {");
    expect(body, "gated .reveal rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*0/);
    expect(body).toMatch(/transform:\s*translateY/);
    expect(body).toMatch(/transition:[\s\S]*opacity/);
    expect(body).toMatch(/transition:[\s\S]*transform/);
  });

  it(".reveal.is-visible reaches opacity:1 and translateY(0)", () => {
    const body = ruleBlock("html.reveal-ready .reveal.is-visible");
    expect(body, ".reveal.is-visible rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*1/);
    expect(body).toMatch(/translateY\(0\)/);
  });

  it(".reveal-stagger starts hidden and animates opacity + transform", () => {
    const body = ruleBlock("html.reveal-ready .reveal-stagger {");
    expect(body, ".reveal-stagger rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*0/);
    expect(body).toMatch(/transform:\s*translateY/);
    expect(body).toMatch(/transition:[\s\S]*opacity/);
    expect(body).toMatch(/transition:[\s\S]*transform/);
  });

  it(".reveal-stagger.is-visible reaches opacity:1 and translateY(0)", () => {
    const body = ruleBlock("html.reveal-ready .reveal-stagger.is-visible");
    expect(body, ".reveal-stagger.is-visible rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*1/);
    expect(body).toMatch(/translateY\(0\)/);
  });

  it(".section-enter is opacity-only (never adds a transform that would fight inner reveals)", () => {
    const body = ruleBlock("html.reveal-ready .section-enter {");
    expect(body, ".section-enter rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*0/);
    expect(body).toMatch(/transition:[\s\S]*opacity/);
    expect(body).not.toMatch(/transform:\s*translate/);
  });

  it(".section-enter.is-visible reaches opacity:1", () => {
    const body = ruleBlock("html.reveal-ready .section-enter.is-visible");
    expect(body, ".section-enter.is-visible rule must exist").not.toBe("");
    expect(body).toMatch(/opacity:\s*1/);
  });

  it("prefers-reduced-motion forces .reveal and .reveal-stagger to opacity:1", () => {
    // Find the reduced-motion block that targets `.reveal` / `.reveal-stagger`.
    const rmBlock = CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.reveal,\s*\.reveal-stagger\s*\{([\s\S]*?)\}/,
    );
    expect(rmBlock, "reduced-motion block for .reveal/.reveal-stagger must exist").toBeTruthy();
    const body = rmBlock?.[1] ?? "";
    expect(body).toMatch(/opacity:\s*1\s*!important/);
    expect(body).toMatch(/transform:\s*none\s*!important/);
    expect(body).toMatch(/transition:\s*none\s*!important/);
  });

  it("prefers-reduced-motion forces .section-enter to opacity:1 with no animation", () => {
    const rmBlock = CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.section-enter,\s*\.section-enter\.is-visible\s*\{([\s\S]*?)\}/,
    );
    expect(rmBlock, "reduced-motion block for .section-enter must exist").toBeTruthy();
    const body = rmBlock?.[1] ?? "";
    expect(body).toMatch(/opacity:\s*1\s*!important/);
    expect(body).toMatch(/animation:\s*none\s*!important/);
  });
});

describe("reveal hidden states are progressively enhanced", () => {
  it("no ungated .reveal / .reveal-stagger / .section-enter rule sets opacity: 0", () => {
    for (const sel of [".reveal {", ".reveal-stagger {", ".section-enter {"]) {
      // Only the `html.reveal-ready`-gated variants may hide content, so
      // crawlers and no-JS visitors always see the page.
      const re = new RegExp(`(^|[^-\\w.])\\${sel.trim().slice(0, -1)}\\s*\\{`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(CSS))) {
        const before = CSS.slice(Math.max(0, m.index - 40), m.index + m[0].length);
        if (before.includes("reveal-ready")) continue;
        const open = CSS.indexOf("{", m.index);
        const body = CSS.slice(open, CSS.indexOf("}", open));
        expect(body, `ungated rule for ${sel} must not hide content`).not.toMatch(/opacity:\s*0/);
      }
    }
  });
});
