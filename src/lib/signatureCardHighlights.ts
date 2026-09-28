import { getTourContent, signatureIncludesLunch } from "@/lib/tourContent";

type HighlightSelector =
  | { source: "highlight"; value: string }
  | { source: "included"; value: string; label?: string }
  | { source: "includedLunch"; label: string };

/**
 * Buyer-facing card promises derived only from each Signature's canonical
 * overview, itinerary, highlights and inclusions. Operational detail remains
 * owned by the tour data; this map only keeps catalogue copy concise.
 */
const CARD_PROMISES: Record<string, string> = {
  "p23-artisan-pottery-cork":
    "Work with Alentejo cork and clay artisans, with a three-hour pottery session and lunch included.",
  "arrabida-wine-allinclusive":
    "Browse Setúbal’s 145-year-old Livramento Market, watch artisans hand-paint azulejos, then taste at family wineries over an included Azeitão lunch.",
  "wild-beaches-picnic":
    "Fill your basket at Livramento Market, follow Arrábida’s hidden coves to a private beach picnic, and end the afternoon in Sesimbra.",
  "arrabida-boat":
    "Start among the stalls of Livramento Market, cross the Arrábida hills, then see Sesimbra’s cliffs from the water before Cabo Espichel’s clifftop sanctuary.",
  "tiles-workshop":
    "Paint your own azulejo to take home, taste Setúbal wine at a regional winery, and finish beside the sea in Sesimbra.",
  "azeitao-cheese":
    "Shape Azeitão cheese with your own hands, pour local wine at a family winery, then climb to Sesimbra Castle for the view.",
  "sintra-cascais":
    "Wander Sintra’s palaces at your pace — one with a wine tasting, or two — then follow the Atlantic past Azenhas do Mar and Cabo da Roca to Cascais.",
  "troia-comporta":
    "Ferry across the Sado to Tróia’s Roman ruins, walk Carrasqueira’s stilt pier, then taste Comporta wine between wide Atlantic beaches.",
  "evora-alentejo":
    "Walk the UNESCO streets of Évora, from the Roman Temple to the Chapel of Bones, then slow down with two Alentejo wineries and a cork producer.",
  "tomar-coimbra":
    "Walk the Templar halls of Tomar’s Convent of Christ, then climb to Coimbra University and step inside the gilded Joanina Library.",
  "fatima-nazare-obidos":
    "Pause at Fátima’s sanctuary, watch the Atlantic from Nazaré’s cliffs, and end within the medieval walls of Óbidos.",
  "roman-heritage-alentejo":
    "Walk São Cucufate’s Roman ruins, then taste wine still made in clay talhas over lunch at a family cellar.",
  "southwest-vicentine-coast":
    "Follow Portugal’s wildest protected coast, from Porto Covo and Milfontes to where the river meets the ocean at Odeceixe, and on to Aljezur.",
};

/** Presentation order only: each line must still resolve from canonical data. */
const CARD_HIGHLIGHT_SELECTORS: Record<string, readonly HighlightSelector[]> = {
  "p23-artisan-pottery-cork": [
    { source: "highlight", value: "Hands-on cork workshop with local makers" },
    { source: "highlight", value: "Three-hour pottery workshop at a ceramics and earth arts centre" },
    { source: "includedLunch", label: "Lunch included" },
  ],
  "troia-comporta": [
    { source: "highlight", value: "Guided Roman Ruins of Tróia visit with admission" },
    { source: "highlight", value: "Herdade da Comporta wine experience and tasting" },
    { source: "highlight", value: "Comporta village, Carrasqueira stilt pier and Atlantic beaches" },
  ],
  "roman-heritage-alentejo": [
    { source: "highlight", value: "São Cucufate Roman archaeological site" },
    { source: "highlight", value: "Family-run winery using Roman-style clay vessels" },
    { source: "highlight", value: "Multiple talha wines and traditional winery lunch" },
  ],
  "southwest-vicentine-coast": [
    { source: "highlight", value: "Porto Covo and Vila Nova de Milfontes" },
    { source: "highlight", value: "Southwest Alentejo and Vicentine Coast Natural Park" },
    { source: "highlight", value: "Odeceixe river-meets-ocean landscape" },
  ],
  "arrabida-boat": [
    { source: "highlight", value: "Sesimbra Coastal Boat Tour" },
    { source: "highlight", value: "Livramento Market and Arrábida Natural Park" },
    { source: "highlight", value: "Cabo Espichel clifftop sanctuary" },
  ],
  "sintra-cascais": [
    { source: "highlight", value: "One palace plus wine tasting, or two palace tickets" },
    { source: "highlight", value: "Azenhas do Mar, Cabo da Roca and Cascais" },
    { source: "highlight", value: "Flexible palace selection with expert guide" },
  ],
  "azeitao-cheese": [
    { source: "highlight", value: "Private Azeitão cheese workshop" },
    { source: "highlight", value: "Local winery entrance and tasting" },
    { source: "highlight", value: "Livramento Market, Azeitão and Sesimbra" },
  ],
  "tomar-coimbra": [
    { source: "highlight", value: "Convento de Cristo and Templar heritage" },
    { source: "highlight", value: "University of Coimbra" },
    { source: "highlight", value: "Joanina Library timed entry" },
  ],
  "evora-alentejo": [
    { source: "highlight", value: "Évora UNESCO historic centre" },
    { source: "highlight", value: "Roman Temple and Chapel of Bones" },
    { source: "highlight", value: "Two selected Alentejo winery visits and tastings" },
  ],
  "fatima-nazare-obidos": [
    { source: "highlight", value: "Sanctuary of Fátima" },
    { source: "highlight", value: "Nazaré viewpoint, beach and fishing town" },
    { source: "highlight", value: "Óbidos medieval walled town and castle" },
  ],
  "tiles-workshop": [
    { source: "highlight", value: "Hands-on azulejo painting workshop" },
    { source: "highlight", value: "Selected regional winery tasting" },
    { source: "highlight", value: "Livramento Market and Sesimbra" },
  ],
  "arrabida-wine-allinclusive": [
    { source: "included", value: "Azeitão tile factory", label: "Working Azeitão azulejo factory visit" },
    { source: "highlight", value: "Two selected wineries included, up to four in Tailor" },
    { source: "includedLunch", label: "Traditional Azeitão lunch included" },
  ],
  "wild-beaches-picnic": [
    { source: "highlight", value: "Arrábida Natural Park and coastal viewpoints" },
    { source: "highlight", value: "Galapinhos, Bicas and Meco-area beaches" },
    { source: "highlight", value: "Private picnic with regional products" },
  ],
};

export function getSignatureCardPromise(tourId: string): string {
  return CARD_PROMISES[tourId] ?? getTourContent(tourId).overview;
}

export function getSignatureCardHighlights(tourId: string): string[] {
  const content = getTourContent(tourId);
  const selected = (CARD_HIGHLIGHT_SELECTORS[tourId] ?? []).flatMap((selector) => {
    if (selector.source === "includedLunch") {
      return signatureIncludesLunch(tourId) && content.included.some((item) => /^lunch$/i.test(item.trim()))
        ? [selector.label]
        : [];
    }
    const source = selector.source === "highlight" ? content.highlights : content.included;
    const label = "label" in selector ? selector.label : undefined;
    return source.includes(selector.value) ? [label ?? selector.value] : [];
  });
  return [...selected, ...content.highlights.filter((item) => !selected.includes(item))].slice(0, 3);
}