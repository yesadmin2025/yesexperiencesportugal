/**
 * CANONICAL SIGNATURE → CORRIDOR MAP.
 *
 * A Signature is ONLY a hidden geographic + commercial scaffold for the
 * Studio. It contributes exactly three things to a bespoke day:
 *
 *   1. the `region` it operates in,
 *   2. the `routeCluster` (corridor) that CONTAINS the day, and
 *   3. its own id, kept as commercial/pricing provenance.
 *
 * It never contributes its authored itinerary. Membership is composed from
 * verified ACTIVE inventory inside the corridor, and same-corridor moments
 * owned by a DIFFERENT Signature are legitimate candidates.
 *
 * CORRIDOR IS THE CONTAINMENT BOUNDARY, NOT THE REGION. `alentejo-evora`
 * contains two structurally distinct corridors (Évora city classical wineries
 * and the Vidigueira Roman/talha corridor); they must never mix.
 *
 * Pure data. No imports from Studio runtime modules, so both `curation.ts`
 * and the composer can depend on it without a cycle.
 */

import type { RegionId } from "@/data/regionStopPool";

/** Every corridor the Studio is allowed to compose inside. */
export const CANONICAL_ROUTE_CLUSTERS = [
  "arrabida-azeitao-sesimbra",
  "sintra-cascais-coast-heritage",
  "evora-city-classical-wineries",
  "troia-comporta-coast",
  "tomar-coimbra-heritage",
  "fatima-nazare-obidos-spirit-coast",
  "vidigueira-roman-talha",
  "vicentine-coast",
] as const;

export type CanonicalRouteCluster = (typeof CANONICAL_ROUTE_CLUSTERS)[number];

export interface SignatureCorridor {
  readonly region: RegionId;
  readonly routeCluster: CanonicalRouteCluster;
  /** Commercial provenance only — never a membership authority. */
  readonly signatureTourId: string;
}

export const SIGNATURE_CORRIDORS: Readonly<Record<string, SignatureCorridor>> = {
  "troia-comporta": {
    region: "comporta-troia",
    routeCluster: "troia-comporta-coast",
    signatureTourId: "troia-comporta",
  },
  "tomar-coimbra": {
    region: "tomar-coimbra",
    routeCluster: "tomar-coimbra-heritage",
    signatureTourId: "tomar-coimbra",
  },
  "fatima-nazare-obidos": {
    region: "fatima-nazare-obidos",
    routeCluster: "fatima-nazare-obidos-spirit-coast",
    signatureTourId: "fatima-nazare-obidos",
  },
  "sintra-cascais": {
    region: "sintra-cascais",
    routeCluster: "sintra-cascais-coast-heritage",
    signatureTourId: "sintra-cascais",
  },
  "evora-alentejo": {
    region: "alentejo-evora",
    routeCluster: "evora-city-classical-wineries",
    signatureTourId: "evora-alentejo",
  },
  // Arrábida / Azeitão / Sesimbra — five Signature scaffolds share ONE
  // corridor, so cross-Signature borrowing inside it is normal and correct.
  "arrabida-wine-allinclusive": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "arrabida-wine-allinclusive",
  },
  "wild-beaches-picnic": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "wild-beaches-picnic",
  },
  "arrabida-boat": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "arrabida-boat",
  },
  "tiles-workshop": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "tiles-workshop",
  },
  "azeitao-cheese": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "azeitao-cheese",
  },
  // Vidigueira / Vila de Frades — Roman heritage + talha wine. SAME RegionId
  // as Évora city, DIFFERENT corridor. Never mixed.
  "roman-heritage-alentejo": {
    region: "alentejo-evora",
    routeCluster: "vidigueira-roman-talha",
    signatureTourId: "roman-heritage-alentejo",
  },
  // Southwest Vicentine Coast — Porto Covo → Milfontes → Odeceixe.
  "southwest-vicentine-coast": {
    region: "other",
    routeCluster: "vicentine-coast",
    signatureTourId: "southwest-vicentine-coast",
  },
};

/** Corridor of a Signature scaffold, or `null` when it is not mapped. */
export function corridorForSignature(
  signatureTourId: string | null | undefined,
): SignatureCorridor | null {
  if (!signatureTourId) return null;
  return SIGNATURE_CORRIDORS[signatureTourId] ?? null;
}
