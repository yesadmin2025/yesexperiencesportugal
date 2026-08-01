/**
 * Legacy Signature tour slugs → current canonical tour ids.
 *
 * These URLs were live on the previous site and still appear in external
 * backlinks and cached pages. Each maps in ONE hop to an existing,
 * indexable, self-canonical Signature page (no chains, no loops).
 */
export const LEGACY_TOUR_REDIRECTS: Record<string, string> = {
  "arrabida-wines": "arrabida-wine-allinclusive",
  "arrabida-sesimbra": "arrabida-boat",
  "evora-alentejo-talhas": "evora-alentejo",
  "azeitao-cheese-wine": "azeitao-cheese",
};

export function resolveLegacyTourId(id: string | null | undefined): string | null {
  if (!id) return null;
  return LEGACY_TOUR_REDIRECTS[id] ?? null;
}
