/**
 * Applies the configurable MappingRules to a (scraped + AI-mapped) tour
 * to produce the final field values stored in `imported_tours`.
 *
 * Server-only. Never import from client code.
 */

import {
  DEFAULT_MAPPING_RULES,
  type FieldSource,
  type MappingRules,
} from "@/data/defaultMappingRules";
import { snapStop, STOP_COORDS, REGION_CENTROIDS, type StopCoord } from "@/data/stopCoords";

export type ScrapedFields = {
  title: string;
  durationText: string;
  url: string;
  priceFrom: number;
};

export type AIFields = {
  region: string;
  duration: string;
  highlights: string[];
  stops: string[];
};

function resolveSource(
  src: FieldSource,
  scraped: ScrapedFields,
  aiValue: string,
): string {
  switch (src.kind) {
    case "ai":
      return aiValue;
    case "constant":
      return src.value;
    case "scraped": {
      const v = scraped[src.field];
      return v == null ? "" : String(v);
    }
    case "keyword": {
      const haystack = `${scraped.title}\n${scraped.durationText}\n${scraped.url}`.toLowerCase();
      for (const { pattern, value } of src.patterns) {
        try {
          const re = new RegExp(pattern, "i");
          if (re.test(haystack)) return value;
        } catch {
          // bad regex from admin — ignore that pattern
        }
      }
      return src.fallback;
    }
  }
}

export function applyRules(
  rules: MappingRules | null | undefined,
  scraped: ScrapedFields,
  ai: AIFields,
): {
  region: string;
  duration: string;
  durationHours: string;
  signatureMoments: string[];
  stops: StopCoord[];
} {
  const r = rules ?? DEFAULT_MAPPING_RULES;

  const region = resolveSource(r.region, scraped, ai.region) || ai.region;
  const duration = resolveSource(r.duration, scraped, ai.duration) || ai.duration;
  const durationHours = resolveSource(r.durationHours, scraped, ai.duration);

  // Signature moments
  const rawHighlights =
    r.signatureMoments.source.kind === "ai"
      ? ai.highlights
      : [resolveSource(r.signatureMoments.source, scraped, ai.highlights.join(" "))];
  const remap = r.signatureMoments.remap ?? {};
  const signatureMoments = Array.from(
    new Set(
      rawHighlights
        .flatMap((h) => String(h).split(/[,\s]+/))
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean)
        .map((h) => remap[h] ?? h),
    ),
  );

  // Stops
  const stopRule = r.stops;
  const rawStops =
    stopRule.source.kind === "ai"
      ? ai.stops
      : (() => {
          const haystack = `${scraped.title}\n${scraped.durationText}`.toLowerCase();
          const matched: string[] = [];
          for (const { pattern, value } of stopRule.source.patterns) {
            try {
              if (new RegExp(pattern, "i").test(haystack)) matched.push(value);
            } catch {
              /* ignore */
            }
          }
          return matched;
        })();

  const overrides = stopRule.coordOverrides ?? {};
  const stops: StopCoord[] = [];
  rawStops.forEach((label, i) => {
    const key = String(label).toLowerCase().trim();
    const ov = overrides[key];
    if (ov) {
      stops.push({
        x: ov.x,
        y: ov.y,
        label: ov.label ?? label,
        tag: ov.tag ?? "Stop",
      });
      return;
    }
    if (STOP_COORDS[key] || stopRule.fallbackToRegionCentroid) {
      stops.push(snapStop(label, region, i));
    }
    // else: drop unknown stop entirely
  });

  // Enforce min / max bounds (if too few, top up from region centroid)
  while (stops.length < stopRule.minStops) {
    const c = REGION_CENTROIDS[region] ?? REGION_CENTROIDS.lisbon;
    stops.push({
      x: c.x + (stops.length - 2) * 0.6,
      y: c.y + (stops.length - 2) * 0.4,
      label: c.label,
      tag: "Stop",
    });
  }
  if (stops.length > stopRule.maxStops) stops.length = stopRule.maxStops;

  return { region, duration, durationHours, signatureMoments, stops };
}
