/**
 * Search-intent map for the 13 Signature experiences in Portugal and the US.
 *
 * Keywords are editorial guidance, not a meta-keywords tag. Google ignores
 * that tag. Titles and descriptions are consumed by the public tour route;
 * facts stay in signatureTours and the verified source-of-truth itinerary.
 */
export type SignatureSeoEntry = {
  primaryKeyword: string;
  supportingKeywords: readonly string[];
  title: string;
  description: string;
  h1: string;
  opening: string;
  ogTitle: string;
  ogDescription: string;
};

export const SIGNATURE_SEO: Record<string, SignatureSeoEntry> = {
  "arrabida-wine-allinclusive": {
    primaryKeyword: "lisbon wine tour",
    supportingKeywords: [
      "arrabida wine tour",
      "private wine tour lisbon",
      "private arrabida wine tour from lisbon",
      "azeitao wine tasting",
    ],
    title: "Private Lisbon Wine Tour — Arrábida & Azeitão | YES",
    h1: "Private Arrábida wine tour from Lisbon",
    opening: "Explore Arrábida and Azeitão on a private wine day from Lisbon, with two family wineries included, Setúbal Moscatel, Livramento Market and lunch.",
    description:
      "Private Lisbon wine tour to Arrábida with 2 family wineries included, Setúbal Moscatel, Livramento Market, Azeitão lunch and hotel pickup. Instant confirmation.",
    ogTitle: "Private Lisbon Wine Tour in Arrábida",
    ogDescription:
      "A private wine day from Lisbon with family cellars, Setúbal Moscatel, market, lunch and door-to-door pickup.",
  },
  "wild-beaches-picnic": {
    primaryKeyword: "day trips from lisbon",
    supportingKeywords: ["arrabida day trip from lisbon", "lisbon coastal tour"],
    title: "Arrábida Beach Picnic from Lisbon — Private Day Trip",
    h1: "Private Arrábida beach picnic from Lisbon",
    opening: "Take a private day trip from Lisbon to Arrábida's coastal viewpoints and coves, with a beach picnic chosen at Livramento Market and time in Sesimbra.",
    description:
      "A private Arrábida day trip from Lisbon with coastal viewpoints, hidden coves, a beach picnic of local produce and a relaxed Sesimbra finish.",
    ogTitle: "Private Arrábida Day Trip with Beach Picnic",
    ogDescription:
      "Leave Lisbon for Arrábida viewpoints, quiet coves, a private beach picnic and a relaxed end in Sesimbra.",
  },
  "arrabida-boat": {
    primaryKeyword: "arrabida boat tour",
    supportingKeywords: ["private boat tour lisbon", "arrabida day trip from lisbon", "sesimbra day trip from lisbon"],
    title: "Private Arrábida Boat Tour from Lisbon & Sesimbra",
    h1: "Private Arrábida boat tour and Sesimbra coast",
    opening: "Travel from Lisbon to Arrábida and Sesimbra for a private coastal day with the Sesimbra boat tour, Lapa de Santa Margarida and Cabo Espichel.",
    description:
      "Arrábida boat tour from Lisbon: a private coastal day with a boat ride into hidden coves, a market visit and Atlantic viewpoints in Sesimbra.",
    ogTitle: "Arrábida & Sesimbra Private Boat Day from Lisbon",
    ogDescription:
      "A private coastal day with Arrábida by road, a Sesimbra boat ride into hidden coves and Atlantic viewpoints.",
  },
  "p23-artisan-pottery-cork": {
    primaryKeyword: "cork and pottery workshop alentejo",
    supportingKeywords: ["pottery workshop portugal", "private alentejo day trip from lisbon"],
    title: "Alentejo Cork & Pottery Workshops from Lisbon | YES",
    h1: "Private Alentejo cork and pottery workshops",
    opening: "Spend a private day from Lisbon with Alentejo makers: work with cork, enjoy the included lunch and shape clay in a three-hour pottery workshop.",
    description:
      "Meet Alentejo makers on a private day of hands-on cork and pottery workshops. Ceramics session, local guide, lunch and transport included. From €203 per person.",
    ogTitle: "Private Alentejo Cork & Pottery Workshops",
    ogDescription:
      "A private, hands-on day with Alentejo cork and clay makers. Guide, lunch and transport included.",
  },
  "tiles-workshop": {
    primaryKeyword: "azulejo tile painting workshop lisbon",
    supportingKeywords: ["portuguese tile workshop lisbon", "things to do in lisbon portugal"],
    title: "Private Azulejo Painting Workshop from Lisbon | YES",
    h1: "Private azulejo tile painting workshop from Lisbon",
    opening: "Paint a Portuguese azulejo with an artisan in Azeitão, then taste regional wine and visit Sesimbra on this private day from Lisbon.",
    description:
      "Paint a Portuguese azulejo with a master artisan, taste Setúbal wine and visit Sesimbra on this private full-day experience from Lisbon.",
    ogTitle: "Private Azulejo Tile Workshop from Lisbon",
    ogDescription:
      "Paint your own Portuguese tile with a master artisan, then enjoy regional wine and the Sesimbra coast.",
  },
  "azeitao-cheese": {
    primaryKeyword: "wine tasting lisbon",
    supportingKeywords: ["lisbon wine tour", "wine tasting near lisbon"],
    title: "Azeitão Cheese Making & Wine Tasting near Lisbon",
    h1: "Azeitão cheese making and wine tasting near Lisbon",
    opening: "Make Azeitão cheese by hand, taste wine at a family winery and finish in Sesimbra on a private food-and-wine day from Lisbon.",
    description:
      "Wine tasting near Lisbon with hands-on Azeitão cheese making, a private family winery visit, Sesimbra and door-to-door pickup.",
    ogTitle: "Azeitão Cheese Making & Wine Tasting Near Lisbon",
    ogDescription:
      "A private food-and-wine day with hands-on cheese making, a family winery tasting and time in Sesimbra.",
  },
  "sintra-cascais": {
    primaryKeyword: "sintra day tour from lisbon",
    supportingKeywords: ["sintra tours from lisbon", "sintra private tour"],
    title: "Private Sintra & Cascais Tour from Lisbon | YES",
    h1: "Private Sintra and Cascais day tour from Lisbon",
    opening: "Choose one Sintra palace and a Colares wine visit, or two palaces, before Cabo da Roca and Cascais on a private day from Lisbon.",
    description:
      "Private Sintra day tour from Lisbon with a flexible palace choice, Cabo da Roca, Cascais and either Colares wine or a second palace.",
    ogTitle: "Private Sintra & Cascais Day Tour from Lisbon",
    ogDescription:
      "Choose a Sintra palace, then continue privately to Cabo da Roca, Cascais and a Colares wine visit or second palace.",
  },
  "troia-comporta": {
    primaryKeyword: "comporta day trip from lisbon",
    supportingKeywords: ["private tours lisbon", "troia tour from lisbon"],
    title: "Private Tróia & Comporta Day Trip from Lisbon",
    h1: "Private Tróia and Comporta day trip from Lisbon",
    opening: "Cross the Sado by ferry to Tróia's Roman ruins, the Carrasqueira stilt pier, Comporta's Atlantic beaches and a local winery tasting.",
    description:
      "Private Comporta day trip from Lisbon by Sado ferry, with Tróia’s Roman ruins, Carrasqueira stilt pier, Atlantic beaches and wine tasting.",
    ogTitle: "Private Tróia & Comporta Day Trip from Lisbon",
    ogDescription:
      "Cross the Sado by ferry for Roman ruins, the Carrasqueira stilt pier, Comporta beaches and a winery tasting.",
  },
  "evora-alentejo": {
    primaryKeyword: "evora day trip from lisbon",
    supportingKeywords: ["alentejo wine tour", "portugal wine tours"],
    title: "Private Évora & Alentejo Wine Tour from Lisbon",
    h1: "Private Évora and Alentejo wine tour from Lisbon",
    opening: "Visit Évora's Roman Temple and Chapel of Bones, two selected Alentejo wineries and a traditional cork-production site on a private day from Lisbon.",
    description:
      "Private Évora day trip from Lisbon with the Roman Temple, Chapel of Bones, two selected Alentejo wineries and a traditional cork visit.",
    ogTitle: "Private Évora & Alentejo Wine Tour from Lisbon",
    ogDescription:
      "Walk UNESCO Évora, visit the Chapel of Bones and taste at two selected Alentejo wineries on a private day.",
  },
  "tomar-coimbra": {
    primaryKeyword: "tomar day trip from lisbon",
    supportingKeywords: ["coimbra day trip from lisbon", "private tours portugal"],
    title: "Private Tomar & Coimbra Templar Tour from Lisbon",
    h1: "Private Tomar and Coimbra tour from Lisbon",
    opening: "Travel privately from Lisbon to Tomar's Convent of Christ and Coimbra's historic university and old town in one inland day.",
    description:
      "Private day trip from Lisbon to Tomar’s Templar Convent of Christ and Coimbra’s ancient university, Joanina Library and old town.",
    ogTitle: "Private Tomar & Coimbra Day Trip from Lisbon",
    ogDescription:
      "Explore Tomar’s Templar heritage and Coimbra’s university, library and old town with a private local guide.",
  },
  "fatima-nazare-obidos": {
    primaryKeyword: "fatima day trip from lisbon",
    supportingKeywords: ["nazare day trip from lisbon", "obidos day trip from lisbon"],
    title: "Private Fátima, Nazaré & Óbidos Tour from Lisbon",
    h1: "Private Fátima, Nazaré and Óbidos day trip",
    opening: "Visit the Sanctuary of Fátima, Nazaré's Atlantic viewpoint and medieval Óbidos, with a Ginjinha tasting, on a private day from Lisbon.",
    description:
      "Private Fátima day trip from Lisbon with the sanctuary, Nazaré’s Atlantic cliffs, medieval Óbidos and a traditional Ginjinha tasting.",
    ogTitle: "Private Fátima, Nazaré & Óbidos Day from Lisbon",
    ogDescription:
      "Visit Fátima sanctuary, Nazaré’s Atlantic viewpoint and medieval Óbidos in one private day from Lisbon.",
  },
  "roman-heritage-alentejo": {
    primaryKeyword: "alentejo wine tour",
    supportingKeywords: ["portugal wine tours", "private tours portugal"],
    title: "Alentejo Talha Wine & Roman Heritage Tour | YES",
    h1: "Private Alentejo talha wine and Roman heritage tour",
    opening: "Explore São Cucufate's Roman ruins and Alentejo's clay-amphora wine tradition with a family cellar on a private inland day from Lisbon.",
    description:
      "Private Alentejo wine tour from Lisbon with São Cucufate Roman ruins, clay-amphora talha wine, a family cellar and a quiet village.",
    ogTitle: "Private Roman Heritage & Alentejo Wine Tour",
    ogDescription:
      "Follow 2,000 years of Alentejo wine through Roman ruins, clay talhas, a family cellar and a whitewashed village.",
  },
  "southwest-vicentine-coast": {
    primaryKeyword: "vicentine coast tour from lisbon",
    supportingKeywords: ["southwest portugal coast tour", "private portugal coastal tour"],
    title: "Private Vicentine Coast Day Trip from Lisbon | YES",
    h1: "Private Vicentine Coast tour from Lisbon",
    opening: "Follow Portugal's southwest coast from Lisbon through Porto Covo and Vila Nova de Milfontes to protected Atlantic cliffs, Odeceixe and Aljezur.",
    description:
      "Private day trip from Lisbon along the Vicentine Coast through Porto Covo, Milfontes, protected Atlantic cliffs, Odeceixe and Aljezur.",
    ogTitle: "Private Vicentine Coast Day Trip from Lisbon",
    ogDescription:
      "A long private coastal day through fishing villages, protected cliffs and the river-meets-ocean landscape at Odeceixe.",
  },
};

export function getSignatureSeo(tourId: string): SignatureSeoEntry | undefined {
  return SIGNATURE_SEO[tourId];
}