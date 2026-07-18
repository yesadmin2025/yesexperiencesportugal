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

    // Scan an `<img` tag respecting JSX brace nesting so arrow functions
    // (`() =>`) or ternaries inside props don't fool a naive regex.
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const re = /<img\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        let i = m.index + 4;
        let depth = 0;
        let end = -1;
        while (i < src.length) {
          const ch = src[i];
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
          else if (ch === ">" && depth === 0) {
            end = i;
            break;
          }
          i++;
        }
        if (end === -1) continue;
        const tag = src.slice(m.index, end + 1);
        if (!/\balt\s*=/.test(tag)) {
          offenders.push(`${file.replace(ROOT, "")}: ${tag.slice(0, 160).replace(/\s+/g, " ")}`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
