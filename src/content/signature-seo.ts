/**
 * US search-intent map for the 12 Signature experiences.
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
    title: "Lisbon Wine Tour — Private Arrábida Day | YES",
    description:
      "Private Lisbon wine tour to Arrábida with 2–3 family wineries, Setúbal Moscatel, Livramento Market, Azeitão lunch and hotel pickup.",
    ogTitle: "Private Lisbon Wine Tour in Arrábida",
    ogDescription:
      "A private wine day from Lisbon with family cellars, Setúbal Moscatel, market, lunch and door-to-door pickup.",
  },
  "wild-beaches-picnic": {
    primaryKeyword: "day trips from lisbon",
    supportingKeywords: ["arrabida day trip from lisbon", "lisbon coastal tour"],
    title: "Arrábida Day Trip from Lisbon — Private Beach Picnic",
    description:
      "A private Arrábida day trip from Lisbon with coastal viewpoints, hidden coves, a beach picnic of local produce and a relaxed Sesimbra finish.",
    ogTitle: "Private Arrábida Day Trip with Beach Picnic",
    ogDescription:
      "Leave Lisbon for Arrábida viewpoints, quiet coves, a private beach picnic and a relaxed end in Sesimbra.",
  },
  "arrabida-boat": {
    primaryKeyword: "private boat tour lisbon",
    supportingKeywords: ["arrabida day trip from lisbon", "sesimbra day trip from lisbon"],
    title: "Private Boat Tour from Lisbon — Arrábida & Sesimbra",
    description:
      "Private day from Lisbon to Arrábida and Sesimbra with a coastal boat ride into hidden coves, market visit and dramatic Atlantic viewpoints.",
    ogTitle: "Arrábida & Sesimbra Private Boat Day from Lisbon",
    ogDescription:
      "A private coastal day with Arrábida by road, a Sesimbra boat ride into hidden coves and Atlantic viewpoints.",
  },
  "tiles-workshop": {
    primaryKeyword: "azulejo tile painting workshop lisbon",
    supportingKeywords: ["portuguese tile workshop lisbon", "things to do in lisbon portugal"],
    title: "Azulejo Tile Painting Workshop from Lisbon | YES",
    description:
      "Paint a Portuguese azulejo with a master artisan, taste Setúbal wine and visit Sesimbra on this private full-day experience from Lisbon.",
    ogTitle: "Private Azulejo Tile Workshop from Lisbon",
    ogDescription:
      "Paint your own Portuguese tile with a master artisan, then enjoy regional wine and the Sesimbra coast.",
  },
  "azeitao-cheese": {
    primaryKeyword: "wine tasting lisbon",
    supportingKeywords: ["lisbon wine tour", "wine tasting near lisbon"],
    title: "Wine Tasting Near Lisbon — Azeitão Cheese Day",
    description:
      "Wine tasting near Lisbon with hands-on Azeitão cheese making, a private family winery visit, Sesimbra and door-to-door pickup.",
    ogTitle: "Azeitão Cheese Making & Wine Tasting Near Lisbon",
    ogDescription:
      "A private food-and-wine day with hands-on cheese making, a family winery tasting and time in Sesimbra.",
  },
  "sintra-cascais": {
    primaryKeyword: "sintra day tour from lisbon",
    supportingKeywords: ["sintra tours from lisbon", "sintra private tour"],
    title: "Sintra Day Tour from Lisbon — Private Cascais & Wine",
    description:
      "Private Sintra day tour from Lisbon with a flexible palace choice, Cabo da Roca, Cascais and either Colares wine or a second palace.",
    ogTitle: "Private Sintra & Cascais Day Tour from Lisbon",
    ogDescription:
      "Choose a Sintra palace, then continue privately to Cabo da Roca, Cascais and a Colares wine visit or second palace.",
  },
  "troia-comporta": {
    primaryKeyword: "comporta day trip from lisbon",
    supportingKeywords: ["private tours lisbon", "troia tour from lisbon"],
    title: "Comporta Day Trip from Lisbon — Private Tróia Tour",
    description:
      "Private Comporta day trip from Lisbon by Sado ferry, with Tróia’s Roman ruins, Carrasqueira stilt pier, Atlantic beaches and wine tasting.",
    ogTitle: "Private Tróia & Comporta Day Trip from Lisbon",
    ogDescription:
      "Cross the Sado by ferry for Roman ruins, the Carrasqueira stilt pier, Comporta beaches and a winery tasting.",
  },
  "evora-alentejo": {
    primaryKeyword: "evora day trip from lisbon",
    supportingKeywords: ["alentejo wine tour", "portugal wine tours"],
    title: "Évora Day Trip from Lisbon — Private Alentejo Wine Tour",
    description:
      "Private Évora day trip from Lisbon with the Roman Temple, Chapel of Bones, two selected Alentejo wineries and a traditional cork visit.",
    ogTitle: "Private Évora & Alentejo Wine Tour from Lisbon",
    ogDescription:
      "Walk UNESCO Évora, visit the Chapel of Bones and taste at two selected Alentejo wineries on a private day.",
  },
  "tomar-coimbra": {
    primaryKeyword: "tomar day trip from lisbon",
    supportingKeywords: ["coimbra day trip from lisbon", "private tours portugal"],
    title: "Tomar & Coimbra Day Trip from Lisbon — Private Tour",
    description:
      "Private day trip from Lisbon to Tomar’s Templar Convent of Christ and Coimbra’s ancient university, Joanina Library and old town.",
    ogTitle: "Private Tomar & Coimbra Day Trip from Lisbon",
    ogDescription:
      "Explore Tomar’s Templar heritage and Coimbra’s university, library and old town with a private local guide.",
  },
  "fatima-nazare-obidos": {
    primaryKeyword: "fatima day trip from lisbon",
    supportingKeywords: ["nazare day trip from lisbon", "obidos day trip from lisbon"],
    title: "Fátima Day Trip from Lisbon — Nazaré & Óbidos Private Tour",
    description:
      "Private Fátima day trip from Lisbon with the sanctuary, Nazaré’s Atlantic cliffs, medieval Óbidos and a traditional Ginjinha tasting.",
    ogTitle: "Private Fátima, Nazaré & Óbidos Day from Lisbon",
    ogDescription:
      "Visit Fátima sanctuary, Nazaré’s Atlantic viewpoint and medieval Óbidos in one private day from Lisbon.",
  },
  "roman-heritage-alentejo": {
    primaryKeyword: "alentejo wine tour",
    supportingKeywords: ["portugal wine tours", "private tours portugal"],
    title: "Alentejo Wine Tour — Private Roman Heritage Day",
    description:
      "Private Alentejo wine tour from Lisbon with São Cucufate Roman ruins, clay-amphora talha wine, a family cellar and a quiet village.",
    ogTitle: "Private Roman Heritage & Alentejo Wine Tour",
    ogDescription:
      "Follow 2,000 years of Alentejo wine through Roman ruins, clay talhas, a family cellar and a whitewashed village.",
  },
  "southwest-vicentine-coast": {
    primaryKeyword: "vicentine coast tour from lisbon",
    supportingKeywords: ["southwest portugal coast tour", "private portugal coastal tour"],
    title: "Vicentine Coast Day Trip from Lisbon — Private Tour",
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