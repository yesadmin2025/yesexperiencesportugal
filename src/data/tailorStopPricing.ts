/**
 * Tailor stop PRICING CLASSIFICATION — authoritative, explicit, testable.
 *
 * Owner-aligned semantics recorded in `docs/audit-2026-07/tailor-formula.md`:
 *
 *   • A stop earns the −5% principal-removal reduction ONLY when it is a true
 *     top-level PRINCIPAL removable stop.
 *   • Descriptive / free viewpoints / photo stops / notes stay removable for
 *     TIME but must NOT change the price.
 *   • Locked, product-defining stops never earn a removal credit.
 *   • A stop priced by a dedicated credit (Arrábida's included lunch, −€15 pp)
 *     never also earns the −5% ladder.
 *   • Removal must not drop the day below a Signature's declared minimum
 *     viable composition (see `TAILOR_MIN_VIABLE_CORE_STOPS`).
 *
 * `!lock` is explicitly NOT sufficient evidence of principal status — this
 * table is the classification, not a derivation.
 *
 * Classes:
 *   principal          — evidenced paid component; removal earns −5%
 *   descriptive        — free viewpoint / drive-by / photo stop; removable,
 *                        NO price change
 *   locked             — product-defining or mandatory; not removable
 *   dedicated-credit   — priced by its own flat credit, never by the ladder
 *   needs-owner-review — evidence is weak. FAIL-CLOSED for pricing: still
 *                        removable for time where the UI permits, but earns
 *                        NO −5% until the owner classifies it `principal`.
 *                        Reported by `tailorStopsPendingOwnerReview()`.
 */

import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";

export type TailorStopPricingClass =
  | "principal"
  | "descriptive"
  | "locked"
  | "dedicated-credit"
  | "needs-owner-review";

interface StopClassification {
  pricing: TailorStopPricingClass;
  /** Why this class was assigned. Never leave empty. */
  evidence: string;
}

const P = (evidence: string): StopClassification => ({ pricing: "principal", evidence });
const D = (evidence: string): StopClassification => ({ pricing: "descriptive", evidence });
const R = (evidence: string): StopClassification => ({ pricing: "needs-owner-review", evidence });

/**
 * Explicit classification of every CORE blueprint stop, per Signature.
 * Locked stops and dedicated-credit stops are derived at read time from the
 * blueprint `lock` and from `TAILOR_DEDICATED_LUNCH_STOP_ID`, and always win
 * over the entries below.
 */
export const TAILOR_CORE_STOP_PRICING: Readonly<
  Record<string, Readonly<Record<string, StopClassification>>>
