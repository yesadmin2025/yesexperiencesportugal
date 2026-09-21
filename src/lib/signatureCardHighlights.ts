import { getTourContent, signatureIncludesLunch } from "@/lib/tourContent";

type HighlightSelector =
  | { source: "highlight"; value: string }
  | { source: "included"; value: string; label?: string }
  | { source: "includedLunch"; label: string };

/** Presentation order only: each line must still resolve from canonical data. */
const CARD_HIGHLIGHT_SELECTORS: Record<string, readonly HighlightSelector[]> = {
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
    { source: "highlight", value: "Two selected wineries included, up to four in Tailor" },
    { source: "highlight", value: "Arrábida Natural Park" },
    { source: "includedLunch", label: "Lunch included" },
  ],
  "wild-beaches-picnic": [
    { source: "highlight", value: "Arrábida Natural Park and coastal viewpoints" },
    { source: "highlight", value: "Galapinhos, Bicas and Meco-area beaches" },
    { source: "highlight", value: "Private picnic with regional products" },
  ],
};

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