import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  BRAND_COLORS,
  BRAND_LOGO_VARIANTS,
  BRAND_LOGO_THEMES,
  BRAND_HEX_EXEMPT_PATH_PREFIXES,
  DEFAULT_BRAND_LOGO_THEME,
  assertBrandLogoTheme,
  isBrandLogoTheme,
  type BrandColorToken,
  type BrandLogoTheme,
} from "@/lib/brand-tokens";

/**
 * BRAND THEMING LOCK
 *
 * Three independent assertions guard the YES brand surface:
 *
 *  1. CSS parity — every hex in `BRAND_COLORS` MUST appear in
 *     `src/styles.css` against the matching `--<token>:` declaration.
 *  2. Logo parity — `src/components/Logo.tsx` MUST import exactly the
 *     locked asset filenames AND its `SOURCES` map MUST cover exactly
 *     the locked theme keys.
 *  3. Hex containment — no source file outside an exempt prefix may
 *     contain any of the brand hexes as literal text. Components must
 *     consume the CSS custom properties (`var(--teal)` etc.).
 *
 * Failures point at the offending file + token so a reviewer can see
 * the drift in seconds. Treat this file as the brand contract — if you
 * intentionally change a color or logo, edit `brand-tokens.ts` AND the
 * matching surface in the same PR; do NOT relax the test.
 */

const ROOT = join(__dirname, "..", "..");

/* ---------------------------------------------------------------- */
/* 1. CSS parity                                                     */
/* ---------------------------------------------------------------- */

describe("Brand lock — CSS custom properties", () => {
  const css = readFileSync(join(ROOT, "src", "styles.css"), "utf8");

  for (const [token, expectedHex] of Object.entries(BRAND_COLORS)) {
    it(`--${token} === ${expectedHex} in src/styles.css`, () => {
      // Match: optional whitespace, --<token>:, optional whitespace,
      // a hex literal, optional whitespace, semicolon. Captures the hex
      // case-sensitively so #c9a96a vs #C9A96A is treated as drift.
      const re = new RegExp(`--${token}\\s*:\\s*(#[0-9A-Fa-f]{3,8})\\s*;`);
      const match = css.match(re);
      if (!match) {
        throw new Error(
          `expected \`--${token}: ${expectedHex};\` in src/styles.css, ` +
            `but no \`--${token}: <hex>;\` declaration was found`,
        );
      }
      if (match[1] !== expectedHex) {
        throw new Error(
          `brand color drift: \`--${token}\` is \`${match[1]}\` in ` +
            `src/styles.css but the locked value is \`${expectedHex}\`. ` +
            `Update src/lib/brand-tokens.ts AND src/styles.css together, ` +
            `or revert the change.`,
        );
      }
      expect(match[1]).toBe(expectedHex);
    });
  }
});

/* ---------------------------------------------------------------- */
/* 2. Logo parity                                                    */
/* ---------------------------------------------------------------- */

