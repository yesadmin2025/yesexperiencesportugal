/**
 * Hover & focus motion contract — CTA + Card components.
 *
 * Locks the allowed-motion guardrail (Editorial v2 + brand guardrails):
 *   · CTAs/buttons/links and card wrappers may use a translate-Y lift
 *     on hover  (-translate-y-0.5 / -1 / -[2px] / -[3px]) — never scale.
 *   · `hover:scale-105+` on the CTA/card element itself is BANNED.
 *   · Image zoom (1.02–1.04) is allowed, but only on inner media via
 *     `group-hover:scale-[1.02..1.04]` on an <img>/figure, never on the
 *     button/anchor/card root.
 *   · Every interactive control must remain keyboard-reachable: it must
 *     either inherit the default focus-visible ring OR set its own
 *     `focus-visible:` styles. We assert no component disables focus
 *     outline without a replacement (`outline-none` / `focus:outline-none`
 *     without an accompanying `focus-visible:` rule on the same element).
 *
 * The scan is line-based: every line that opens a <button/<a/<Link/Card
 * tag is treated as the element root. We tokenise its className and
 * apply the rules above.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Files that contain CTA-like or card-like surfaces. Add new ones here
// as the design system grows.
const TARGETS = [
  "components/FAQ.tsx",
  "components/Footer.tsx",
  "components/Navbar.tsx",
  "components/MobileStickyCTA.tsx",
  "components/FloatingActions.tsx",
  "components/WhatsAppFab.tsx",
  "components/SignatureCarousel.tsx",
  "components/DecisionStepper.tsx",
  "components/SimpleTailorForm.tsx",
  "components/home/StudioLivePreview.tsx",
  "components/home/TheDifferenceSection.tsx",
  "components/builder/Choices.tsx",
  "components/builder/EntryScreen.tsx",
  "components/builder/TripTypeEntry.tsx",
  "components/builder/StickyBar.tsx",
  "components/builder/JourneyPanel.tsx",
  "components/builder/ReviewScreen.tsx",
  "components/ui/button.tsx",
  "components/ui/card.tsx",
  "routes/index.tsx",
  "routes/builder.tsx",
  "routes/contact.tsx",
  "routes/about.tsx",
];

// Tag openers that count as "interactive root" or "card root".
// We split source by lines, then look at the first-line tag opener
// followed by its className attribute on the same or following lines
// up to the closing `>`.
const ROOT_TAG_RE = /<(button|a|Link|NavLink|Card|CardHeader|CardContent|CardFooter)\b/;

interface RootChunk {
  file: string;
  startLine: number;
  tag: string;
  raw: string; // the full opening tag text (until first unescaped `>`)
}

function readSource(rel: string): string | null {
  try {
    return readFileSync(resolve(__dirname, "..", rel), "utf8");
  } catch {
    return null;
  }
}

/** Extract every interactive/card opening tag with its full attribute block. */
function extractRoots(file: string, src: string): RootChunk[] {
  const out: RootChunk[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(ROOT_TAG_RE);
    if (!m) continue;
    // Walk forward until we find the closing `>` of this opening tag.
    let raw = lines[i];
    let j = i;
    while (!/>(?!\=)/.test(raw.replace(/\/>/g, "/>"))) {
      j++;
      if (j >= lines.length) break;
      raw += "\n" + lines[j];
      if (j - i > 30) break; // safety
    }
    out.push({ file, startLine: i + 1, tag: m[1], raw });
  }
  return out;
}

