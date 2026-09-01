/**
 * Studio V3 — availability-safe presentation of winery moments.
 *
 * OWNER RULE (non-negotiable):
 *   An exact winery supplier name is NOT booking truth. A static
 *   Viator/Signature catalog winery name is an *operational assignment
 *   candidate*, not a confirmed supplier. Until a real confirmed-assignment
 *   field exists, the traveller-facing Studio label must be generic.
 *
 * What this module does NOT do:
 *   - it never changes the canonical label used for geo lookup, dedupe,
 *     analytics, pricing, supplier operations or the booking snapshot's
 *     canonical fields;
 *   - it never collapses two genuinely distinct wineries into one moment.
 *
 * Naming is positional over the DEDUPED day, in route order:
 *   1st distinct winery  -> "A local winery"
 *   2nd distinct winery  -> "A second local winery"
 *   3rd distinct winery  -> "A third local winery"
 *   ...and so on, only as far as the authoritative route really goes.
 */

import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { REGION_STOPS, type StopKind } from "@/data/regionStops";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import { semanticStopKey } from "./curation";
import { tailorRules } from "@/data/tailorRules";

const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Verified aliases of EXISTING source-of-truth winery entries. Signature
 * catalog labels occasionally differ in wording from the blueprint /
 * region-pool name for the very same supplier. Centralised here — never
 * scattered across UI components — and each entry names the source-of-truth
 * record it aliases. Catalog data itself stays untouched.
 */
const VERIFIED_WINERY_ALIASES: ReadonlyArray<readonly [alias: string, sourceOfTruth: string]> = [
  ["Farm Catralvos", "Quinta de Catralvos"], // TAILOR_BLUEPRINTS · arrabida choice `catralvos`
  ["Adega Cartuxa", "Enoturismo Cartuxa"], // REGION_STOP_POOL · alentejo winery
  ["Adega Ervideira", "Ervideira"], // REGION_STOP_POOL · alentejo winery
  ["Quinta S. José de Peramanca", "Pera-Grave / Quinta S. José de Peramanca"],
];

/** Canonical stop metadata kinds that are a winery visit. */
const WINERY_KINDS: ReadonlySet<StopKind> = new Set<StopKind>(["winery", "cellar"]);

/**
 * Canonical winery identities, derived ONLY from typed existing truth:
 *   - `REGION_STOP_POOL` entries typed `type: "winery"`
 *   - `REGION_STOPS` entries typed `kind: "winery" | "cellar"`
 *   - `TAILOR_BLUEPRINTS` core/choice/optional stops typed `category: "winery"`
 *   - the verified alias table above
 * Each identity is indexed twice: by normalized name AND by the shared
 * `semanticStopKey`, so accent/case/wording variants of the SAME supplier
 * resolve without any risk of matching a different place.
 */
function collectBlueprintWineryLabels(): string[] {
  const out: string[] = [];
  for (const bp of Object.values(TAILOR_BLUEPRINTS)) {
    for (const stop of [...bp.core, ...(bp.choice?.options ?? []), ...bp.optional]) {
      if (stop.category === "winery") out.push(stop.label);
    }
  }
  return out;
}

const WINERY_IDENTITY_KEYS: ReadonlySet<string> = (() => {
  const keys = new Set<string>();
  const add = (name: string) => {
    const n = normName(name);
    if (n) keys.add(n);
    const semantic = semanticStopKey(name);
    if (semantic) keys.add(semantic);
  };
  for (const s of REGION_STOP_POOL) if (s.type === "winery") add(s.name);
  for (const s of REGION_STOPS) if (WINERY_KINDS.has(s.kind)) add(s.name);
  for (const label of collectBlueprintWineryLabels()) add(label);
  for (const [alias] of VERIFIED_WINERY_ALIASES) add(alias);
  return keys;
})();

/**
 * Raw supplier NAMES (not normalized keys) of every canonical winery identity.
 * Used to scrub supplier identity out of arbitrary client-facing strings —
 * `alt`, `title`, captions, aria labels and data attributes — which the
 * generic visible label alone does not cover.
 */