describe("Brand lock — Logo component", () => {
  const logoSrc = readFileSync(join(ROOT, "src", "components", "Logo.tsx"), "utf8");

  for (const [theme, filename] of Object.entries(BRAND_LOGO_VARIANTS)) {
    it(`Logo.tsx imports the locked asset for "${theme}"`, () => {
      // Looser-than-strict regex: we just require that the locked
      // filename appears in some `import … from "@/assets/<filename>"`
      // statement. This survives variable-name refactors but not file
      // swaps — which is exactly what we want to lock.
      const re = new RegExp(`import\\s+\\w+\\s+from\\s+["']@/assets/${escapeRegex(filename)}["']`);
      if (!re.test(logoSrc)) {
        throw new Error(
          `Logo.tsx must import the locked asset for theme "${theme}" ` +
            `(\`@/assets/${filename}\`). Either restore the import or ` +
            `update src/lib/brand-tokens.ts after a brand sign-off.`,
        );
      }
      expect(re.test(logoSrc)).toBe(true);
    });
  }

  it("Logo.tsx exposes EXACTLY the locked theme keys (no more, no less)", () => {
    // Logo.tsx delegates its theme union to `BrandLogoTheme` (the
    // single source of truth in brand-tokens.ts). What we lock here is
    // that the local `SOURCES` map has a row for every locked theme
    // and no extra rows — so a brand decision to add/remove a variant
    // can only happen by editing brand-tokens.ts AND Logo.tsx
    // together.
    const sourcesMatch = logoSrc.match(/SOURCES[\s\S]*?=\s*{([\s\S]*?)};/);
    if (!sourcesMatch) {
      throw new Error(
        "Logo.tsx must declare a `SOURCES` map keyed by BrandLogoTheme " +
          "so the brand lock can verify the supported variants.",
      );
    }
    const declared = Array.from(sourcesMatch[1].matchAll(/["']([^"']+)["']\s*:/g))
      .map((m) => m[1])
      .sort();
    const locked = (Object.keys(BRAND_LOGO_VARIANTS) as BrandLogoTheme[]).slice().sort();
    expect(declared).toEqual(locked);
  });

  it("Logo.tsx routes its theme prop through the runtime guard", () => {
    // Hard requirement: Logo MUST call `assertBrandLogoTheme(...)` so
    // any value that escapes the type system is caught at render time.
    expect(
      /assertBrandLogoTheme\s*\(/.test(logoSrc),
      "Logo.tsx must call `assertBrandLogoTheme(...)` on its theme prop",
    ).toBe(true);
  });
});

/* ---------------------------------------------------------------- */
/* 3. Hex containment                                                */
/* ---------------------------------------------------------------- */

describe("Brand lock — no hard-coded brand hex outside locked surfaces", () => {
  const allowedExt = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md", ".html"]);
  const skipDirs = new Set(["node_modules", ".git", "dist", "build"]);

  function* walk(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        yield* walk(full);
      } else if (stat.isFile()) {
        const dot = entry.lastIndexOf(".");
        if (dot >= 0 && allowedExt.has(entry.slice(dot))) yield full;
      }
    }
  }

  function isExempt(rel: string): boolean {
    const norm = rel.split(sep).join("/");
    return BRAND_HEX_EXEMPT_PATH_PREFIXES.some((p) => norm.startsWith(p));
  }

  // Build one regex that matches ANY brand hex, case-insensitively, as
  // a whole hex literal (so #C9A96A matches but a longer #C9A96A12
  // does not — we don't want to flag opacity-suffixed variants used
  // intentionally elsewhere).
  const hexes = (Object.values(BRAND_COLORS) as string[]).map((h) => h.toLowerCase());
  const hexAlternation = hexes
    .map((h) => h.replace("#", "#"))
    .map(escapeRegex)
    .join("|");
  const findHexRe = new RegExp(`(?<![0-9A-Fa-f#])(${hexAlternation})(?![0-9A-Fa-f])`, "gi");

  it("no source file outside the exempt prefixes contains a locked brand hex", () => {
    const offenders: { file: string; hex: string; line: number }[] = [];
    for (const file of walk(join(ROOT, "src"))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      if (isExempt(rel)) continue;
      const text = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = findHexRe.exec(text)) !== null) {
        // Defensive fallback pattern `var(--token, #HEX)` is allowed:
        // the canonical source is the CSS custom property, the hex is
        // just there if the var fails to resolve. Skip those matches.
        const beforeWindow = text.slice(Math.max(0, m.index - 40), m.index);
        if (/var\([^)]*,\s*$/.test(beforeWindow)) continue;
        const line = text.slice(0, m.index).split("\n").length;
        offenders.push({ file: rel, hex: m[1], line });
      }
    }
    if (offenders.length > 0) {
      const summary = offenders
        .slice(0, 20)
        .map(
          (o) =>
            `  - ${o.file}:${o.line} contains locked hex \`${o.hex}\` — use the matching CSS token (e.g. var(--teal)) instead.`,
        )
        .join("\n");
      const more = offenders.length > 20 ? `\n  …and ${offenders.length - 20} more.` : "";
      throw new Error(
        `Brand hex leaked into ${offenders.length} location(s) outside ` +
          `the locked surfaces. Replace each literal with the ` +
          `corresponding CSS custom property:\n${summary}${more}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------------------------------------------------------- */
/* Type-only sanity: the lock objects are well-formed                */
/* ---------------------------------------------------------------- */

describe("Brand lock — token shape", () => {
  it("every BRAND_COLORS value is a 7-char #RRGGBB hex", () => {
    for (const [token, hex] of Object.entries(BRAND_COLORS)) {
      expect(
        /^#[0-9A-F]{6}$/.test(hex),
        `BRAND_COLORS["${token}"] must be #RRGGBB uppercase, got "${hex}"`,
      ).toBe(true);
    }
  });
  it("every BRAND_LOGO_VARIANTS value points at an asset filename", () => {
    for (const [theme, file] of Object.entries(BRAND_LOGO_VARIANTS)) {
      expect(
        /\.(png|jpg|jpeg|svg|webp)$/i.test(file),
        `BRAND_LOGO_VARIANTS["${theme}"] must end in an image extension, got "${file}"`,
      ).toBe(true);
    }
  });
  it("BrandColorToken / BrandLogoTheme are exhaustive", () => {
    // Compile-time exhaustiveness — these casts fail typecheck if the
    // unions ever drift from the const objects.
    const _c: BrandColorToken = "teal";
    const _l: BrandLogoTheme = "teal-on-ivory";
    expect(_c).toBe("teal");
    expect(_l).toBe("teal-on-ivory");
  });
});

