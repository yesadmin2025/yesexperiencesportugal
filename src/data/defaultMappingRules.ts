/**
 * Configurable mapping rules for the tour importer.
 *
 * These rules describe HOW each builder field should be populated from the
 * scraped + AI-mapped tour data. Admins can override them per source format
 * (different sites, or YES experiences if their HTML changes).
 */

export type FieldSource =
  // Use what the AI mapper returned
  | { kind: "ai" }
  // Use the scraped string from the source HTML (e.g. durationText)
  | { kind: "scraped"; field: ScrapedField }
  // Apply keyword regex over title + scraped duration text + URL
  | {
      kind: "keyword";
      // ordered list of [pattern, value] — first match wins
      patterns: { pattern: string; value: string }[];
      // value when nothing matches
      fallback: string;
    }
  // Constant value
  | { kind: "constant"; value: string };

export type ScrapedField = "title" | "durationText" | "url" | "priceFrom";

export type StopRule = {
  // Where to source raw stop labels
  source: { kind: "ai" } | { kind: "keyword"; patterns: { pattern: string; value: string }[] };
  // Optional curated label → coordinate overrides (merged on top of stopCoords.ts)
  coordOverrides: Record<string, { x: number; y: number; label?: string; tag?: string }>;
  // Whether unknown labels fall back to the region centroid (else they are dropped)
  fallbackToRegionCentroid: boolean;
  // Min / max number of stops to keep per tour
  minStops: number;
  maxStops: number;
};

export type SignatureMomentRule = {
  // Where to source highlight chips ("livramento", "boat", …)
  source: FieldSource;
  // Optional remap: e.g. AI returns "boat-ride", we store "boat"
  remap: Record<string, string>;
};

export type MappingRules = {
  region: FieldSource;
  duration: FieldSource;
  durationHours: FieldSource;
  signatureMoments: SignatureMomentRule;
  stops: StopRule;
};

export const DEFAULT_MAPPING_RULES: MappingRules = {
  region: { kind: "ai" },
  duration: { kind: "ai" },
  // Prefer the human "8-9 hours" string from the page when present, else AI
  durationHours: { kind: "scraped", field: "durationText" },
  signatureMoments: {
    source: { kind: "ai" },
    remap: {
      "boat-ride": "boat",
      "boat ride": "boat",
      "wine-tasting": "tasting",
      "wine tasting": "tasting",
      "4x4": "jeep",
      "4×4": "jeep",
    },
  },
  stops: {
    source: { kind: "ai" },
    coordOverrides: {},
    fallbackToRegionCentroid: true,
    minStops: 3,
    maxStops: 6,
  },
};

/* -------------- Runtime guards -------------- */

export function isMappingRules(v: unknown): v is MappingRules {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<MappingRules>;
  return !!(r.region && r.duration && r.durationHours && r.signatureMoments && r.stops);
}

export function safeParseRules(input: unknown): MappingRules {
  if (isMappingRules(input)) return input;
  return DEFAULT_MAPPING_RULES;
}
