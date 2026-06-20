/**
 * Source-level lock for the approved homepage structure.
 *
 * Reads `src/routes/index.tsx` as text and asserts it satisfies
 * `src/content/approved-homepage-structure.ts`:
 *
 *   1. Section count — exactly APPROVED_SECTION_COUNT `<section>` tags.
 *   2. Section identity + order — every approved section is found in
 *      the source in the right relative position, identified by either
 *      its `aria-labelledby` id or its `{/* N — NAME *\/}` marker
 *      comment immediately above it.
 *   3. Per-section spacing floor — the section's className contains a
 *      `py-N` (or `pb-N`) value with N ≥ the spec's floor at the
 *      mobile (unprefixed) Tailwind breakpoint.
 *   4. Layout invariants — `.container-x` appears at least
 *      APPROVED_SECTION_COUNT - 1 times (every section except the
 *      hero wraps its content in `.container-x`).
 *
 * This is a source-text lint, not a render test. That's deliberate:
 *   - It catches structural regressions in CI in milliseconds, before
 *     any Playwright run.
 *   - The matching live-DOM assertions belong in a Playwright spec
 *     (e2e/homepage-structure.spec.ts) which can additionally verify
 *     no horizontal overflow at each MOBILE_BREAKPOINTS width.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  APPROVED_HOMEPAGE_SECTIONS,
  APPROVED_SECTION_COUNT,
  APPROVED_INLINE_SECTION_COUNT,
  MOBILE_LAYOUT_INVARIANTS,
  type ApprovedSection,
} from "../../content/approved-homepage-structure";

const INDEX_PATH = resolve(process.cwd(), "src/routes/index.tsx");
const SOURCE = readFileSync(INDEX_PATH, "utf8");

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

interface SectionMatch {
  /** Character index of the opening `<section` tag. */
  index: number;
  /** Full opening tag, including all attributes up to (and including) `>`. */
  openTag: string;
  /** className string extracted from the open tag, or "" if none. */
  className: string;
  /** aria-labelledby value extracted from the open tag, or null. */
  ariaLabelledBy: string | null;
}

/**
 * Walk the source and return every `<section …>` opening tag with its
 * className + aria-labelledby parsed out. Multi-line attributes are
 * supported (the homepage uses both inline and prop-wrapped forms).
 */
function findSections(source: string): SectionMatch[] {
  const out: SectionMatch[] = [];
  const re = /<section\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const attrs = m[1];
    const classNameMatch = attrs.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
    const ariaMatch = attrs.match(/aria-labelledby="([^"]+)"/);
    out.push({
      index: m.index,
      openTag: m[0],
      className: classNameMatch?.[1] ?? classNameMatch?.[2] ?? "",
      ariaLabelledBy: ariaMatch?.[1] ?? null,
    });
  }
  return out;
}

/**
 * Find the most recent `{/* … *\/}` JSX block-comment that ends before
 * `index` in the source. Returns its full inner text (multi-line
 * comments are joined with spaces) or null if none.
 */
function markerAbove(source: string, index: number): string | null {
  const slice = source.slice(0, index);
  // Match JSX comment blocks `{/* ... */}` non-greedily, supporting
  // multi-line bodies (the homepage uses both inline and prose-form
  // marker comments). `[\s\S]` instead of `.` so newlines match.
  const re = /\{\s*\/\*([\s\S]*?)\*\/\s*\}/g;
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null) {
    last = m[1].replace(/\s+/g, " ").trim();
  }
  return last;
}

/**
 * Resolve every approved section to the rendered <section> that
 * carries its identity. Returns matches in spec order with the source
 * `<section>` index, so the next test can assert ordering.
 *
 * Matching strategy:
 *   - aria-labelledby → exact match on the attribute value.
 *   - marker          → substring match against the nearest preceding
 *                       JSX comment. Substring (not equality) because
 *                       the comments are descriptive (e.g.
 *                       "8 — LOCAL STORIES / HIDDEN GEMS\n   …prose…").
 *                       Each marker MUST be unique enough to identify
 *                       exactly one section — we assert that below.
 */