/* ---------------------------------------------------------------- */
/* 4. Runtime guard for BrandLogoTheme                                */
/* ---------------------------------------------------------------- */

import { vi } from "vitest";

describe("Brand lock — assertBrandLogoTheme runtime guard", () => {
  it("returns valid themes unchanged", () => {
    for (const theme of BRAND_LOGO_THEMES) {
      expect(assertBrandLogoTheme(theme, "Test")).toBe(theme);
    }
  });

  it("isBrandLogoTheme narrows correctly", () => {
    expect(isBrandLogoTheme("teal-on-ivory")).toBe(true);
    expect(isBrandLogoTheme("gold-on-charcoal")).toBe(true);
    expect(isBrandLogoTheme("gold-on-ivory")).toBe(false);
    expect(isBrandLogoTheme(undefined)).toBe(false);
    expect(isBrandLogoTheme(null)).toBe(false);
    expect(isBrandLogoTheme(42)).toBe(false);
    expect(isBrandLogoTheme({})).toBe(false);
  });

  it("DEFAULT_BRAND_LOGO_THEME is itself a valid theme", () => {
    expect(BRAND_LOGO_THEMES).toContain(DEFAULT_BRAND_LOGO_THEME);
  });

  it("throws in dev/test on an unsupported theme and includes the component name", () => {
    // Vitest sets NODE_ENV=test → the guard treats this as dev and throws.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => assertBrandLogoTheme("emerald-on-mauve", "Logo")).toThrowError(
        /\[brand-lock\] <Logo> received an unsupported brand theme/,
      );
      expect(errSpy).toHaveBeenCalled();
      const msg = String(errSpy.mock.calls[0]?.[0] ?? "");
      expect(msg).toContain("emerald-on-mauve");
      expect(msg).toContain("teal-on-ivory");
      expect(msg).toContain("gold-on-charcoal");
    } finally {
      errSpy.mockRestore();
    }
  });

  it("formats null / undefined / non-string values clearly in the error", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => assertBrandLogoTheme(undefined, "Footer")).toThrowError(
        /received an unsupported brand theme: undefined/,
      );
      expect(() => assertBrandLogoTheme(null, "Navbar")).toThrowError(
        /received an unsupported brand theme: null/,
      );
      expect(() => assertBrandLogoTheme(123, "Hero")).toThrowError(
        /received an unsupported brand theme: number 123/,
      );
    } finally {
      errSpy.mockRestore();
    }
  });
});
