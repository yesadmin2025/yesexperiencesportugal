/**
 * Single source of truth for "what your day includes" across the Studio:
 * final reveal, checkout summary and guest details all call this.
 *
 * Derived from the resolved tour's verified inclusions, then narrowed to the
 * day the traveler actually composed:
 *  - general services (transport, guide, water, admission, lunch…) are kept;
 *  - place-specific items (a workshop, a tasting, a market) are kept only
 *    when the composed day still contains a matching stop;
 *  - anything closed on the chosen date is removed.
 * Never adds anything that is not already in the verified source list.
 */
import { isStopClosedOn } from "@/data/stopOperational";

const GENERAL =
  /\b(private|transport|transfer|vehicle|car|van|driver|guide|guided|water|snack|admission|entr(y|ance)|fee|tax|insurance|wi-?fi|pick-?up|drop-?off|parking|lunch|gratuit|toll|fuel)\b/i;

const WINE_ITEM = /\b(wine|tasting|winery|vineyard|moscatel)\b/i;
const WINE_STOP = /\b(wine|winery|vineyard|quinta|adega|cellar|herdade|fonseca|bacalh[oô]a|moscatel|wines)\b/i;

const STOP_WORDS = new Set([
  "workshop", "tasting", "visit", "tour", "private", "local", "with", "the", "and",
  "of", "de", "da", "do", "das", "dos", "experience", "included", "museum",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

export function composedDayInclusions(input: {
  readonly verified: readonly string[] | null | undefined;
  readonly stopLabels: readonly string[];
  readonly dates?: ReadonlyArray<string | null | undefined>;
}): string[] {
  const stopText = input.stopLabels.join(" | ");
  const stopTokens = new Set(input.stopLabels.flatMap(tokens));
  const hasWineStop = WINE_STOP.test(stopText);
  const dates = input.dates ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.verified ?? []) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    if (dates.some((d) => d && isStopClosedOn(item, d))) continue;
    let keep: boolean;
    if (WINE_ITEM.test(item)) keep = hasWineStop || tokens(item).some((t) => stopTokens.has(t));
    else if (GENERAL.test(item)) keep = true;
    else {
      const t = tokens(item);
      keep = t.length === 0 || t.some((x) => stopTokens.has(x) || stopText.toLowerCase().includes(x));
    }
    if (keep) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
