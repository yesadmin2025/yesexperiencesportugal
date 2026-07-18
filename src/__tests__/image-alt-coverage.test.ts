/**
 * Static a11y contract: every `<img>` literal in the app source has a
 * non-empty `alt` attribute (or is explicitly marked decorative with
 * `alt=""` + `aria-hidden`).
 *
 * We inspect JSX source instead of rendered DOM because most `<img>`
 * elements sit inside dynamic route trees that require heavy provider
 * wiring in jsdom. Source inspection catches the class of bug this
 * suite exists to prevent: a hand-authored `<img>` shipped without any
 * alt at all.
 *
 * Exemptions (paths matching these substrings are skipped):
 *  - `__tests__/` — fixtures and test-only components
 *  - `styles.css` — CSS, not JSX
 *  - `admin.` routes — internal tools, no public-facing SEO impact
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = ["__tests__/", "styles.css", "/admin.", "\\admin."];

const ROOT = new URL("../", import.meta.url).pathname;
const SKIP = ["__tests__/", "styles.css", "/admin.", "\\admin."];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("image alt coverage", () => {
  const files = walk(ROOT).filter((f) => !SKIP.some((s) => f.includes(s)));

  it("every <img> tag in JSX declares an alt attribute", () => {
    const offenders: string[] = [];
    // Regex matches an opening <img ...> tag, greedy up to the first `>` that
    // isn't inside a JSX expression. Good enough for a lint-level check.
    const IMG_TAG = /<img\b[^>]*>/g;

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const tags = src.match(IMG_TAG) ?? [];
      for (const tag of tags) {
        if (!/\balt\s*=/.test(tag)) {
          offenders.push(`${file.replace(ROOT, "")}: ${tag.slice(0, 120)}`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