const WINERY_IDENTITY_NAMES: readonly string[] = (() => {
  const names = new Set<string>();
  const add = (name: string) => {
    const trimmed = (name ?? "").trim();
    // Two chars or fewer cannot identify a supplier and would over-match.
    if (trimmed.length >= 4) names.add(trimmed);
  };
  for (const s of REGION_STOP_POOL) if (s.type === "winery") add(s.name);
  for (const s of REGION_STOPS) if (WINERY_KINDS.has(s.kind)) add(s.name);
  for (const label of collectBlueprintWineryLabels()) add(label);
  for (const [alias, sourceOfTruth] of VERIFIED_WINERY_ALIASES) {
    add(alias);
    add(sourceOfTruth);
  }
  return [...names].sort((a, b) => b.length - a.length);
})();

/**
 * True when an arbitrary client-facing string names a canonical winery
 * supplier. Normalized, accent- and case-insensitive containment.
 */
export function containsWinerySupplierName(text: string | null | undefined): boolean {
  if (!text) return false;
  const haystack = normName(text);
  if (!haystack) return false;
  return WINERY_IDENTITY_NAMES.some((name) => {
    const needle = normName(name);
    return needle.length >= 4 && haystack.includes(needle);
  });
}

/**
 * Conservative label fallback, used ONLY when the canonical catalog has no
 * entry for the label. Deliberately narrow: it must name a wine facility,
 * not merely mention wine in passing.
 */
/**
 * Labels that name a place/moment which is categorically not a winery visit.
 * Only consulted to veto the fuzzy geo match — never the structural identity.
 */
const NON_WINERY_LABEL_RE =
  /\b(village|town|square|market|mercado|lunch|dinner|picnic|beach|praia|viewpoint|miradouro|centro interpretativo)\b/i;

const WINERY_LABEL_FALLBACK_RE =
  /\b(winery|wineries|wine cellar|wine estate|vineyard|vineyards|adega|adegas|caves?)\b/i;

const ORDINALS = [
  "A local winery",
  "A second local winery",
  "A third local winery",
  "A fourth local winery",
  "A fifth local winery",
  "A sixth local winery",
] as const;

export interface WineryPresentationStop {
  readonly label: string;
  /**
   * A REAL confirmed supplier assignment, when (and only when) the Studio
   * state carries one. No such field exists in Studio state today, so this
   * is always undefined and every winery is presented generically.
   */
  readonly confirmedSupplierLabel?: string | null;
}

export function isWineryStopLabel(label: string): boolean {
  if (!label) return false;
  // 1) Structural truth first — exact identity from typed catalogs/aliases.
  if (WINERY_IDENTITY_KEYS.has(normName(label))) return true;
  const semantic = semanticStopKey(label);
  if (semantic && WINERY_IDENTITY_KEYS.has(semantic)) return true;
  // 2) Guard against the fuzzy geo lookup below: a settlement, market,
  //    lunch or interpretive centre near a winery is NOT a winery, even
  //    though the fuzzy name match can land on one. Exact structural
  //    identity (step 1) already ran, so a real supplier never reaches here.
  if (NON_WINERY_LABEL_RE.test(label)) return false;
  // 3) Geo catalog kind (fuzzy match) — only ever confirms, never denies.
  const geo = lookupStopGeo(label);
  if (geo && WINERY_KINDS.has(geo.kind)) return true;
  if (geo) return false;
  // 4) Narrow keyword fallback for labels absent from every catalog.
  return WINERY_LABEL_FALLBACK_RE.test(label);
}

function ordinalWineryLabel(index: number): string {
  return ORDINALS[index] ?? `Another local winery`;
}

/**
 * Build canonical-label -> display-label mapping for one day's route.
 * Non-winery stops are absent from the map (callers fall back to canonical).
 */
