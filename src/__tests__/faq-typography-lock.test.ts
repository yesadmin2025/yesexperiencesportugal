/**
 * FAQ typography lock — Phase 3 (Nov 2026 refinement).
 *
 * Reads className strings from stable selectors in FAQ.tsx, tokenizes
 * them into a Set, and asserts on individual Tailwind utilities. This
 * is order-independent: reshuffling classes will not cause failures,
 * but any *value* drift (e.g. text-[2rem] → text-[1.9rem], leading-[1.12]
 * → leading-[1.1], py-4 → py-3) will fail loudly.
 *
 * Locked values (post Dec 2026 — FAQ reduced to a quiet operational
 * footer, NOT a closing anchor; the Final CTA closes the homepage):
 *
 *   #faq-title h2 — calmer scale, matching other section H2s.
 *     · text-[1.8rem]  sm:text-[2.1rem]  md:text-[2.6rem]
 *     · leading-[1.1]  md:leading-[1.02]  tracking-[-0.018em]
 *     · text-[color:var(--charcoal)]  font-medium
 *
 *   AccordionTrigger
 *     · text-[15px]  md:text-[17px]
 *     · px-5  md:px-6   py-4  md:py-5
 *
 *   AccordionContent
 *     · text-[14.5px]  md:text-[15px]
 *     · leading-[1.65]
 *     · px-5  md:px-6   pb-5  md:pb-6
 *
 *   #faq section wrapper — tightened
 *     · py-12  md:py-14
 *
 * If you intentionally change FAQ typography, update this test in the
 * SAME commit and document the new values in the header above.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const faqPath = resolve(__dirname, "../components/FAQ.tsx");
const src = readFileSync(faqPath, "utf8");

/**
 * Pull the className string for a stable selector and tokenize it.
 * Order-independent: returns a Set of utility tokens.
 */
function classSet(regex: RegExp, label: string): Set<string> {
  const m = src.match(regex);
  if (!m) {
    throw new Error(
      `[faq-typography-lock] Stable selector not found: ${label}. ` +
      `Check that the element ID/component still exists in FAQ.tsx.`
    );
  }
  return new Set(m[1].split(/\s+/).filter(Boolean));
}

/**
 * Assert that EVERY expected token is present, regardless of order.
 * Reports the missing token clearly so drift is obvious.
 */
function expectAllTokens(
  actual: Set<string>,
  expected: string[],
  context: string,
) {
  const missing = expected.filter((t) => !actual.has(t));
  expect(
    missing,
    `[${context}] missing locked Tailwind tokens: ${missing.join(", ")}`,
  ).toEqual([]);
}

// Stable selectors — keyed off element IDs / component names, not class order.
const FAQ_TITLE = classSet(
  /id="faq-title"\s+className="([^"]+)"/,
  "h2#faq-title",
);
const TRIGGER = classSet(
  /<AccordionTrigger\s+className="([^"]+)"/,
  "<AccordionTrigger>",
);
const CONTENT = classSet(
  /<AccordionContent\s+className="([^"]+)"/,
  "<AccordionContent>",
);
const SECTION = classSet(
  /id="faq"\s+className="([^"]+)"/,
  "section#faq",
);

describe("FAQ #faq-title — locked typography (order-independent)", () => {
  it("locks size, line-height, tracking and color tokens", () => {
    expectAllTokens(
      FAQ_TITLE,
      [
        "text-[1.8rem]",
        "sm:text-[2.1rem]",
        "md:text-[2.6rem]",
        "leading-[1.1]",
        "md:leading-[1.02]",
        "tracking-[-0.018em]",
        "text-[color:var(--charcoal)]",
        "font-medium",
      ],
      "h2#faq-title",
    );
  });

  it("does NOT silently regress to the pre-Phase-3 4xl/5xl ramp", () => {
    expect(FAQ_TITLE.has("text-4xl")).toBe(false);
    expect(FAQ_TITLE.has("md:text-5xl")).toBe(false);
  });

  it("FAQ headline stays calm — no longer the homepage's closing anchor", () => {
    // FAQ was deliberately downsized; the Final CTA now closes the page.
    expect(FAQ_TITLE.has("md:text-[4rem]")).toBe(false);
    expect(FAQ_TITLE.has("md:text-[2.6rem]")).toBe(true);
  });
});

describe("AccordionTrigger — locked typography (order-independent)", () => {
  it("locks size and padding tokens", () => {
    expectAllTokens(
      TRIGGER,
      [
        "text-[15px]",
        "md:text-[17px]",
        "px-5",
        "md:px-6",
        "py-4",
        "md:py-5",
      ],
      "<AccordionTrigger>",
    );
  });

  it("does NOT regress to the looser pre-Phase-3 padding", () => {
    // Old: px-6 py-5 with no md override
    expect(TRIGGER.has("text-base")).toBe(false);
  });
});

describe("AccordionContent — locked typography (order-independent)", () => {
  it("locks size, line-height and padding tokens", () => {
    expectAllTokens(
      CONTENT,
      [
        "text-[14.5px]",
        "md:text-[15px]",
        "leading-[1.65]",
        "px-5",
        "md:px-6",
        "pb-5",
        "md:pb-6",
        "pt-0",
      ],
      "<AccordionContent>",
    );
  });
});

describe("FAQ section#faq — locked rhythm (order-independent)", () => {
  it("locks vertical padding tokens", () => {
    expectAllTokens(
      SECTION,
      ["py-16", "md:py-20"],
      "section#faq",
    );
  });

  it("does NOT regress to the pre-Phase-3 oversized rhythm", () => {
    expect(SECTION.has("py-24")).toBe(false);
    expect(SECTION.has("md:py-32")).toBe(false);
  });
});
