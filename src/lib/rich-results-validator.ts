/**
 * Local mirror of Google's Rich Results Test rules for the
 * Review + AggregateRating snippets:
 * https://developers.google.com/search/docs/appearance/structured-data/review-snippet
 * https://developers.google.com/search/docs/appearance/structured-data/product
 *
 * Used by the Vitest guard so schema regressions surface on every
 * build instead of after a Google recrawl. Errors mirror what the
 * hosted Rich Results Test flags as errors; warnings mirror its
 * "recommended fields" hints.
 */

/** Types Google accepts as the `itemReviewed` of a Review rich result. */
export const REVIEW_ALLOWED_ITEM_TYPES = new Set<string>([
  "Book",
  "Course",
  "CreativeWorkSeason",
  "CreativeWorkSeries",
  "Episode",
  "Event",
  "Game",
  "HowTo",
  "LocalBusiness",
  "MediaObject",
  "Movie",
  "MusicPlaylist",
  "MusicRecording",
  "Organization",
  "Product",
  "Recipe",
  "SoftwareApplication",
  // Organization subtypes we ship sitewide:
  "TravelAgency",
]);

export type RichResultsReport = {
  errors: string[];
  warnings: string[];
  counts: { reviews: number; aggregateRating: number };
};

type AnyNode = Record<string, unknown>;

function asObj(v: unknown): AnyNode | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as AnyNode) : null;
}

function typeOf(n: AnyNode | null): string | null {
  if (!n) return null;
  const t = n["@type"];
  return typeof t === "string" ? t : null;
}

function validateItemReviewed(prefix: string, itemReviewed: unknown, out: RichResultsReport) {
  const it = asObj(itemReviewed);
  if (!it) {
    out.errors.push(`${prefix}: itemReviewed missing (required)`);
    return;
  }
  const t = typeOf(it);
  if (!t || !REVIEW_ALLOWED_ITEM_TYPES.has(t)) {
    out.errors.push(
      `${prefix}: itemReviewed.@type '${t ?? "<missing>"}' is not a Google-supported Review target`,
    );
  }
  if (!it.name || typeof it.name !== "string") {
    out.warnings.push(`${prefix}: itemReviewed.name missing (Google recommends inline name)`);
  }
}

function validateReview(node: AnyNode, idx: number, out: RichResultsReport) {
  const tag = `Review[${idx}]`;
  // author — required, must have a name and Person|Organization type
  const author = asObj(node.author);
  if (!author) {
    out.errors.push(`${tag}: author missing (required)`);
  } else {
    if (!author.name || typeof author.name !== "string") {
      out.errors.push(`${tag}: author.name missing`);
    }
    const at = typeOf(author);
    if (at !== "Person" && at !== "Organization") {
      out.warnings.push(`${tag}: author.@type should be Person or Organization (got '${at}')`);
    }
    // nationality is optional; if present must have a name
    const nat = asObj(author.nationality);
    if (author.nationality !== undefined && (!nat || !nat.name)) {
      out.errors.push(`${tag}: author.nationality present but missing name`);
    }
  }

  validateItemReviewed(tag, node.itemReviewed, out);

  // reviewRating — required, ratingValue required and inside range
  const rr = asObj(node.reviewRating);
  if (!rr) {
    out.errors.push(`${tag}: reviewRating missing (required)`);
  } else {
    const rv = rr.ratingValue;
    const br = typeof rr.bestRating === "number" ? rr.bestRating : 5;
    const wr = typeof rr.worstRating === "number" ? rr.worstRating : 1;
    if (typeof rv !== "number") {
      out.errors.push(`${tag}: reviewRating.ratingValue missing or not numeric`);
    } else if (rv < wr || rv > br) {
      out.errors.push(`${tag}: reviewRating.ratingValue ${rv} outside [${wr}, ${br}]`);
    }
  }

  // datePublished — optional but must parse when present
  if (node.datePublished !== undefined) {
    const raw = node.datePublished;
    if (typeof raw !== "string" || raw.length < 10 || Number.isNaN(new Date(raw).getTime())) {
      out.errors.push(`${tag}: datePublished '${String(raw)}' is not a valid ISO-8601 date`);
    }
  } else {
    out.warnings.push(`${tag}: datePublished missing (recommended)`);
  }

  // url — recommended, must be absolute http(s) when present
  if (node.url !== undefined) {
    const u = node.url;
    if (typeof u !== "string" || !/^https?:\/\//i.test(u)) {
      out.errors.push(`${tag}: url '${String(u)}' is not an absolute http(s) URL`);
    }
  } else {
    out.warnings.push(`${tag}: url missing (recommended: link to canonical review page)`);
  }

  // reviewBody — recommended
  if (!node.reviewBody && !node.description) {
    out.warnings.push(`${tag}: reviewBody missing (recommended)`);
  }
}

function validateAggregate(node: AnyNode, out: RichResultsReport) {
  const tag = "AggregateRating";
  validateItemReviewed(tag, node.itemReviewed, out);

  if (typeof node.ratingValue !== "number") {
    out.errors.push(`${tag}: ratingValue missing or not numeric`);
  } else {
    const br = typeof node.bestRating === "number" ? node.bestRating : 5;
    const wr = typeof node.worstRating === "number" ? node.worstRating : 1;
    if (node.ratingValue < wr || node.ratingValue > br) {
      out.errors.push(`${tag}: ratingValue ${node.ratingValue} outside [${wr}, ${br}]`);
    }
  }

  const rc = node.reviewCount;
  const rcount = node.ratingCount;
  const hasCount = typeof rc === "number" || typeof rcount === "number";
  if (!hasCount) {
    out.errors.push(`${tag}: reviewCount or ratingCount required`);
  } else if (typeof rc === "number" && rc < 1) {
    out.errors.push(`${tag}: reviewCount must be >= 1`);
  }
}

/** Run the Google Rich Results checks against a parsed JSON-LD payload. */
export function validateRichResults(payload: unknown): RichResultsReport {
  const out: RichResultsReport = {
    errors: [],
    warnings: [],
    counts: { reviews: 0, aggregateRating: 0 },
  };

  const root = asObj(payload);
  if (!root) {
    out.errors.push("payload: not a JSON-LD object");
    return out;
  }

  const graphRaw = root["@graph"];
  const graph = Array.isArray(graphRaw) ? graphRaw : [root];

  for (const raw of graph) {
    const n = asObj(raw);
    if (!n) continue;
    const t = typeOf(n);
    if (t === "Review") {
      validateReview(n, out.counts.reviews, out);
      out.counts.reviews += 1;
    } else if (t === "AggregateRating") {
      validateAggregate(n, out);
      out.counts.aggregateRating += 1;
    }
  }

  return out;
}
