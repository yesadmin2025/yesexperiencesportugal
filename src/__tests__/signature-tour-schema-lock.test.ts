import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Schema lock for `SignatureTour`.
 *
 * Purpose: force any NEW content-shaped field (things a UI would render
 * as body copy — overview, highlights, included, itinerary, and any
 * synonym like `summary`, `description`, `inclusions`, `program`,
 * `schedule`, `agenda`, `about`, `whatsIncluded`, `notIncluded`, …) to
 * be added to the Source of Truth (`signatureToursSourceOfTruth.ts`)
 * and exposed via `getTourContent(tourId)` — NOT bolted directly onto
 * `SignatureTour`.
 *
 * Two guards:
 *  1. LOCKED_KEYS — the frozen set of top-level `SignatureTour` keys.
 *     Adding or renaming a key fails the test. If the change is
 *     legitimate and NOT content-shaped (e.g. a new logistical flag),
 *     add the key here in the same PR.
 *  2. CONTENT_LIKE_KEY_RE — even if you update LOCKED_KEYS, any key
 *     whose name matches this pattern is rejected outright. Route it
 *     through SoT + `getTourContent` instead.
 */

const TYPE_FILE = path.resolve(__dirname, "../data/signatureTours.ts");

const LOCKED_KEYS: string[] = [
  "id",
  "title",
  "region",
  "duration",
  "durationHours",
  "priceFrom",
  "theme",
  "blurb",
  "intro",
  "contextParagraph",
  "contextLink",
  "fitsBest",
  "pace",
  "stops",
  "highlights",
  "included",
  "idealFor",
  "notes",
  "img",
  "focal",
  "gallery",
  "bookingUrl",
  "tripadvisorUrl",
  "seed",
  "seoTitle",
  "seoDescription",
  "ptReady",
  "i18n",
  "wineriesRule",
];

// Names that look like body-content the UI would render.
// Includes the legacy 4 (already locked and being migrated) plus
// common synonyms a future engineer might reach for.
const CONTENT_LIKE_KEY_RE =
  /^(overview|summary|description|about|body|story|copy|narrative|content|highlights?|included|inclusions|not[_-]?included|exclusions|itinerary|itenerary|schedule|program|programme|agenda|chapters?|stages?|steps?|whats?[_-]?included|whats?[_-]?not[_-]?included|whats?[_-]?on|activities|experiences?)$/i;

// Names that were grandfathered into the schema. They are still allowed
// but MUST continue to be read through getTourContent(tourId).
// Any NEW content-like key is rejected — no additions here.
const CONTENT_LIKE_ALLOWLIST = new Set([
  "overview", // not currently on SignatureTour but reserved
  "highlights",
  "included",
  "itinerary", // not on SignatureTour today; kept reserved
  "stops", // structural, but named-similar — grandfathered
  "notes", // owner-authored operational notes, not body copy
]);

function extractSignatureTourKeys(): string[] {
  const src = readFileSync(TYPE_FILE, "utf8");
  const startRe = /export\s+type\s+SignatureTour\s*=\s*\{/;
  const startMatch = startRe.exec(src);
  if (!startMatch) throw new Error("SignatureTour type not found in signatureTours.ts");
  let i = startMatch.index + startMatch[0].length;
  let depth = 1;
  let body = "";
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
    body += ch;
    i++;
  }

  // Strip block comments, line comments, and string literals so their
  // contents can't masquerade as keys.
  const cleaned = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\n)\s*\/\/[^\n]*/g, "$1")
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

  // Split on top-level `;` / `,` — but SignatureTour uses `;` per line.
  // Match `<optional-whitespace>identifier<optional ?>:` at depth-0.
  const keys: string[] = [];
  let d = 0;
  let lineStart = 0;
  const push = (chunk: string) => {
    const m = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:/.exec(chunk);
    if (m) keys.push(m[1]);
  };
  for (let j = 0; j < cleaned.length; j++) {
    const ch = cleaned[j];
    if (ch === "{" || ch === "(" || ch === "[" || ch === "<") d++;
    else if (ch === "}" || ch === ")" || ch === "]" || ch === ">") d--;
    else if ((ch === ";" || ch === ",") && d === 0) {
      push(cleaned.slice(lineStart, j));
      lineStart = j + 1;
    }
  }
  push(cleaned.slice(lineStart));
  return keys;
}

describe("SignatureTour — content-key schema lock", () => {
  const actualKeys = extractSignatureTourKeys();

  it("has exactly the locked set of top-level keys (no additions or renames)", () => {
    const actual = [...actualKeys].sort();
    const locked = [...LOCKED_KEYS].sort();
    const added = actual.filter((k) => !locked.includes(k));
    const removed = locked.filter((k) => !actual.includes(k));
    if (added.length || removed.length) {
      throw new Error(
        "SignatureTour schema drift detected.\n" +
          (added.length ? `  + added:   ${added.join(", ")}\n` : "") +
          (removed.length ? `  - removed: ${removed.join(", ")}\n` : "") +
          "\nContent-shaped keys MUST go into SoT " +
          "(src/data/signatureToursSourceOfTruth.ts) and be read via " +
          "getTourContent(tourId). If the new key is genuinely structural " +
          "(logistical flag, id, URL, price knob, etc.), update LOCKED_KEYS " +
          "in this test in the same PR.",
      );
    }
    expect(actual).toEqual(locked);
  });

  it("rejects any content-shaped key that is not on the grandfathered allowlist", () => {
    const offenders = actualKeys.filter(
      (k) => CONTENT_LIKE_KEY_RE.test(k) && !CONTENT_LIKE_ALLOWLIST.has(k),
    );
    if (offenders.length) {
      throw new Error(
        `Content-shaped keys added directly to SignatureTour: ${offenders.join(", ")}\n` +
          "Move them into SignatureSourceOfTruth (src/data/signatureToursSourceOfTruth.ts) " +
          "and expose them through getTourContent(tourId) so every UI consumer reads " +
          "Viator-verified truth by default.",
      );
    }
    expect(offenders).toEqual([]);
  });
});
