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
import { semanticStopKey } from "./curation";

/** Canonical stop metadata kinds that are a winery visit. */
const WINERY_KINDS: ReadonlySet<string> = new Set(["winery", "cellar"]);

/**
 * Conservative label fallback, used ONLY when the canonical catalog has no
 * entry for the label. Deliberately narrow: it must name a wine facility,
 * not merely mention wine in passing.
 */
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
  const geo = lookupStopGeo(label);
  if (geo) return WINERY_KINDS.has(geo.kind);
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