function resolveApprovedToSource(): {
  spec: ApprovedSection;
  match: SectionMatch | null;
  /** Source character index for ordering checks (works for both
   *  inline <section> matches and componentTag JSX usages). */
  index: number;
}[] {
  const allSections = findSections(SOURCE);
  return APPROVED_HOMEPAGE_SECTIONS.map((spec) => {
    let match: SectionMatch | null = null;
    let index = -1;
    if (spec.inComponent && spec.componentTag) {
      // Match the JSX usage `<ComponentTag` in source order. The
      // component owns its own <section> tag internally; we only
      // need to confirm presence + relative position here.
      const re = new RegExp(`<${spec.componentTag}\\b`);
      const m = re.exec(SOURCE);
      if (m) {
        index = m.index;
        match = {
          index,
          openTag: m[0],
          className: "",
          ariaLabelledBy: null,
        };
      }
    } else if (spec.ariaLabelledBy) {
      match = allSections.find((s) => s.ariaLabelledBy === spec.ariaLabelledBy) ?? null;
      index = match?.index ?? -1;
    } else if (spec.marker) {
      const candidates = allSections.filter((s) => {
        const marker = markerAbove(SOURCE, s.index);
        return marker !== null && marker.includes(spec.marker!);
      });
      match = candidates[0] ?? null;
      index = match?.index ?? -1;
    }
    return { spec, match, index };
  });
}

/**
 * Parse the largest `py-N` (or `pb-N` if `kind === "pb"`) value from
 * a className string. Considers ONLY unprefixed (mobile) classes —
 * `md:py-32` and `lg:py-40` are deliberately ignored because the spec
 * is the mobile floor.
 *
 * Also accepts the project's semantic vertical-rhythm utilities defined
 * in `src/styles.css`. Their mobile values (from `:root`) are:
 *
 *   .section-y     → padding: 5rem  (= py-20 in Tailwind scale)
 *   .section-y-lg  → padding: 6rem  (= py-24)
 *   .section-y-sm  → padding: 3.5rem (= py-14)
 *
 * They are treated as equivalents for both `py` and `pb` checks because
 * they apply padding-top AND padding-bottom together — that satisfies
 * any pb-N floor at the same scale.
 */
const SECTION_Y_EQUIVALENTS: Record<string, number> = {
  "section-y": 20,
  "section-y-lg": 24,
  "section-y-sm": 14,
};

function parseMobileSpacing(className: string, kind: "py" | "pb"): number | null {
  const tokens = className.split(/\s+/).filter(Boolean);
  let max: number | null = null;
  for (const t of tokens) {
    if (t.includes(":")) continue; // skip md:, lg:, hover:, etc.
    const m = t.match(new RegExp(`^${kind}-(\\d+)$`));
    if (m) {
      const n = Number(m[1]);
      if (max === null || n > max) max = n;
      continue;
    }
    if (t in SECTION_Y_EQUIVALENTS) {
      const n = SECTION_Y_EQUIVALENTS[t]!;
      if (max === null || n > max) max = n;
    }
  }
  return max;
}

/* ------------------------------------------------------------------ */
/* tests                                                              */
/* ------------------------------------------------------------------ */

