/**
 * Single source of truth for "what your day includes" across the Studio:
 * final reveal, checkout summary and guest details all call this.
 *
 * Derived from the resolved tour's verified inclusions, then narrowed to the
 * day the traveler actually composed:
 *  - general services (transport, guide, water…) are kept;
 *  - place-specific items (a workshop, a tasting, a market) are kept only
 *    when the composed day still contains a matching stop;
 *  - anything closed on the chosen date is removed.
 * Never adds anything that is not already in the verified source list.
 */
import { isStopClosedOn } from "@/data/stopOperational";

const GENERAL =
  /\b(private|transport|transfer|vehicle|car|van|driver|guide|guided|water|snack|tax|insurance|wi-?fi|pick-?up|drop-?off|parking|gratuit|toll|fuel)\b/i;

const WINE_ITEM = /\b(wines?|winery|wineries|vineyard|moscatel)\b/i;
const WINE_STOP = /\b(wines?|winery|wineries|vineyard|quinta|adega|cellar|herdade|fonseca|bacalh[oô]a|moscatel)\b/i;

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
  const wineStops = [...new Set(input.stopLabels.filter((label) => WINE_STOP.test(label)))];
  const dates = input.dates ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  // A shared village name is not proof of an activity (Azeitão tile factory
  // must not match a lunch in Azeitão). Match most distinctive item words.
  const matchesActivity = (item: string) => {
    const words = tokens(item);
    return words.length > 0 && words.filter((word) => stopTokens.has(word)).length >= Math.ceil(words.length * 0.67);
  };
  for (const raw of input.verified ?? []) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    if (dates.some((d) => d && isStopClosedOn(item, d))) continue;
    let keep: boolean;
    if (/\blunch\b/i.test(item)) {
      keep = /\blunch\b/i.test(stopText) && (tokens(item).length === 1 || matchesActivity(item));
    } else if (WINE_ITEM.test(item)) {
      const count = item.match(/\b(\d+|one|two|three|four)\s+(?:selected\s+|family\s+|regional\s+)*(?:wineries|winery|vineyards?)\b/i)?.[1]?.toLowerCase();
      const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
      const required = count ? (words[count] ?? Number(count)) : 1;
      // A retained winery cannot substantiate two winery visits, or a named
      // venue's activity when that venue was removed. Generic tasting copy
      // remains valid for the verified regional winery alternatives.
      const names = tokens(item).filter((word) => !/^(wine|wines|winery|wineries|vineyard|vineyards|moscatel|tastings|family|selected|regional|visits|guided|multiple|roman|style|throughout|one|two|three|four)$/.test(word));
      keep = wineStops.length >= required && names.every((word) => stopTokens.has(word));
    }
    else if (/\b(workshop|market|admission|entr(y|ance)|tickets?)\b/i.test(item)) keep = matchesActivity(item);
    else if (GENERAL.test(item)) keep = true;
    else {
      keep = matchesActivity(item);
    }
    if (keep) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
