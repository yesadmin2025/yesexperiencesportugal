// Canonical public Signature-tour registry.
//
// Single source of truth for what counts as a public Signature product.
// Every downstream check (audit, sync-all, mapping panel, e2e coverage,
// completion report) derives its list from this file — NEVER from a
// hand-maintained array elsewhere, and NEVER from `tour_bokun_mapping` rows
// alone (a tour with no mapping row is a REPORTABLE gap, not an omission).
//
// Registry entries mirror the 12 IDs approved in the launch plan. Do not
// prune an entry just because a mapping is missing — that's the point of
// having a registry: the audit output must include the missing case.
//
// This module is browser-safe. The mirror lives at
// `supabase/functions/_shared/signatureRegistry.ts` and MUST stay
// byte-equivalent.

export type PublicStatus =
  | "public" // listed on the site, bookable path
  | "not-public" // deliberately hidden / not launched
  | "disabled"; // temporarily removed but still tracked

export interface SignatureRegistryEntry {
  /** Internal tour id — matches `signature_tours.id` and `tour_bokun_mapping.tour_id`. */
  id: string;
  /** Human title used only for reports and admin surfaces. */
  title: string;
  /** Whether the tour is currently discoverable + bookable by the public. */
  status: PublicStatus;
  /**
   * Explanatory note when `status !== "public"`. Surfaced in the completion
   * report so a missing tour is a reported reason, not a silent omission.
   */
  reason?: string;
}

export const SIGNATURE_REGISTRY: readonly SignatureRegistryEntry[] = [
  { id: "arrabida-boat", title: "Arrábida & Sesimbra Coastal Boat", status: "public" },
  { id: "arrabida-wine-allinclusive", title: "Setúbal & Arrábida Wine (All-Inclusive)", status: "public" },
  { id: "azeitao-cheese", title: "Azeitão Cheese & Wine", status: "public" },
  { id: "evora-alentejo", title: "Évora & Alentejo Wine", status: "public" },
  { id: "fatima-nazare-obidos", title: "Fátima, Nazaré & Óbidos", status: "public" },
  { id: "roman-heritage-alentejo", title: "Roman Heritage & Hidden Alentejo", status: "public" },
  { id: "sintra-cascais", title: "Sintra & Cascais", status: "public" },
  {
    id: "southwest-vicentine-coast",
    title: "Southwest Vicentine Coast",
    status: "public",
  },
  { id: "tiles-workshop", title: "Tile Painting Workshop, Wine & Sesimbra", status: "public" },
  { id: "tomar-coimbra", title: "Tomar & Coimbra – Templars & Heritage", status: "public" },
  { id: "troia-comporta", title: "Tróia & Comporta – Ruins, Wine & Beaches", status: "public" },
  { id: "wild-beaches-picnic", title: "Wild Beaches & Coastal Picnic", status: "public" },
] as const;

/** All public Signature tour ids, in registry order. */
export function publicSignatureTourIds(): string[] {
  return SIGNATURE_REGISTRY.filter((t) => t.status === "public").map((t) => t.id);
}

/** All tracked ids, including not-public / disabled. */
export function allSignatureTourIds(): string[] {
  return SIGNATURE_REGISTRY.map((t) => t.id);
}

export function findSignatureEntry(
  id: string,
): SignatureRegistryEntry | undefined {
  return SIGNATURE_REGISTRY.find((t) => t.id === id);
}

export function isPublicSignatureTour(id: string): boolean {
  return findSignatureEntry(id)?.status === "public";
}
