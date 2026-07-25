/**
 * Signature card "moments" — the 3 unique differentiators shown on each
 * Signature card on /experiences (and /pt/experiences).
 *
 * These replace the stop-label loop that used to repeat "Mercado do
 * Livramento" across cards because five tours start there. Each trio is
 * hand-curated from the tour's Source-of-Truth (highlights + a bookable
 * stop that only THIS tour has), never invented copy.
 *
 * Rule: prefer what makes the tour distinctive over what's shared.
 * Fallback: when a tour is not listed here, the caller falls back to
 * SoT itinerary stops (previous behaviour), so nothing regresses.
 *
 * Keep this file in sync with src/data/signatureToursSourceOfTruth.ts
 * when SoT is updated. English + Portuguese share the same trio (proper
 * names are Portuguese either way and stay recognisable).
 */

export const SIGNATURE_CARD_MOMENTS: Record<string, [string, string, string]> = {
  "arrabida-wine-allinclusive": [
    "Three family cellars, one long lunch",
    "Bacalhôa & José Maria da Fonseca tastings",
    "Coastal drive through Arrábida Natural Park",
  ],
  "arrabida-boat": [
    "Boat into hidden Arrábida coves",
    "Turquoise-water beaches, no crowds",
    "Sesimbra fishing village at golden hour",
  ],
  "wild-beaches-picnic": [
    "Chef-styled picnic on a hidden beach",
    "Lapa de Santa Margarida sea cave",
    "Cabo Espichel cliffs above the Atlantic",
  ],
  "tiles-workshop": [
    "Hand-paint your own azulejo in Sesimbra",
    "Palmela cellar tasting with the winemaker",
    "Castelo de Sesimbra above the fishing bay",
  ],
  "azeitao-cheese": [
    "Meet the shepherd behind Queijo de Azeitão",
    "Taste the cheese fresh from the dairy",
    "Wander Azeitão's historic wine village",
  ],
  "sintra-cascais": [
    "Pena Palace before the crowds",
    "Cabo da Roca — Europe's westernmost cliff",
    "Cascais old town by the marina",
  ],
  "troia-comporta": [
    "Ferry across the Sado dolphin estuary",
    "Comporta rice-field boardwalks & beaches",
    "Cais Palafítico da Carrasqueira at sunset",
  ],
  "evora-alentejo": [
    "Palmela & Setúbal Moscatel cellar tastings",
    "Long lunch inside an Alentejo winery",
    "Coastal Arrábida road back to Lisbon",
  ],
  "tomar-coimbra": [
    "Templar Convento de Cristo in Tomar",
    "Coimbra University's Joanina Library",
    "Riverside lunch between UNESCO towns",
  ],
  "fatima-nazare-obidos": [
    "Fátima Sanctuary in reverent quiet",
    "Nazaré's giant-wave cliff viewpoint",
    "Óbidos ginjinha inside the medieval walls",
  ],
  "roman-heritage-alentejo": [
    "Vinho de Talha tasted from clay amphorae",
    "Villa Romana de São Cucufate ruins",
    "Long Alentejo lunch with the winemaker",
  ],
  "southwest-vicentine-coast": [
    "Costa Vicentina cliffs and Atlantic wind",
    "Ilha do Pessegueiro island viewpoint",
    "Porto Covo & Vila Nova de Milfontes",
  ],
};

export function getSignatureCardMoments(tourId: string): [string, string, string] | null {
  return SIGNATURE_CARD_MOMENTS[tourId] ?? null;
}