> = {
  "arrabida-wine-allinclusive": {
    livramento: P("Guided market visit with tastings — paid component of the Viator inclusion."),
    "arrabida-park": D("Panoramic road / viewpoint — free access, no supplier cost."),
    "azeitao-tiles": P("Working tile factory visit — supplier-hosted paid component."),
    "lunch-azeitao": P("Included lunch — priced by the dedicated −€15 pp credit, not the ladder."),
  },
  "wild-beaches-picnic": {
    livramento: P("Guided market visit where the picnic is bought — paid component."),
    "arrabida-drive": D("Coastal drive viewpoints — free access, no supplier cost."),
    "sesimbra-village": R("Free village walk but guide-time significant; owner to confirm class."),
  },
  "arrabida-boat": {
    livramento: P("Guided market visit — paid component."),
    "arrabida-drive": D("Coastal drive viewpoints — free access, no supplier cost."),
    "sesimbra-village": R("Free village walk but guide-time significant; owner to confirm class."),
  },
  "tiles-workshop": {
    livramento: P("Guided market visit — paid component."),
    "lunch-azeitao": P("Included lunch, no dedicated removal credit on this Signature."),
  },
  "azeitao-cheese": {
    livramento: P("Guided market visit — paid component."),
    "lunch-azeitao": P("Included lunch, no dedicated removal credit on this Signature."),
  },
  "sintra-cascais": {
    "sintra-vila": R("Historic centre walk; free access but core to the product. Owner to confirm."),
    "lunch-azenhas": P("Included lunch — paid component."),
    "cabo-da-roca": D("Cliff viewpoint — free access, no supplier cost."),
    cascais: R("Coastal town stop; free access. Owner to confirm principal status."),
  },
  "troia-comporta": {
    "troia-ruins": P("Ticketed Roman ruins — paid admission."),
    "herdade-comporta": P("Winery visit with tasting — paid supplier component."),
    "comporta-lunch": P("Included lunch — paid component."),
    "comporta-beach": R("Free beach time; owner to confirm whether it carries supplier cost."),
  },
  "evora-alentejo": {
    "evora-old-town": R("UNESCO centre walk; free access but core. Owner to confirm."),
    "templo-romano": P("Guided monument stop within the ticketed Évora circuit."),
    "chapel-of-bones": P("Ticketed admission — paid component."),
    "evora-lunch": P("Included lunch — paid component."),
  },
  "tomar-coimbra": {
    "convento-cristo": P("Ticketed UNESCO monument — paid admission."),
    "tomar-town": R("Free town walk; owner to confirm principal status."),
    "tomar-lunch": P("Included lunch — paid component."),
    "coimbra-uni": P("Ticketed university visit — paid admission."),
    "biblioteca-joanina": P("Ticketed library slot — paid admission."),
  },
  "fatima-nazare-obidos": {
    fatima: P("Guided sanctuary visit — core paid component of the day."),
    "nazare-beach": D("Clifftop viewpoint over the beach — free access."),
    "nazare-lunch": P("Included lunch — paid component."),
    obidos: R("Walled town walk; free access. Owner to confirm principal status."),
  },
  "roman-heritage-alentejo": {
    "sao-cucufate": P("Ticketed Roman villa — paid admission."),
    "vinho-talha": P("Talha wine cellar visit with tasting — paid supplier component."),
    "vila-alva": D("Drive-by village stop — free access, no supplier cost."),
    "mestre-daniel": P("Artisan pottery visit — paid supplier component."),
    "talha-lunch": P("Included lunch — paid component."),
  },
};

/**
 * Declared minimum viable composition per Signature (number of core stops the
 * day must retain). Intentionally EMPTY: no operator-declared minimum exists
 * in the source of truth yet, and inventing one would change business truth.
 * The guard below honours any entry the owner adds later.
 */
export const TAILOR_MIN_VIABLE_CORE_STOPS: Readonly<Record<string, number>> = {};

/** Class of a core stop, with lock / dedicated-credit overrides applied. */
export function classifyTailorCoreStop(
  tourId: string,
  stopId: string,
  opts: { dedicatedCreditStopId?: string | null } = {},
): TailorStopPricingClass | null {
  const bp = TAILOR_BLUEPRINTS[tourId];
  const stop = bp?.core.find((s) => s.id === stopId);
  if (!stop) return null;
  if (stop.lock) return "locked";
  if (opts.dedicatedCreditStopId && stopId === opts.dedicatedCreditStopId) return "dedicated-credit";
  return TAILOR_CORE_STOP_PRICING[tourId]?.[stopId]?.pricing ?? "needs-owner-review";
}

/** Stops whose classification the owner still has to confirm. */
export function tailorStopsPendingOwnerReview(): { tourId: string; stopId: string; evidence: string }[] {
  const out: { tourId: string; stopId: string; evidence: string }[] = [];
  for (const [tourId, stops] of Object.entries(TAILOR_CORE_STOP_PRICING)) {
    for (const [stopId, entry] of Object.entries(stops)) {
      if (entry.pricing === "needs-owner-review") {
        out.push({ tourId, stopId, evidence: entry.evidence });
      }
    }
  }
  return out;
}

/**
 * Classes that earn the −5% ladder. FAIL-CLOSED: only an explicitly
 * classified `principal` stop earns money. `needs-owner-review` stays
 * removable for time where the UI permits, but earns NO reduction until the
 * owner classifies it `principal`.
 */
export function classEarnsPrincipalCredit(pricing: TailorStopPricingClass): boolean {
  return pricing === "principal";
}

/**
 * Max removals allowed by a Signature's declared minimum viable composition.
 * `Infinity` when the owner has declared no minimum.
 */
export function maxRemovalsForMinViable(tourId: string): number {
  const min = TAILOR_MIN_VIABLE_CORE_STOPS[tourId];
  if (min === undefined) return Number.POSITIVE_INFINITY;
  const coreCount = TAILOR_BLUEPRINTS[tourId]?.core.length ?? 0;
  return Math.max(0, coreCount - min);
}