/** Pull the className value from an opening tag. */
function classNameOf(raw: string): string {
  // Match className="..." OR className={`...`} OR className={cn(...)}.
  // We collect anything plausibly a class string.
  const parts: string[] = [];
  const dq = raw.match(/className="([^"]*)"/);
  if (dq) parts.push(dq[1]);
  const bt = raw.match(/className=\{`([^`]*)`\}/);
  if (bt) parts.push(bt[1]);
  // cn("...","..."): grab every quoted string inside the cn(...) call.
  const cn = raw.match(/className=\{cn\(([^)]*)\)\}/);
  if (cn) {
    const strings = cn[1].match(/"([^"]*)"|'([^']*)'/g) ?? [];
    parts.push(...strings.map((s) => s.slice(1, -1)));
  }
  return parts.join(" ");
}

// ─── Banned scale on hover for CTA/card root ─────────────────────────
describe("Hover motion contract — no scale-on-hover on CTA/card roots", () => {
  // hover:scale-105/110/125/150 on the *root* element.
  // Allowed exception: scale on an <img> inside a `group` parent
  // (group-hover:scale-[1.02..1.04]). That's the editorial image zoom.
  const BANNED_SCALE = /\bhover:scale-1(?:0[5-9]|[1-9]\d)\b/;

  for (const rel of TARGETS) {
    const src = readSource(rel);
    if (!src) continue;
    it(`${rel} — no hover:scale-* on interactive/card roots`, () => {
      const roots = extractRoots(rel, src);
      const offenders: string[] = [];
      for (const r of roots) {
        const cls = classNameOf(r.raw);
        if (BANNED_SCALE.test(cls)) {
          offenders.push(`${rel}:${r.startLine} <${r.tag}> → ${cls}`);
        }
      }
      expect(offenders, `Found scale-on-hover on CTA/card roots:\n${offenders.join("\n")}`).toEqual(
        [],
      );
    });
  }
});

// ─── translate-Y lift is the approved hover motion ───────────────────
describe("Hover motion contract — interactive lift uses translate-Y", () => {
  // If a CTA/card root opts into a hover transform at all, it must be
  // a translate-Y lift. We look for any `hover:` transform utility on
  // the root and require, when present, that it be translate-y.
  const HOVER_TRANSFORM = /\bhover:(?:translate-|rotate-|scale-|skew-)/;
  const ALLOWED_LIFT = /\bhover:-translate-y-(?:0\.5|1|1\.5|\[1px\]|\[2px\]|\[3px\])\b/;

  for (const rel of TARGETS) {
    const src = readSource(rel);
    if (!src) continue;
    it(`${rel} — hover transforms (when used) are translate-Y lifts`, () => {
      const roots = extractRoots(rel, src);
      const offenders: string[] = [];
      for (const r of roots) {
        const cls = classNameOf(r.raw);
        if (!HOVER_TRANSFORM.test(cls)) continue; // no hover transform → fine
        if (!ALLOWED_LIFT.test(cls)) {
          offenders.push(`${rel}:${r.startLine} <${r.tag}> → ${cls}`);
        }
      }
      expect(
        offenders,
        `Hover transform other than translate-Y lift:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});

// ─── Focus-visible contract ──────────────────────────────────────────
describe("Focus contract — no outline kill without focus-visible replacement", () => {
  // If an interactive root sets `outline-none` or `focus:outline-none`,
  // it MUST also define a `focus-visible:` style on the same element
  // (ring, outline, border, bg, etc.). Otherwise keyboard users lose
  // the focus indicator.
  const KILLS_OUTLINE = /\b(?:focus:)?outline-none\b/;
  const HAS_FOCUS_VISIBLE = /\bfocus-visible:/;

  for (const rel of TARGETS) {
    const src = readSource(rel);
    if (!src) continue;
    it(`${rel} — every outline-none has a focus-visible replacement`, () => {
      const roots = extractRoots(rel, src);
      const offenders: string[] = [];
      for (const r of roots) {
        // Skip non-interactive Card subparts (CardHeader/Content/Footer
        // are not focusable on their own).
        if (/^Card(Header|Content|Footer)$/.test(r.tag)) continue;
        const cls = classNameOf(r.raw);
        if (KILLS_OUTLINE.test(cls) && !HAS_FOCUS_VISIBLE.test(cls)) {
          offenders.push(`${rel}:${r.startLine} <${r.tag}> → ${cls}`);
        }
      }
      expect(
        offenders,
        `Interactive elements kill outline without focus-visible style:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});