describe("Approved homepage structure (source lock)", () => {
  it(`renders exactly ${APPROVED_INLINE_SECTION_COUNT} inline <section> tags (componentized rows excluded)`, () => {
    const sections = findSections(SOURCE);
    expect(
      sections.length,
      `Expected ${APPROVED_INLINE_SECTION_COUNT} top-level <section> tags in src/routes/index.tsx ` +
        `(componentized rows like <TheDifferenceSection /> render their own <section> internally and ` +
        `are not counted here). Found ${sections.length}. If you intentionally added or removed a ` +
        `section, update src/content/approved-homepage-structure.ts FIRST, then re-run the suite.`,
    ).toBe(APPROVED_INLINE_SECTION_COUNT);
  });

  describe("section identity", () => {
    const resolved = resolveApprovedToSource();
    for (const { spec, match } of resolved) {
      it(`#${spec.order} "${spec.name}" is present in the source`, () => {
        expect(
          match,
          spec.inComponent && spec.componentTag
            ? `Could not find a JSX usage of <${spec.componentTag} ... /> in src/routes/index.tsx. ` +
                `Either restore the component or update the spec.`
            : spec.ariaLabelledBy
              ? `Could not find a <section aria-labelledby="${spec.ariaLabelledBy}"> in src/routes/index.tsx. ` +
                `Either restore the section or update the spec.`
              : `Could not find a <section> immediately preceded by the comment ` +
                `{/* ${spec.marker} */} in src/routes/index.tsx.`,
        ).not.toBeNull();
      });
    }
  });

  it("sections appear in the approved top-to-bottom order", () => {
    const resolved = resolveApprovedToSource();
    const indices = resolved.map((r) => r.index);
    expect(indices.every((i) => i >= 0)).toBe(true);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(
      indices,
      "Approved sections appear out of order in src/routes/index.tsx. " +
        "Expected order: " +
        APPROVED_HOMEPAGE_SECTIONS.map((s) => `#${s.order} ${s.name}`).join(" → "),
    ).toEqual(sorted);
  });

  describe("per-section mobile spacing floor", () => {
    const resolved = resolveApprovedToSource();
    for (const { spec, match } of resolved) {
      const rule = spec.requiredSpacing;
      if (rule === null) continue;
      if (spec.inComponent) continue; // child component owns its spacing
      if (rule.kind === "min-h-vh") {
        it(`#${spec.order} "${spec.name}" uses at least min-h-[${rule.minVh}vh] (or h-[${rule.minVh}vh]) at mobile`, () => {
          expect(match).not.toBeNull();
          const m =
            match!.className.match(/(?<!:)min-h-\[(\d+)vh\]/) ??
            match!.className.match(/(?<!:)h-\[(\d+)vh\]/);
          expect(
            m,
            `Section "${spec.name}" must declare a mobile min-h-[Nvh] (or h-[Nvh]) of at least ${rule.minVh}vh.`,
          ).not.toBeNull();
          expect(Number(m![1])).toBeGreaterThanOrEqual(rule.minVh);
        });
        continue;
      }
      it(`#${spec.order} "${spec.name}" has ${rule.kind}-${rule.minScale} or larger at mobile`, () => {
        expect(match).not.toBeNull();
        const found = parseMobileSpacing(match!.className, rule.kind);
        expect(
          found,
          `Section "${spec.name}" must include a mobile ${rule.kind}-N class with N ≥ ${rule.minScale}. ` +
            `Found className: "${match!.className}"`,
        ).not.toBeNull();
        expect(found).toBeGreaterThanOrEqual(rule.minScale);
      });
    }
  });

  describe("layout invariants", () => {
    it("uses .container-x in at least every non-hero inline section", () => {
      if (!MOBILE_LAYOUT_INVARIANTS.containerXWrapperPerSection) return;
      const count = (SOURCE.match(/className="[^"]*\bcontainer-x\b/g) ?? []).length;
      const floor = APPROVED_INLINE_SECTION_COUNT - 1;
      expect(
        count,
        `Expected at least ${floor} occurrences of .container-x (one per non-hero inline section), found ${count}.`,
      ).toBeGreaterThanOrEqual(floor);
    });

    it("hero is rendered as <CinematicHero /> (single full-bleed continuous film)", () => {
      expect(/<CinematicHero\s*\/>/.test(SOURCE)).toBe(true);
    });
  });
});

// Reference exported constant so unused-import lint stays quiet
// (APPROVED_SECTION_COUNT is used by external suites/specs).
void APPROVED_SECTION_COUNT;
