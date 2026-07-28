/**
 * Signature card "moments" — the 3 unique differentiators shown on each
 * Signature card on /experiences (and /pt/experiences).
 *
 * Every trio below is derived STRICTLY from the tour's canonical
 * Source-of-Truth entry (`src/data/signatureToursSourceOfTruth.ts`):
 * its `highlights`, `included` and real itinerary stops. Nothing here
 * may be invented, and nothing may promise a meal, a named winery or a
 * palace that the canonical record treats as an availability-dependent
 * option.
 *
 * Rules locked in this file:
 * - never guarantee a winery, cellar or palace drawn from an
 *   alternative pool — use "selected" wording;
 * - never describe a lunch as included unless the canonical
 *   `included` list says so (Arrábida Wine, Roman Talha, and the
 *   Picnic, whose picnic IS the meal component);
 * - keep proper names exactly as published (Portuguese either way, so
 *   English and Portuguese cards share the same trio).
 *
 * Fallback: when a tour is not listed here, the caller falls back to
 * SoT itinerary stops, so nothing regresses.
 */

export const SIGNATURE_CARD_MOMENTS: Record<string, [string, string, string]> = {
  "arrabida-wine-allinclusive": [
    "Two selected wineries and lunch included",
    "Setúbal, Azeitão and Arrábida landscapes",
    "Tailor the day with additional winery options",
  ],
  "arrabida-boat": [
    "Sesimbra Coastal Boat Tour",
    "Arrábida Natural Park and Lapa de Santa Margarida",
    "Livramento Market, Sesimbra and Cabo Espichel",
  ],
  "wild-beaches-picnic": [
    "Private regional picnic — cheeses, bread, smoked meats, fruit and wine",
    "Arrábida Natural Park and Lapa de Santa Margarida",
    "Cabo Espichel cliffs above the Atlantic",
  ],
  "tiles-workshop": [
    "Hands-on azulejo painting workshop in Azeitão",
    "Tile firing and shipping included",
    "One selected regional winery, Sesimbra and Livramento Market",
  ],
  "azeitao-cheese": [
    "Private Azeitão cheese workshop",
    "Regional bread, cheese, chutney and Moscatel",
    "Selected winery tasting, Azeitão and Sesimbra",
  ],
  "sintra-cascais": [
    "Flexible palace selection with your guide",
    "One palace and wine, or two palace visits",
    "Azenhas do Mar, Cabo da Roca and Cascais",
  ],
  "troia-comporta": [
    "Sado ferry crossing and the Roman Ruins of Tróia",
    "Herdade da Comporta wine tasting",
    "Carrasqueira stilt pier and Atlantic beaches",
  ],
  "evora-alentejo": [
    "Évora UNESCO historic centre",
    "Roman Temple and Chapel of Bones",
    "Two selected Alentejo wineries and a cork-production visit",
  ],
  "tomar-coimbra": [
    "Convento de Cristo and Templar heritage",
    "University of Coimbra",
    "Joanina Library timed entry",
  ],
  "fatima-nazare-obidos": [
    "Sanctuary of Fátima",
    "Nazaré's cliff viewpoint and Atlantic coast — seasonal giant-wave scenery in winter",
    "Óbidos walled town and Ginjinha tasting",
  ],
  "roman-heritage-alentejo": [
    "Villa Romana de São Cucufate",
    "Family talha winery with traditional Alentejo lunch included",
    "Talha Wine Interpretation Center",
  ],
  "southwest-vicentine-coast": [
    "Ilha do Pessegueiro coastal viewpoint",
    "Porto Covo and Vila Nova de Milfontes",
    "Odeceixe, where the river meets the ocean",
  ],
};

export function getSignatureCardMoments(tourId: string): [string, string, string] | null {
  return SIGNATURE_CARD_MOMENTS[tourId] ?? null;
}