export function buildWineryDisplayLabels(
  stops: ReadonlyArray<WineryPresentationStop>,
): Map<string, string> {
  const out = new Map<string, string>();
  const seenWineryKeys = new Map<string, string>();

  for (const stop of stops) {
    if (!isWineryStopLabel(stop.label)) continue;
    if (stop.confirmedSupplierLabel) {
      out.set(stop.label, stop.confirmedSupplierLabel);
      continue;
    }
    const key = semanticStopKey(stop.label) || stop.label.toLowerCase();
    const existing = seenWineryKeys.get(key);
    if (existing) {
      // Same physical winery under another catalog name — same display label.
      out.set(stop.label, existing);
      continue;
    }
    const display = ordinalWineryLabel(seenWineryKeys.size);
    seenWineryKeys.set(key, display);
    out.set(stop.label, display);
  }

  return out;
}

/** Display label for one stop, given a map from `buildWineryDisplayLabels`. */
export function studioDisplayLabel(
  label: string,
  displayLabels: ReadonlyMap<string, string> | null | undefined,
): string {
  return displayLabels?.get(label) ?? label;
}

/**
 * Client-safe alternative text for a moment's photograph.
 *
 * Image metadata is client-facing surface: `alt`, `title` and the accessible
 * name are read by assistive tech and are visible in the DOM. A raw canonical
 * label therefore leaks the supplier identity the visible label deliberately
 * keeps generic. Non-winery moments keep their real, truthful name.
 */
export const GENERIC_WINERY_ALT = "A local winery in the Portuguese countryside.";

export function publicMomentAltText(label: string, suppliedAlt?: string | null): string {
  const alt = (suppliedAlt ?? "").trim();
  // A supplied `alt` is NOT trusted: catalog media frequently carries the real
  // supplier name ("House & Museum Jose Maria Da Fonseca") while the visible
  // label is deliberately generic. Scrub it before it reaches the DOM.
  if (alt) {
    if (containsWinerySupplierName(alt)) return GENERIC_WINERY_ALT;
    return alt;
  }
  if (!label) return "";
  if (isWineryStopLabel(label) || containsWinerySupplierName(label)) return GENERIC_WINERY_ALT;
  return label;
}

/**
 * Scrub supplier identity out of ANY client-facing string surface
 * (title, caption, aria-label, data attribute, metadata).
 */
export function publicSafeText(text: string | null | undefined, fallback = "A local winery"): string {
  const value = (text ?? "").trim();
  if (!value) return "";
  return containsWinerySupplierName(value) ? fallback : value;
}

/**
 * How many wineries the composed day holds BEYOND the Signature's approved
 * included baseline (`tailorRules(tourId).wineries.included`).
 *
 * This is a COUNT, never a price. It is the only thing the client is allowed
 * to state about the extra-winery commercial action: the server clamps it to
 * the approved entitlement and derives the euro supplement from its own table
 * (`serverTailorSupplementsEur`). The baseline is the commercial entitlement,
 * not the catalogue — the catalogue lists selectable options, several of
 * which are alternatives to one another.
 */
export function studioExtraWineryCount(
  anchorTourId: string | null | undefined,
  composedLabels: readonly string[],
): number {
  if (!anchorTourId) return 0;
  const rules = tailorRules(anchorTourId).wineries;
  if (!rules) return 0;

  const composed = new Set<string>();
  for (const label of composedLabels) {
    if (!isWineryStopLabel(label)) continue;
    composed.add(semanticStopKey(label) || normName(label));
  }
  const maxExtra = Math.max(0, rules.max - rules.included);
  return Math.min(maxExtra, Math.max(0, composed.size - rules.included));
}

export function studioComposedSupplementPerPaxEur(
  anchorTourId: string | null | undefined,
  composedLabels: readonly string[],
): number {
  if (!anchorTourId) return 0;
  const rules = tailorRules(anchorTourId).wineries;
  if (!rules) return 0;
  return studioExtraWineryCount(anchorTourId, composedLabels) * rules.supplementEur;
}
