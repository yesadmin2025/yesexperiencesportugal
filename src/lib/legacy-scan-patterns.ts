/**
 * Shared regex patterns for scanning source + data for legacy
 * references. Kept in a browser-safe module so the admin page can
 * import it directly.
 */

export type LegacyCategory =
  | "legacy-domain"
  | "legacy-booking"
  | "gbp-place-id"
  | "gbp-url"
  | "gsc-url";

export type LegacyPattern = {
  id: string;
  label: string;
  category: LegacyCategory;
  regex: string;
  flags: string;
};

export const LEGACY_PATTERNS: LegacyPattern[] = [
  {
    id: "legacy-domain",
    label: "yesexperiences.pt (legacy domain)",
    category: "legacy-domain",
    regex: String.raw`\b(?:www\.)?yesexperiences\.pt\b`,
    flags: "gi",
  },
  {
    id: "legacy-booking-path",
    label: "legacy booking URL (yesexperiences.pt/booking|checkout|reserve)",
    category: "legacy-booking",
    regex: String.raw`yesexperiences\.pt/(?:booking|checkout|reserve|book)[^"'\s)]*`,
    flags: "gi",
  },
  {
    id: "gbp-place-id",
    label: "Google Place ID (ChIJ…)",
    category: "gbp-place-id",
    regex: String.raw`\bChIJ[A-Za-z0-9_\-]{20,}\b`,
    flags: "g",
  },
  {
    id: "gbp-cid",
    label: "Google Maps CID param",
    category: "gbp-place-id",
    regex: String.raw`[?&]cid=\d{10,}`,
    flags: "gi",
  },
  {
    id: "gbp-place-id-param",
    label: "place_id query param",
    category: "gbp-place-id",
    regex: String.raw`[?&]place_id=[A-Za-z0-9_\-:]+`,
    flags: "gi",
  },
  {
    id: "gbp-url",
    label: "Google Business Profile URL",
    category: "gbp-url",
    regex: String.raw`\b(?:business\.google\.com|posts\.gle|g\.page|google\.com/maps/place)/[^\s"')]*`,
    flags: "gi",
  },
  {
    id: "gsc-legacy",
    label: "Search Console URL scoped to yesexperiences.pt",
    category: "gsc-url",
    regex: String.raw`search\.google\.com/search-console[^\s"')]*yesexperiences\.pt[^\s"')]*`,
    flags: "gi",
  },
];

export function categorizeMatch(patternId: string): LegacyCategory {
  const p = LEGACY_PATTERNS.find((x) => x.id === patternId);
  return p ? p.category : "legacy-domain";
}

/**
 * Paths that legitimately reference legacy identifiers (redirect map,
 * monitors, this scanner itself). Matches by substring.
 */
export const LEGACY_ALLOWLIST: string[] = [
  "src/lib/legacy-domain-redirect.ts",
  "src/lib/legacy-domains-monitor.functions.ts",
  "src/lib/gscLegacyActions.functions.ts",
  "src/lib/dns-watch-core.ts",
  "src/lib/noindex-nonprod-host.ts",
  "src/lib/domain-health.functions.ts",
  "src/lib/legacy-scan-patterns.ts",
  "src/lib/legacy-scan.functions.ts",
  "src/routes/admin.legacy-domains-monitor.tsx",
  "src/routes/admin.legacy-domain-unlink.tsx",
  "src/routes/admin.gbp-legacy-removal.tsx",
  "src/routes/admin.redirects-monitor.tsx",
  "src/routes/admin.dns-watch.tsx",
  "src/routes/admin.legacy-scan.tsx",
  "src/routes/api/img.ts",
  "src/lib/seoAudit.functions.ts",
  "src/lib/tourImporter.server.ts",
];

export function isAllowlisted(path: string): boolean {
  return LEGACY_ALLOWLIST.some((p) => path.includes(p));
}
