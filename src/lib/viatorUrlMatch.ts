/**
 * Local guard that warns when a pasted Viator URL doesn't look like the tour
 * the admin selected. Runs entirely client-side BEFORE any fetch — cheap, no
 * network, no AI. We never block the action, only surface a warning so the
 * admin can confirm or correct.
 *
 * Match heuristic:
 *  1. URL must be a viator.com tour link (host + /tours/ path).
 *  2. We extract the slug part of the path (the title-encoded segment) and
 *     normalize it to lowercase ascii words.
 *  3. We build a set of expected keywords from the tour id + title and check
 *     overlap. >=2 hits = strong match. 1 hit = weak. 0 = mismatch.
 */

export type UrlMatchResult =
  | { kind: "ok"; productCode: string | null; matchedKeywords: string[] }
  | { kind: "weak"; productCode: string | null; matchedKeywords: string[]; expected: string[] }
  | { kind: "mismatch"; productCode: string | null; expected: string[] }
  | { kind: "invalid"; reason: string };

const VIATOR_RE = /^https?:\/\/(www\.)?viator\.com\/.+/i;
const PRODUCT_CODE_RE = /\/d\d+-\d+(?:P\d+)?(?:[/?#]|$)/i;

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "tour",
  "tours",
  "private",
  "small",
  "group",
  "day",
  "half",
  "full",
  "in",
  "of",
  "to",
  "a",
  "an",
  "at",
  "by",
  "for",
  "experience",
  "trip",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Build the keyword set we expect to see in the Viator slug for a given
 * tour. We mix the id (slug-cased) with the human title so e.g.
 * "fatima-nazare-obidos" → ["fatima","nazare","obidos"] and the title adds
 * "sanctuary","coast" etc. as supporting hits.
 */
export function expectedKeywordsFor(tourId: string, title: string): string[] {
  const set = new Set<string>([...tokenize(tourId), ...tokenize(title)]);
  // A handful of Viator-specific aliases — Viator slugs use English place
  // names, ours sometimes use Portuguese.
  const aliasMap: Record<string, string[]> = {
    setubal: ["setubal", "arrabida"],
    arrabida: ["arrabida", "setubal"],
    azeitao: ["azeitao", "setubal"],
    sesimbra: ["sesimbra"],
    sintra: ["sintra"],
    cascais: ["cascais"],
    troia: ["troia", "comporta"],
    comporta: ["comporta", "troia"],
    evora: ["evora", "alentejo"],
    alentejo: ["alentejo", "evora"],
    fatima: ["fatima"],
    nazare: ["nazare"],
    obidos: ["obidos"],
    tomar: ["tomar"],
    coimbra: ["coimbra"],
    tiles: ["tile", "tiles", "azulejo", "azulejos"],
  };
  for (const k of Array.from(set)) {
    for (const alias of aliasMap[k] ?? []) set.add(alias);
  }
  return Array.from(set);
}

export function checkViatorUrlMatchesTour(
  url: string,
  tourId: string,
  title: string,
): UrlMatchResult {
  const trimmed = url.trim();
  if (!trimmed) return { kind: "invalid", reason: "URL is empty" };
  if (!VIATOR_RE.test(trimmed)) return { kind: "invalid", reason: "Not a viator.com URL" };

  let pathname: string;
  try {
    pathname = new URL(trimmed).pathname;
  } catch {
    return { kind: "invalid", reason: "Malformed URL" };
  }

  if (!/\/tours?\//i.test(pathname))
    return { kind: "invalid", reason: "Not a Viator tour link (missing /tours/)" };

  const productMatch = pathname.match(/d(\d+)-(\d+)(P\d+)?/i);
  const productCode = productMatch ? productMatch[0] : null;

  const slugWords = new Set(tokenize(pathname));
  const expected = expectedKeywordsFor(tourId, title);
  const matched = expected.filter((k) => slugWords.has(k));

  if (matched.length >= 2) return { kind: "ok", productCode, matchedKeywords: matched };
  if (matched.length === 1)
    return { kind: "weak", productCode, matchedKeywords: matched, expected };
  return { kind: "mismatch", productCode, expected };
}
