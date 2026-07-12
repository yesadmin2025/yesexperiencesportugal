// Deno mirror of `src/lib/tours/signatureRegistry.ts`.
// Byte-equivalent by design — a divergence between the two lists means the
// audit report can silently drop or invent a public tour. Keep both in sync.

export type PublicStatus = "public" | "not-public" | "disabled";

export interface SignatureRegistryEntry {
  id: string;
  title: string;
  status: PublicStatus;
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

export function publicSignatureTourIds(): string[] {
  return SIGNATURE_REGISTRY.filter((t) => t.status === "public").map((t) => t.id);
}

export function allSignatureTourIds(): string[] {
  return SIGNATURE_REGISTRY.map((t) => t.id);
}

export function findSignatureEntry(id: string): SignatureRegistryEntry | undefined {
  return SIGNATURE_REGISTRY.find((t) => t.id === id);
}

export function isPublicSignatureTour(id: string): boolean {
  return findSignatureEntry(id)?.status === "public";
}
