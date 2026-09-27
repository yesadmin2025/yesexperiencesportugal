/**
 * Studio proposal facts — pure selector. Every field comes from verified
 * tour data or the traveller's own choices; missing data → field omitted,
 * never guessed. AI copy never feeds this.
 */
export interface StudioProposalTourInput {
  readonly durationHours?: string | null;
  readonly included?: ReadonlyArray<string> | null;
}

export interface StudioProposal {
  readonly duration?: string;
  readonly pickup: string;
  readonly included: ReadonlyArray<string>;
  readonly moreIncluded: number;
  readonly allIncluded: ReadonlyArray<string>;
  readonly perPaxEur?: number;
}

const PICKUP_LABELS: Record<string, string> = {
  lisbon: "Door-to-door from your Lisbon address",
  "lisbon-airport": "From Lisbon airport",
  "lisbon-cruise": "From the Lisbon cruise terminal",
  "cascais-estoril": "From your address in Cascais or Estoril",
  sintra: "From your address in Sintra",
  "sesimbra-setubal-arrabida": "From your address in Sesimbra, Setúbal or Arrábida",
  "comporta-troia": "From your address in Comporta or Tróia",
  other: "From your address, confirmed with you",
};

export const MAX_INCLUDED_LINES = 5;

export function buildStudioProposal(
  tour: StudioProposalTourInput | null | undefined,
  pickup: string | null | undefined,
  perPaxEur: number | null | undefined,
): StudioProposal | null {
  if (!tour) return null;
  const all = (tour.included ?? []).map((s) => s.trim()).filter(Boolean);
  const duration = tour.durationHours?.trim() || undefined;
  return {
    ...(duration ? { duration } : {}),
    pickup: (pickup && PICKUP_LABELS[pickup]) || "Door-to-door from your address in Lisbon",
    included: all.slice(0, MAX_INCLUDED_LINES),
    allIncluded: all,
    moreIncluded: Math.max(0, all.length - MAX_INCLUDED_LINES),
    ...(perPaxEur != null && Number.isFinite(perPaxEur) && perPaxEur > 0
      ? { perPaxEur: Math.round(perPaxEur) }
      : {}),
  };
}
