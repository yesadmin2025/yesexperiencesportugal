// rev 3 — multi-photo Viator galleries + per-stop images
//
// SOURCE-OF-TRUTH RULE (do not violate):
// Each tour's `stops[]` MUST mirror the ordered itinerary on the matching
// Viator product page. Do not add stops, meals, activities, timing claims,
// or descriptors that are not on the Viator page. AI writes tone only —
// never invents itinerary facts. When the Viator page changes, update
// `stops[]` here to match; do not diverge for storytelling.
// -----------------------------------------------------------------------------
// Each tour now has:
//   - `img`  → hero photo (used on cards, hero, og:image)
//   - `gallery` → 3–4 supporting Viator photos for the detail page
//   - `stops[].image` (optional) → explicit per-stop photo. When absent, the
//     stop falls back to the tour hero via `STOP_THEME_IMG[imageTheme]`.
//
// All photos are sourced from the live Viator product galleries
// (media.tacdn.com), downloaded once at the largest available variant
// (720x480), then upscaled with Lanczos + light unsharp to ~1600w for crisp
// retina rendering. No stock photography is used anywhere on the site.

// ── Hero photos (one per tour, also used for cards + og:image) ─────────────
import imgArrabidaBoatHero from "@/assets/tours/arrabida-boat/hero.jpg";
import imgArrabidaWineHero from "@/assets/tours/arrabida-wine-allinclusive/hero.jpg";
import imgAzeitaoCheeseHero from "@/assets/tours/azeitao-cheese/hero.jpg";
import imgSintraCascaisHero from "@/assets/tours/sintra-cascais/hero.jpg";
import imgTroiaComportaHero from "@/assets/tours/troia-comporta/hero.jpg";
import imgTomarCoimbraHero from "@/assets/tours/tomar-coimbra/hero.jpg";
import imgFatimaNazareObidosHero from "@/assets/tours/fatima-nazare-obidos/hero.jpg";
// Tours without a per-stop folder yet — keep the original single photos.
import imgEvoraAlentejo from "@/assets/tours/evora-alentejo.jpg";
import imgTilesWorkshop from "@/assets/tours/tiles-workshop.jpg";
import imgWildBeachesPicnic from "@/assets/tours/wild-beaches-picnic.jpg";

// ── Per-stop / gallery photos for the 7 tours with full Viator galleries ──
import imgArrabidaWineViewpoint from "@/assets/tours/arrabida-wine-allinclusive/viewpoint.jpg";
import imgArrabidaWineWinery from "@/assets/tours/arrabida-wine-allinclusive/winery.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgArrabidaWineSesimbra from "@/assets/tours/arrabida-wine-allinclusive/sesimbra.jpg";

import imgArrabidaBoatCoves from "@/assets/tours/arrabida-boat/coves.jpg";
import imgArrabidaBoatPortinho from "@/assets/tours/arrabida-boat/portinho.jpg";
import imgArrabidaBoatSesimbra from "@/assets/tours/arrabida-boat/sesimbra.jpg";
import imgArrabidaBoatExtra from "@/assets/tours/arrabida-boat/extra.jpg";

import imgAzeitaoWorkshop from "@/assets/tours/azeitao-cheese/workshop.jpg";
import imgAzeitaoWinery from "@/assets/tours/azeitao-cheese/winery.jpg";
import imgAzeitaoSesimbra from "@/assets/tours/azeitao-cheese/sesimbra.jpg";
import imgAzeitaoExtra from "@/assets/tours/azeitao-cheese/extra.jpg";

import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";
import imgSintraCabo from "@/assets/tours/sintra-cascais/cabo-da-roca.jpg";
import imgSintraCascais2 from "@/assets/tours/sintra-cascais/cascais.jpg";
import imgSintraExtra from "@/assets/tours/sintra-cascais/extra.jpg";

import imgTroiaFerry from "@/assets/tours/troia-comporta/ferry.jpg";
import imgTroiaRuins from "@/assets/tours/troia-comporta/ruins.jpg";
import imgTroiaBeach from "@/assets/tours/troia-comporta/beach.jpg";
import imgTroiaExtra from "@/assets/tours/troia-comporta/extra.jpg";

import imgTomarConvento from "@/assets/tours/tomar-coimbra/convento.jpg";
import imgTomarCoimbra2 from "@/assets/tours/tomar-coimbra/coimbra.jpg";
import imgTomarMondego from "@/assets/tours/tomar-coimbra/mondego.jpg";
import imgTomarExtra from "@/assets/tours/tomar-coimbra/extra.jpg";

import imgFatimaSanctuary from "@/assets/tours/fatima-nazare-obidos/fatima.jpg";
import imgFatimaNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import imgFatimaObidos from "@/assets/tours/fatima-nazare-obidos/obidos.jpg";
import imgFatimaExtra from "@/assets/tours/fatima-nazare-obidos/extra.jpg";

import imgRomanHero from "@/assets/tours/roman-heritage-alentejo/hero.jpg";
import imgRomanRuins from "@/assets/tours/roman-heritage-alentejo/ruins.jpg";
import imgRomanVillage from "@/assets/tours/roman-heritage-alentejo/village.jpg";
import imgRomanWinery from "@/assets/tours/roman-heritage-alentejo/winery.jpg";
import imgRomanRiver from "@/assets/tours/roman-heritage-alentejo/river.jpg";

export type TourSeed = {
  region?: string;
  duration?: string;
  styles?: string[];
  highlights?: string[];
  pace?: string;
  tier?: string;
  groupType?: string;
  guests?: string;
};

/** Used by older code paths to fall back to the tour hero when a stop has
 *  no explicit `image` override. */
export type StopTheme =
  | "arrabida-boat"
  | "arrabida-wine-allinclusive"
  | "azeitao-cheese"
  | "evora-alentejo"
  | "fatima-nazare-obidos"
  | "roman-heritage-alentejo"
  | "sintra-cascais"
  | "southwest-vicentine-coast"
  | "tiles-workshop"
  | "tomar-coimbra"
  | "troia-comporta"
  | "wild-beaches-picnic";

/** A single stop along a Signature tour. `image` is the explicit per-stop
 *  photo when available; otherwise the stop falls back to the tour hero
 *  via `STOP_THEME_IMG[imageTheme]`.
 *
 *  `focal` controls the CSS object-position used when the photo is cropped
 *  into a tile (default `center`). Override per-stop when the subject lives
 *  off-center so the crop stays beautiful at every breakpoint. */
export type TourStop = {
  label: string;
  story: string;
  imageTheme: StopTheme;
  image?: string;
  focal?: string;
};

export type SignatureTour = {
  id: string;
  title: string;
  region: string;
  duration: string;
  durationHours: string;
  priceFrom: number; // EUR — guide price, final cost confirmed at booking
  theme: string;
  blurb: string; // one-line card teaser
  intro: string; // 2–3 sentence opening on detail page
  /** Optional editorial context paragraph shown under the intro. */
  contextParagraph?: string;
  /** Optional link back to a related Local Story or guide, shown under intro. */
  contextLink?: { href: string; label: string };
  fitsBest: string;
  pace: string[];
  stops: TourStop[];
  highlights: string[];
  included: string[];
  idealFor: string[];
  notes: string[];
  img: string; // hero photo of this tour
  /** Default object-position for the hero crop (e.g. "50% 35%"). */
  focal?: string;
  /** Supporting Viator photos used in the detail-page gallery strip. */
  gallery?: string[];
  /** Internal reference — used by the importer & admin tools. Never linked. */
  bookingUrl: string;
  /** Deprecated — kept for compatibility with older importer code. */
  tripadvisorUrl?: string;
  seed: TourSeed;
  /**
   * SEO overrides for /tours/$id head(). When present they replace the
   * auto-built `<title>` / `description` — used to align the top SEO
   * focus tours with Phase-2 title conventions.
   */
  seoTitle?: string;
  seoDescription?: string;
  /**
   * Phase-2 i18n architecture (see src/i18n/tour-i18n.ts).
   * When true, the /pt/tours/<id> route is published and included in
   * the PT sitemap + hreflang set. Defaults to false — PT requests
   * for un-ready tours fall back to EN content silently.
   */
  ptReady?: boolean;
  /**
   * Optional per-locale overlay for translatable fields.
   * Populated during Phase 3 (human European Portuguese copy).
   * Shape: see `TourI18nMap` in src/i18n/tour-i18n.ts.
   */
  i18n?: Partial<Record<"en" | "pt", import("@/i18n/tour-i18n").TourLocaleOverlay>>;
  /**
   * Optional plain-language rule shown under the SignatureRouteMap
   * stop list. Use ONLY when the number of stops varies at run time
   * (e.g. "2 or 3 wineries depending on availability"). Owner-authored;
   * no invention. Absent → no extra legend line.
   */
  wineriesRule?: string;
};

/** Deprecated. The site no longer links to any external review platform. */
export function tripadvisorHrefFor(tour: SignatureTour): string {
  return tour.tripadvisorUrl ?? "";
}

export function findTour(id: string): SignatureTour | undefined {
  return signatureTours.find((t) => t.id === id);
}

/** True if the given id exists in the active catalog. */
export function isValidTourId(id: string | null | undefined): boolean {
  if (!id) return false;
  return signatureTours.some((t) => t.id === id);
}

/** Filter a list of tour ids down to the ones that exist in the catalog. */
export function filterValidTourIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  return ids.filter((id): id is string => isValidTourId(id));
}

export const signatureTours: SignatureTour[] = [
  {
    id: "arrabida-wine-allinclusive",
    title: "Arrábida Private Wine Tour from Lisbon — All-Inclusive",
    seoTitle: "Arrábida Wine Tour from Lisbon — Private, All-Inclusive",
    seoDescription:
      "Private Arrábida wine tour from Lisbon, from €135 per person: 2–3 family wineries, Moscatel de Setúbal tastings, Livramento market and a long Azeitão lunch. Licensed operator, 700+ 5-star reviews, door-to-door pickup, instant confirmation.",
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "7–9h",
    priceFrom: 135,
    wineriesRule:
      "You'll visit 2 or 3 of these wineries — the exact count depends on the experience you choose and same-day availability.",
    theme: "Wine",
    blurb:
      "A private wine tour from Lisbon to the Arrábida hills — two or three family wineries, Livramento market and a long traditional lunch in Azeitão, handled door to door.",

    intro:
      "The most-loved YES private wine tour from Lisbon, in one word: complete. We leave the city for the Arrábida hills, walk the Livramento market, sit down for an unhurried Portuguese lunch in Azeitão and visit two or three small family wineries. An optional viewpoint at Cristo Rei or Sesimbra Castle closes the day.",
    contextParagraph:
      "A private Arrábida wine tour from Lisbon runs about 7–9 hours door to door, with hotel or apartment pickup in Lisbon and a private vehicle and guide for your group only. The day combines Arrábida, Setúbal and Azeitão: the Livramento market early, two or three small family wineries with tastings of Moscatel de Setúbal and small-producer reds, and an unhurried traditional lunch in Azeitão, with an optional viewpoint at Cristo Rei or Sesimbra Castle to close. Wine tastings, lunch and all transport are included in the price from €135 per person. YES experiences is a licensed Portuguese tour operator with more than 700 five-star reviews, and dates confirm instantly — so you can book the day rather than negotiate it.",
    contextLink: {
      href: "/local-stories/arrabida-wine-tour",
      label: "Read more about wine in Arrábida and Setúbal",
    },
    fitsBest: "Couples · friends · wine-curious travelers",
    pace: ["Two or three wineries", "Long Azeitão lunch", "Optional viewpoint close"],
    stops: [
      {
        label: "Mercado do Livramento",
        story:
          "Setúbal's 145-year-old market — fresh fish, oysters, regional cheese and Moscatel before the day even begins.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Santuário Nacional de Cristo Rei",
        story:
          "Optional opening viewpoint over Lisbon and the Tagus — the bridge gleaming below, the city laid out at your feet.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineViewpoint,
        focal: "50% 40%",
      },
      {
        label: "Parque Natural da Arrabida",
        story:
          "Drive the panoramic road above the bay — turquoise water, cork-oak hills, no crowds.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Azulejos de Azeitao",
        story:
          "Working tile factory in Azeitão — five centuries of cobalt-blue azulejo, still hand-painted.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "House & Museum José Maria Da Fonseca",
        story:
          "Seven generations of family winemaking since 1834 — cellar walk and tasting at one of Portugal's founding houses.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineWinery,
        focal: "50% 45%",
      },
      {
        label: "Quinta do Piloto",
        story: "An itinerary option — tradition meets innovation, vineyards opening to the hills.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Farm Catralvos",
        story:
          "Quinta de Catralvos — small family producer where you taste at least five wines, label to bottle.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Adega Coop. de Palmela, C.R.L.",
        story:
          "Optional cellar visit — historic vineyards, time-honoured techniques and a curated tasting.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Bacalhoa Vinhos de Portugal",
        story: "Quinta da Bacalhôa — modern winery paired with a striking art collection.",
        imageTheme: "arrabida-wine-allinclusive",
      },
      {
        label: "Azeitao — long traditional lunch",
        story: "Regional plates and paired wines at a quiet restaurant in the wine village.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineLunch,
        focal: "50% 50%",
      },
      {
        label: "Castelo de Sesimbra",
        story:
          "Optional close at the last medieval castle still standing by the sea — Atlantic views, the harbour below.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineSesimbra,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "2 or 3 private tastings at family-run wineries in Azeitão and Setúbal",
      "Taste Moscatel de Setúbal and small-producer reds",
      "Cristo Rei panorama over Lisbon and the Tagus",
      "Traditional Portuguese lunch with paired wines",
      "Visit to the Livramento tile-clad market",
      "Panoramic drive through Arrábida Natural Park",
      "Door-to-door private transfers from Lisbon",
    ],
    included: [
      "Visit 2 or 3 wineries (depending on the experience you choose)",
      "Alcoholic Beverages",
      "Snacks",
      "Lunch",
      "Private transportation",
      "Be accompanied by a local certified guide, ensuring a personalized and authentic experience",
      "Visit to Livramento Market and Tile Factory and Arrabida Natural Park",
      "Enjoy an optional stop at Christ the King or Sesimbra Castle, depending on your pace and preferences",
    ],
    idealFor: [
      "Wine-curious travelers (no expertise needed)",
      "Couples celebrating a small occasion",
      "Friends wanting one well-organised day out of the city",
    ],
    notes: [
      "Designation of origin in Setúbal is famous for Moscatel — your guide tailors the order to your palate.",
    ],
    img: imgArrabidaWineHero,
    focal: "50% 45%",
    gallery: [
      imgArrabidaWineViewpoint,
      imgArrabidaWineWinery,
      imgArrabidaWineLunch,
      imgArrabidaWineSesimbra,
    ],
    bookingUrl: "https://yesexperiences.pt/tour/private-full-day-wine-tour-setubal-arrabida/",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["wine", "gastronomy"],
      highlights: ["tasting", "livramento", "viewpoint", "sesimbra"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "wild-beaches-picnic",
    title: "Lisbon Coastal Tour — Arrábida, Sesimbra & Beach Picnic",
    seoTitle: "Arrábida Beach Picnic Tour from Lisbon | Private Coastal Day",
    seoDescription:
      "Private Arrábida coastal tour from Lisbon with hidden coves, a beach picnic of local produce and wine, and a slow end in Sesimbra.",
    region: "Arrábida · Sesimbra",
    duration: "Full Day",
    durationHours: "7h30",
    priceFrom: 118,
    theme: "Coastal",
    blurb:
      "A private coastal day — Arrábida viewpoints, hidden coves and a slow picnic on a quiet beach.",
    intro:
      "The good parts of the Lisbon coast aren't on the postcards. We take the small roads into Arrábida, drop down to the coves locals keep to themselves, and set a picnic on the sand with the natural park behind us. No queues, no rush.",
    fitsBest: "Couples · families · slow travelers",
    pace: ["Arrábida viewpoints", "Hidden cove picnic", "Sesimbra"],
    stops: [
      {
        label: "Mercado do Livramento",
        story:
          "Pick the picnic together — fresh bread, cheese, fruit, cured meats and wine from one of the world's best markets.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Parque Natural da Arrabida",
        story: "Cliffs, cork oaks and golden coves — the road climbs into the protected park.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Portinho da Arrabida",
        story: "The signature turquoise bay — white sand, clear water, the cliffs rising behind.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Praia de Galapinhos",
        story: "A secluded cove voted one of Europe's most beautiful beaches.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Lapa de Santa Margarida",
        story: "A hidden sea cave with a tiny chapel inside — unexpected silence inside the park.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Cabo Espichel",
        story: "Wild cliffs, an Atlantic lighthouse and the Sanctuary of Our Lady of the Cape.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Praia das Bicas",
        story: "Wild surf beach south of Sesimbra — a candidate picnic spot depending on wind.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Praia do Meco",
        story:
          "Long Atlantic sand — another candidate for the picnic, the guide chooses on the day.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Castelo de Sesimbra",
        story: "Medieval castle high above the fishing town — Atlantic views in every direction.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Sesimbra",
        story: "End in the fishing village — a quiet stroll along the harbour at dusk.",
        imageTheme: "wild-beaches-picnic",
      },
    ],
    highlights: [
      "Private coastal route through Arrábida Natural Park",
      "Beach picnic with local produce and wine",
      "Quiet coves the bus tours never reach",
      "Stop in Sesimbra fishing village",
    ],
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "Private Picnic with local cheeses, bread, smoked meats, pastries, fruit, wine, juice and water",
      "Bottled water",
      "All Fees and Taxes",
      "Local certified tour guide",
      "Private pick-up and drop-off in Lisbon, Setúbal, Almada and Sesimbra",
    ],
    idealFor: [
      "Couples wanting a slow, sea-led day",
      "Families with kids of any age",
      "Travelers who prefer landscape over cities",
    ],
    notes: [
      "Picnic spot is chosen on the day depending on wind and sea conditions.",
      "Bring swimwear and a light layer.",
    ],
    img: imgWildBeachesPicnic,
    focal: "50% 50%",
    bookingUrl:
      "https://yesexperiences.pt/tour/4x4-jeep-and-beach-private-tour-in-arrabida-sesimbra-with-picnic/",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["coastal", "nature"],
      highlights: ["viewpoint", "portinho", "sesimbra"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "arrabida-boat",
    title: "Arrábida & Sesimbra Private Tour with Coastal Boat Ride",
    seoTitle: "Arrábida & Sesimbra Private Boat Tour from Lisbon | YES",
    seoDescription:
      "Private Arrábida day trip from Lisbon with a coastal boat ride into hidden coves, seafood lunch and golden-hour Sesimbra. All-inclusive.",
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "6–8h",
    priceFrom: 135,
    theme: "Coastal",
    blurb:
      "A private Arrábida day with the Sesimbra Coastal Boat Tour, Lapa de Santa Margarida and the cliffs of Cabo Espichel.",
    intro:
      "A day told by the sea. It begins at Livramento Market, then follows the coast into the Arrábida Natural Park, past Lapa de Santa Margarida and out on the Sesimbra Coastal Boat Tour. The afternoon eases into Sesimbra and the cliffs of Cabo Espichel. Lunch can be added when you tailor the day.",
    fitsBest: "Couples · families · active travelers",
    pace: ["Arrábida by road", "Boat into the coves", "Sesimbra at dusk"],
    stops: [
      {
        label: "Mercado do Livramento",
        story:
          "Setúbal's vibrant azulejo-clad market — fresh fish, regional produce and the day's first stop.",
        imageTheme: "arrabida-boat",
      },
      {
        label: "Parque Natural da Arrabida",
        story:
          "Drive into the park — verdant hills, ocean panoramas, the road dropping toward the bay.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatCoves,
        focal: "50% 55%",
      },
      {
        label: "Lapa de Santa Margarida",
        story:
          "Boat into a hidden sea cave with a chapel inside — magical silence inside the park.",
        imageTheme: "arrabida-boat",
      },
      {
        label: "Castelo de Sesimbra",
        story: "9th-century clifftop fortress — chapel, old walls and panoramic Atlantic views.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatSesimbra,
        focal: "50% 50%",
      },
      {
        label: "Sesimbra",
        story:
          "Charming fishing village — a long lunch by the water, then a stroll along the harbour.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatPortinho,
        focal: "50% 55%",
      },
      {
        label: "Cabo Espichel",
        story:
          "Dramatic cape with a lighthouse and the Sanctuary of Our Lady of the Cape — wind, cliffs, Atlantic.",
        imageTheme: "arrabida-boat",
      },
    ],
    highlights: [
      "Boat ride into Arrábida's hidden coves",
      "Swim, snorkel or simply drift in turquoise water",
      "Seafood lunch by the harbour in Portinho",
      "Golden-hour walk in Sesimbra",
    ],
    included: [
      "Private transportation",
      "Boat Tour (3 different options)",
      "Private local tour guide",
      "Lunch (when choosing the “Arrabida Discovery Boat Tour with Lunch”)",
      "Private pick up and drop off anywhere in Lisbon, Setúbal, Sesimbra and Almada.",
      "Bottled water",
      "Air-conditioned vehicle",
      "Lunch",
      "Personal expenses",
    ],
    idealFor: [
      "Couples wanting a slow, sea-led day",
      "Active families with older children",
      "Travelers who prefer landscape over cities",
    ],
    notes: [
      "Boat departures depend on sea conditions — your guide reroutes naturally if needed.",
      "Bring swimwear and a light layer for the boat.",
    ],
    img: imgArrabidaBoatHero,
    focal: "50% 45%",
    gallery: [
      imgArrabidaBoatCoves,
      imgArrabidaBoatPortinho,
      imgArrabidaBoatSesimbra,
      imgArrabidaBoatExtra,
    ],
    bookingUrl:
      "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["coastal", "nature"],
      highlights: ["boat", "portinho", "sesimbra", "viewpoint"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "tiles-workshop",
    title: "Tile Painting Workshop, Wine Tasting & Sesimbra — Private Day",
    seoTitle: "Azulejo Tile Workshop & Wine Tasting from Lisbon | YES",
    seoDescription:
      "Paint your own Portuguese azulejo in a master atelier, taste Setúbal wines and unwind in Sesimbra on this private day from Lisbon.",
    region: "Azeitão · Sesimbra",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 135,
    theme: "Heritage",
    blurb:
      "Paint your own azulejo in a centuries-old Azeitão atelier, taste a selected regional wine, then unwind by the sea in Sesimbra.",
    intro:
      "Five centuries of tile-making in one quiet courtyard. You meet the master, mix the cobalt blue, and paint a single azulejo that becomes yours forever. The day softens from there — a glass of local wine, then the salt and sun of Sesimbra.",
    fitsBest: "Couples · creatives · families with teens",
    pace: ["Tile atelier", "Wine tasting", "Sesimbra coast"],
    stops: [
      {
        label: "Mercado do Livramento",
        story:
          "Setúbal's celebrated market — fresh fish, regional produce, 145 years of tradition.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Tile Painting Workshop – Sesimbra",
        story:
          "In Sesimbra, paint your own azulejo under a master tile-maker — five centuries of cobalt-blue tradition, hands-on.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Farm Catralvos",
        story: "Quinta de Catralvos — winery option, vineyard walk and a guided tasting.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Jose Maria de Fonseca",
        story:
          "Alternate winery option — the founding house of Setúbal Moscatel, seven generations strong.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Bacalhoa Vinhos de Portugal",
        story: "Another winery option — modern cellar paired with a striking art collection.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Castelo de Sesimbra",
        story:
          "9th-century clifftop castle — chapel adorned with 10,000 hand-painted tiles from the 1500s.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Sesimbra",
        story: "Fishing village by the Atlantic — quiet walk, fresh seafood, easy plates.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Santuario Nacional de Cristo Rei",
        story: "Closing viewpoint over the Tagus — Lisbon, the bridge and the river in one frame.",
        imageTheme: "tiles-workshop",
      },
    ],
    highlights: [
      "Paint your own azulejo with a master tile-maker",
      "Take home (or have shipped) your kiln-fired tile",
      "Tasting of regional Setúbal wines",
      "Walk and lunch along Sesimbra's harbour",
    ],
    included: [
      "Private transportation",
      "Bottled water",
      "Certified tour guide",
      "Air-conditioned vehicle",
      "Alcoholic Beverages",
      "Tiles Making Workshop and Tile Shipping",
      "All entrances",
      "Cheese tasting",
      "Lunch",
    ],
    idealFor: [
      "Couples and creative travelers",
      "Families with teenagers",
      "First-time visitors curious about Portuguese craft",
    ],
    notes: ["Tiles are fired after you leave; we ship them to your home address on request."],
    img: imgTilesWorkshop,
    focal: "50% 50%",
    bookingUrl:
      "https://yesexperiences.pt/tour/tiles-painting-workshop-with-wine-tasting-and-sesimbra-private-tour/",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["heritage", "wine"],
      highlights: ["tiles", "tasting", "sesimbra"],
      pace: "slow",
      tier: "signature",
    },
  },
  {
    id: "azeitao-cheese",
    title: "Azeitão Cheese-Making & Wine Private Tour from Lisbon",
    seoTitle: "Wine Tasting Near Lisbon — Azeitão Cheese & Wine Day",
    seoDescription:
      "Wine tasting near Lisbon in Azeitão — hands-on cheese making, a private family winery tasting and seafood in Sesimbra. Private day from Lisbon, local team.",
    region: "Azeitão · Sesimbra",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 101,
    theme: "Gastronomy",
    blurb:
      "Hands-on cheese making in Azeitão, a selected winery tasting nearby, then sea air and the castle above Sesimbra.",

    intro:
      "You won't watch — you'll work. In a small Azeitão dairy, hands deep in fresh curd, you shape the cheese that built this village's reputation. The afternoon answers with wine from the next farm and a quiet table by the sea in Sesimbra.",
    fitsBest: "Foodies · couples · curious first-timers",
    pace: ["Cheese workshop", "Winery tasting", "Sesimbra"],
    stops: [
      {
        label: "Mercado do Livramento",
        story:
          "Setúbal's celebrated market — bread, fruit, oysters and Moscatel before the workshop begins.",
        imageTheme: "azeitao-cheese",
      },
      {
        label: "Quinta Velha",
        story:
          "Private Azeitão cheese workshop — hands deep in fresh sheep's milk curd, shape your own wheel.",
        imageTheme: "azeitao-cheese",
        image: imgAzeitaoWorkshop,
        focal: "50% 50%",
      },
      {
        label: "Azeitao",
        story:
          "Lunch and free time in the picturesque wine village — toasts, regional bread, fresh cheese, jam and Moscatel.",
        imageTheme: "azeitao-cheese",
      },
      {
        label: "Farm Catralvos",
        story:
          "Quinta de Catralvos — guided cellar visit and five glasses of wine at a small Setúbal producer.",
        imageTheme: "azeitao-cheese",
        image: imgAzeitaoWinery,
        focal: "50% 45%",
      },
      {
        label: "Castelo de Sesimbra",
        story:
          "Last medieval castle still standing by the sea — Atlantic views over the fishing town below.",
        imageTheme: "azeitao-cheese",
        image: imgAzeitaoSesimbra,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "Make your own queijo de Azeitão to take home",
      "Private tasting at a small Setúbal winery",
      "Lunch or seafood snack in Sesimbra",
      "Meet the people behind both crafts",
    ],
    included: [
      "Air-conditioned vehicle",
      "Private transportation",
      "All Fees and Taxes",
      "Private Azeitão cheese workshop",
      "Toasts, regional bread, fresh cheese, buttery Azeitão cheese, homemade jam/chutney and muscat wine",
      "Bottled water",
      "Private Pick Up and Drop Off anywhere in Lisbon, Almada, Setúbal and Sesimbra",
      "Winery entrances and tastings",
      "Lunch",
    ],
    idealFor: [
      "Foodies who like to use their hands",
      "Couples and small groups of friends",
      "Anyone curious about Portuguese craft",
    ],
    notes: [
      "Vegetarian-friendly. Vegan or dairy-free guests can join the workshop and skip tastings — let us know in advance.",
    ],
    img: imgAzeitaoCheeseHero,
    focal: "50% 45%",
    gallery: [imgAzeitaoWorkshop, imgAzeitaoWinery, imgAzeitaoSesimbra, imgAzeitaoExtra],
    bookingUrl:
      "https://yesexperiences.pt/tour/journey-through-azeitao-a-unique-cheese-making-and-wine-tasting-day-out/",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["gastronomy", "wine"],
      highlights: ["cheese", "tasting", "sesimbra"],
      pace: "slow",
      tier: "signature",
    },
  },
  {
    id: "sintra-cascais",
    title: "Sintra & Cascais Private Tour — Hidden Gems & Wine Tasting",
    seoTitle: "Sintra & Cascais Private Tour from Lisbon | Hidden Gems",
    seoDescription:
      "Private Sintra and Cascais day from Lisbon — quieter palaces, Cabo da Roca, Atlantic cliffs and a local wine tasting. All-inclusive.",
    region: "Lisbon Coast",
    duration: "Full Day",
    durationHours: "8–10h",
    priceFrom: 161,
    theme: "Heritage",
    blurb:
      "A flexible palace selection in Sintra — one palace and a Colares wine visit, or two palaces — plus Cabo da Roca and Cascais.",
    intro:
      "Sintra, chosen your way: one palace visit plus a Colares wine visit, or two palace visits. From there the day heads to Azenhas do Mar, the cliffs of Cabo da Roca — the western edge of Europe — and a slow finish in Cascais.",
    fitsBest: "Couples · culture lovers · first-timers",
    pace: ["Sintra forests", "Cabo da Roca", "Cascais tasting"],
    stops: [
      {
        label: "Sintra",
        story: "UNESCO town in the hills — fairytale palaces, mossy forests, narrow lanes.",
        imageTheme: "sintra-cascais",
        image: imgSintraEstates,
        focal: "50% 45%",
      },
      {
        label: "Sintra National Palace",
        story:
          "Itinerary option — Moorish-Gothic palace with the famous twin chimneys at Sintra's heart.",
        imageTheme: "sintra-cascais",
      },
      {
        label: "Park and National Palace of Pena",
        story:
          "Itinerary option — romantic 19th-century palace on the highest hill, in vivid color.",
        imageTheme: "sintra-cascais",
      },
      {
        label: "Azenhas do Mar",
        story:
          "Lunch break and free time — whitewashed houses cascading down cliffs above the Atlantic.",
        imageTheme: "sintra-cascais",
      },
      {
        label: "Quinta da Regaleira",
        story:
          "Itinerary option — Gothic estate with mysterious tunnels, the initiation well and lush gardens.",
        imageTheme: "sintra-cascais",
      },
      {
        label: "Adega Regional de Colares",
        story:
          "Historic winery in vines planted in Atlantic sand — tasting of the rare Colares grape.",
        imageTheme: "sintra-cascais",
      },
      {
        label: "Cascais",
        story:
          "Coastal town with cobblestone streets, a quiet harbour and a glass of wine in an old courtyard.",
        imageTheme: "sintra-cascais",
        image: imgSintraCascais2,
        focal: "50% 55%",
      },
      {
        label: "Cabo Da Roca",
        story:
          "Westernmost point of mainland Europe — dramatic cliffs, wind, the Atlantic stretched flat.",
        imageTheme: "sintra-cascais",
        image: imgSintraCabo,
        focal: "50% 50%",
      },
    ],
    highlights: [
      "Quieter Sintra route — palaces without the queues",
      "Westernmost point of mainland Europe",
      "Walk through Cascais's old fishing town",
      "Private wine tasting in a local courtyard",
    ],
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "One palace ticket and wine tour and tasting OR two palace tickets per person",
      "Bottled water",
      "Certified tour guide",
      "Private pick up and drop off anywhere in Lisbon, Setúbal, Almada and Sesimbra",
      "Local pastry",
      "Lunch",
    ],
    idealFor: [
      "Couples on a first trip to Portugal",
      "Culture lovers who hate tourist queues",
      "Travelers with limited time who want depth, not a rush",
    ],
    notes: ["Palace interior tickets are optional — your guide books them on request."],
    img: imgSintraCascaisHero,
    focal: "50% 45%",
    gallery: [imgSintraEstates, imgSintraCabo, imgSintraCascais2, imgSintraExtra],
    bookingUrl:
      "https://yesexperiences.pt/tour/hidden-gems-sintra-cascais-private-tour-with-wine-tasting/",
    seed: {
      region: "lisbon",
      duration: "fullday",
      styles: ["heritage", "coastal"],
      highlights: ["tasting", "viewpoint"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "troia-comporta",
    title: "Tróia & Comporta Private Tour from Lisbon — Ruins, Wine & Coast",
    seoTitle: "Tróia & Comporta Private Tour from Lisbon | Ruins & Wine",
    seoDescription:
      "Private Alentejo coast day from Lisbon — Sado ferry, Roman ruins of Tróia, Comporta beaches, rice fields and a slow winery lunch.",
    region: "Tróia · Comporta · Alentejo",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 157,
    theme: "Coastal",
    blurb:
      "Cross the Sado by ferry to the Roman ruins of Tróia, then Comporta's stilt pier, Atlantic beaches and a Herdade da Comporta tasting.",
    intro:
      "A quiet day in the Alentejo most visitors miss. We board the ferry across the Sado to the Roman Ruins of Tróia, pause at the Carrasqueira stilt pier, then drift down to Comporta — long Atlantic beaches, rice paddies, white-and-blue villages — with a wine tasting at Herdade da Comporta. Lunch is not included, so the pace stays yours.",
    fitsBest: "Couples · slow travelers · style-led explorers",
    pace: ["Sado ferry", "Tróia ruins", "Comporta beach & lunch"],
    stops: [
      {
        label: "Baia de Setubal — Sado ferry crossing",
        story:
          "Short scenic ferry over the Sado estuary — dolphins are sometimes spotted on the way across.",
        imageTheme: "troia-comporta",
        image: imgTroiaFerry,
        focal: "50% 45%",
      },
      {
        label: "Roman Ruins of Troia",
        story:
          "One of Iberia's largest Roman fish-salting complexes — baths, tanks and 2,000-year-old structures by the sea.",
        imageTheme: "troia-comporta",
        image: imgTroiaRuins,
        focal: "50% 50%",
      },
      {
        label: "Marina de Troia",
        story:
          "A brief stop where modern architecture meets the natural shoreline — Tróia's understated luxury.",
        imageTheme: "troia-comporta",
      },
      {
        label: "Cais Palafitico do Porto da Carrasqueira",
        story:
          "Wooden fishing pier on stilts — still used by local fishermen, one of Europe's most photogenic structures.",
        imageTheme: "troia-comporta",
      },
      {
        label: "Comporta",
        story:
          "Pine forests, rice paddies, white-and-blue villages — free time for a curated lunch recommendation.",
        imageTheme: "troia-comporta",
        image: imgTroiaBeach,
        focal: "50% 60%",
      },
      {
        label: "Herdade Da Comporta",
        story:
          "Guided tasting at the region's iconic winery — sandy soils and Atlantic breeze in every glass.",
        imageTheme: "troia-comporta",
      },
      {
        label: "Comporta Beach",
        story:
          "Endless wild Atlantic sand and untouched dunes — a sense of space hard to find in Europe.",
        imageTheme: "troia-comporta",
      },
      {
        label: "Praia do Carvalhal",
        story:
          "Another stunning coastal stop — natural beauty, relaxed atmosphere, a perfect closing walk.",
        imageTheme: "troia-comporta",
      },
    ],
    highlights: [
      "Ferry crossing of the Sado estuary (dolphins often spotted)",
      "Roman ruins of Tróia by the sea",
      "Long, quiet beaches of Comporta",
      "Slow Alentejo lunch among the rice fields",
    ],
    included: [
      "Private transportation in air-conditioned vehicle",
      "Exclusive private experience with a local expert guide",
      "Ferry crossing across the Sado River (vehicle + passengers included)",
      "Guided visit to the Roman Ruins of Tróia (admission included)",
      "Wine experience at Herdade da Comporta (tasting included)",
      "Bottled water throughout the day",
      "Flexible itinerary with scenic stops and hidden gems along the coast",
      "Personalized recommendations for restaurants and local experiences",
      "Pickup and drop-off at your accommodation (Lisbon, Setúbal, Sesimbra or Almada)",
      "Lunch (we provide curated restaurant recommendations based on your preferences)",
    ],
    idealFor: [
      "Couples wanting somewhere quieter than Sintra",
      "Slow travelers and style-led explorers",
      "Anyone who already knows Cascais and Arrábida",
    ],
    notes: [
      "Lunch and tastings can be added on request — tell us your style and we'll arrange them.",
    ],
    img: imgTroiaComportaHero,
    focal: "50% 50%",
    gallery: [imgTroiaFerry, imgTroiaRuins, imgTroiaBeach, imgTroiaExtra],
    bookingUrl: "https://yesexperiences.pt/tour/private-troia-comporta-tour-from-lisbon/",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["coastal", "heritage"],
      highlights: ["viewpoint", "boat"],
      pace: "slow",
      tier: "signature",
    },
  },
  {
    id: "evora-alentejo",
    title: "Évora & Alentejo Wine Private Tour from Lisbon — Local Traditions",
    seoTitle: "Alentejo Wine Tour from Lisbon — Private Évora UNESCO Day",
    seoDescription:
      "Alentejo wine tour from Lisbon — private day to Évora's Roman temple and Chapel of Bones, two family wineries and a slow lunch in vineyard country.",
    region: "Alentejo",
    duration: "Long Day",
    durationHours: "9–11h",
    priceFrom: 169,
    theme: "Wine",
    blurb:
      "The Roman Temple and Chapel of Bones in Évora, two selected Alentejo wineries and a traditional cork-production visit.",
    intro:
      "Alentejo unwinds you. We walk Évora's historic centre slowly — the Roman Temple, the Chapel of Bones — then head into two selected Alentejo wineries and a traditional cork-production visit. Lunch is not included, so the day keeps its own rhythm.",
    fitsBest: "History buffs · wine lovers · couples",
    pace: ["Évora old town", "Chapel of Bones", "Alentejo winery"],
    stops: [
      {
        label: "Evora",
        story:
          "UNESCO city — Roman walls, narrow whitewashed lanes, two thousand years held together quietly.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Templo Romano de Evora (Templo de Diana)",
        story:
          "1st-century Roman temple at the heart of Évora — surprisingly intact, free-standing in the old forum.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Chapel of Bones",
        story:
          "Strange, quiet, unforgettable — the Franciscan chapel built from bones to remember life's brevity.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Joao Portugal Ramos Wines",
        story:
          "Itinerary option — modern winemaking that honours traditional Alentejo grape varieties.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Enoturismo Cartuxa",
        story:
          "Itinerary option — Adega Cartuxa, next to the 16th-century Carthusian monastery, Eugénio de Almeida Foundation.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Pera-grave - Qta S. Jose De Peramanca",
        story:
          "Itinerary option — one of Portugal's most prestigious estates, famed for its powerful Alentejo reds.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Ervideira",
        story:
          "Itinerary option — secular family winery dating to 1880, vineyards across Vidigueira and Reguengos.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Herdade do Esporao",
        story:
          "Itinerary option — landmark Reguengos estate producing balanced, age-worthy Alentejo wines.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Corticarte - Arte em Cortica",
        story:
          "Visit a small cork producer — see harvest to finished product, then pick an authentic Portuguese souvenir.",
        imageTheme: "evora-alentejo",
      },
    ],
    highlights: [
      "Walking tour of UNESCO Évora",
      "The famous Chapel of Bones",
      "Tasting and lunch at an Alentejo winery",
      "Drive through cork-oak country",
    ],
    included: [
      "Private pick-up and drop-off at your accommodation",
      "Dedicated local guide/host for a personalized and flexible experience",
      "All entrance fees included (including the iconic Chapel of Bones and Évora city visits)",
      "Guided visits and wine tastings at two carefully selected wineries",
      "Traditional tastings of local cheeses and cured meats",
      "Visit a traditional cork production site, showcasing Portugal as the world’s leading cork producer",
      "Bottled water throughout the day",
      "Lunch",
    ],
    idealFor: [
      "History and architecture lovers",
      "Couples wanting a quieter, slower day",
      "Travelers chasing the next great Portuguese red",
    ],
    notes: ["It's a long day — pickup typically at 8:00, return after 19:00. Worth it."],
    img: imgEvoraAlentejo,
    focal: "50% 50%",
    bookingUrl:
      "https://yesexperiences.pt/tour/private-full-day-evora-and-alentejo-wine-tour-from-lisbon/",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["heritage", "wine"],
      highlights: ["tasting"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "tomar-coimbra",
    title: "Tomar & Coimbra Private Tour from Lisbon — Templars & Heritage",
    seoTitle: "Tomar & Coimbra Private Tour from Lisbon | Templars",
    seoDescription:
      "Private day from Lisbon to Tomar's Templar Convento de Cristo and Coimbra's ancient university, with a slow lunch by the Mondego.",
    region: "Centro",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 152,
    theme: "Heritage",
    blurb:
      "The Templar Convento de Cristo in Tomar, then Coimbra's ancient university and old town along the Mondego.",
    intro:
      "Two cities, eight centuries, one quiet day inland. Tomar holds the Templar convent that shaped Portugal's discoveries; Coimbra holds the oldest university library in the country. Between them, a slow lunch and a river that has watched it all.",
    fitsBest: "History lovers · couples · culture seekers",
    pace: ["Convento de Cristo", "Coimbra University", "Old town walk"],
    stops: [
      {
        label: "Tomar",
        story:
          "Templar town in central Portugal — medieval streets and a UNESCO-listed convent at its heart.",
        imageTheme: "tomar-coimbra",
      },
      {
        label: "Convento de Cristo",
        story:
          "Templar fortress — round church, manueline window, layers of orders that shaped the Discoveries.",
        imageTheme: "tomar-coimbra",
        image: imgTomarConvento,
        focal: "50% 45%",
      },
      {
        label: "Coimbra",
        story:
          "One of Europe's oldest university cities — steep lanes, fado bars, the Mondego rolling below.",
        imageTheme: "tomar-coimbra",
        image: imgTomarMondego,
        focal: "50% 55%",
      },
      {
        label: "Universita Di Coimbra",
        story:
          "Founded in 1290 — UNESCO-listed, with the Royal Palace of Alcáçova and the law students' black capes.",
        imageTheme: "tomar-coimbra",
        image: imgTomarCoimbra2,
        focal: "50% 45%",
      },
      {
        label: "Biblioteca Joanina",
        story:
          "Baroque library inside the university — rare manuscripts and the colony of bats that protect the books.",
        imageTheme: "tomar-coimbra",
      },
    ],
    highlights: [
      "Private visit to Tomar's Templar convent",
      "Coimbra University and the Joanina library",
      "Walk along the Mondego",
      "Lunch in a quiet inland town",
    ],
    included: [
      "All Fees and Taxes",
      "Private transportation",
      "Air-conditioned vehicle",
      "All entrances and tickets",
      "Certified Tour Guide",
      "Bottled water",
      "Local pastry",
      "Lunch",
    ],
    idealFor: [
      "History and heritage lovers",
      "Couples on a longer Portugal trip",
      "Travelers who already know Sintra and Évora",
    ],
    notes: ["Library entry has timed slots — your guide pre-books on the day."],
    img: imgTomarCoimbraHero,
    focal: "50% 45%",
    gallery: [imgTomarConvento, imgTomarCoimbra2, imgTomarMondego, imgTomarExtra],
    bookingUrl:
      "https://yesexperiences.pt/tour/private-private-full-day-tour-from-lisbon-to-tomar-coimbra/",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["heritage"],
      highlights: ["viewpoint"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "fatima-nazare-obidos",
    title: "Fátima, Nazaré & Óbidos Private Tour from Lisbon — Spirit & Charm",
    seoTitle: "Fátima, Nazaré & Óbidos Private Tour from Lisbon | YES",
    seoDescription:
      "Private day from Lisbon to Fátima sanctuary, Nazaré's big-wave cliffs and Óbidos medieval walls, ending with a Ginjinha tasting.",
    region: "Centro · Coast",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 135,
    theme: "Heritage",
    blurb:
      "The Sanctuary of Fátima, Nazaré's cliff viewpoint and Atlantic coast, the medieval lanes of Óbidos and a Ginjinha tasting.",
    intro:
      "Three landmarks, one perfectly composed day. Faith in Fátima, the awe of Nazaré's giant Atlantic waves, and the medieval streets of Óbidos finished off with a small ceramic cup of cherry liqueur.",
    fitsBest: "Pilgrims · couples · families",
    pace: ["Fátima sanctuary", "Nazaré cliffs", "Óbidos & Ginjinha"],
    stops: [
      {
        label: "Fatima",
        story:
          "Sanctuary of Our Lady of Fátima — Basilica of the Rosary, Chapel of the Apparitions, candles and quiet.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaSanctuary,
        focal: "50% 45%",
      },
      {
        label: "Nazare",
        story:
          "Atlantic fishing town and big-wave capital — traditional lunch, the Sítio viewpoint, the lighthouse over the canyon.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaNazare,
        focal: "50% 50%",
      },
      {
        label: "Praia da Nazare",
        story:
          "The town's vast crescent beach — fish drying in the sun, the Atlantic stretched flat.",
        imageTheme: "fatima-nazare-obidos",
      },
      {
        label: "Obidos",
        story:
          "Walk inside the medieval walls — narrow lanes, whitewashed houses, ginjinha in a chocolate cup.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaObidos,
        focal: "50% 45%",
      },
      {
        label: "Castelo de Obidos",
        story:
          "Roman foundations and Moorish layout — a royal palace from 1148 with towers added in 1375.",
        imageTheme: "fatima-nazare-obidos",
      },
    ],
    highlights: [
      "Time for reflection at the Fátima sanctuary",
      "The famous Nazaré big-wave viewpoint",
      "Walk inside Óbidos's medieval walls",
      "Ginjinha tasting in a chocolate cup",
    ],
    included: [
      "All Fees and Taxes",
      "Air-conditioned vehicle",
      "Private transportation",
      "Alcoholic Beverages",
      "Certified tour guide",
      "Private pickup and drop off",
      "Bottled water",
      "Local pastry",
      "Lunch",
    ],
    idealFor: [
      "Pilgrims and faith travelers",
      "Families with mixed interests",
      "First-time visitors looking for variety in one day",
    ],
    notes: ["Big waves at Nazaré peak in winter — but the cliff view is stunning year-round."],
    img: imgFatimaNazareObidosHero,
    focal: "50% 45%",
    gallery: [imgFatimaSanctuary, imgFatimaNazare, imgFatimaObidos, imgFatimaExtra],
    bookingUrl:
      "https://yesexperiences.pt/tour/private-full-day-tour-from-lisbon-discover-fatima-nazare-and-obidos/",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["heritage"],
      highlights: ["ginjinha", "viewpoint"],
      pace: "balanced",
      tier: "signature",
    },
  },
  {
    id: "roman-heritage-alentejo",
    title: "Roman Heritage Wine Tour — Hidden Alentejo from Lisbon",
    seoTitle: "Alentejo Wine Tour from Lisbon — Hidden Roman Heritage",
    seoDescription:
      "Alentejo wine tour from Lisbon into hidden Vidigueira — Roman ruins of São Cucufate, amphora-wine tasting in clay talhas and a secret river beach.",
    region: "Alentejo · Vidigueira",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 254,
    theme: "Wine",
    blurb:
      "Roman ruins, amphora wines and a hidden Alentejo most travelers never reach — a quiet inland day with deep roots.",
    intro:
      "Two thousand years ago the Romans were already making wine in this corner of the Alentejo. We follow their road south — to the ruins of São Cucufate, a tiny family cellar still pressing wine into clay amphorae the old way, and a river beach almost no one knows. The slowest day in our catalogue. The most surprising.",
    fitsBest: "Couples · wine lovers · curious travelers",
    pace: ["Roman ruins", "Talha winery", "River beach"],
    stops: [
      {
        label: "Villa Romana de São Cucufate",
        story:
          "One of Alentejo's most important Roman sites — a 2,000-year-old villa where wine was already being made in the 4th century.",
        imageTheme: "roman-heritage-alentejo",
        image: imgRomanRuins,
        focal: "50% 45%",
      },
      {
        label: "Centro Interpretativo do Vinho de Talha",
        story:
          "Portugal's most unique wine tradition — fermentation in clay amphorae, unchanged for two millennia. A small museum that opens the door to it.",
        imageTheme: "roman-heritage-alentejo",
        image: imgRomanWinery,
        focal: "50% 50%",
      },
      {
        label: "Vila Alva",
        story:
          "A drive through a whitewashed village few visitors stop in — gentle, slow, deeply Alentejano.",
        imageTheme: "roman-heritage-alentejo",
        image: imgRomanVillage,
        focal: "50% 55%",
      },
      {
        label: "Adega do Mestre Daniel · XXVI Talhas",
        story:
          "A small family winery still pressing wine into Roman-style talhas. You taste straight from the clay, the way it has been done for centuries.",
        imageTheme: "roman-heritage-alentejo",
        image: imgRomanWinery,
        focal: "50% 50%",
      },
      {
        label: "Albergaria dos Fusos",
        story:
          "A quiet river beach surrounded by cork oaks — a slow finish before the drive back to Lisbon. (Warmer months only.)",
        imageTheme: "roman-heritage-alentejo",
        image: imgRomanRiver,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "Roman ruins of São Cucufate, with wine-press chambers still intact",
      "Tasting straight from clay talhas at a tiny family cellar",
      "A whitewashed Alentejo village few travelers see",
      "Optional river-beach stop in warmer months",
    ],
    included: [
      "Air-conditioned vehicle",
      "Private pickup and drop-off",
      "Visit to Roman ruins of São Cucufate (Vila de Frades)",
      "Visit to Talha Wine Interpretation Center",
      "Local Guided experience at a family-run winery",
      "Alcoholic Beverages",
      "Lunch",
      "Bottled water",
      "Local guide / host throughout the day",
    ],
    idealFor: [
      "Wine lovers who already know Setúbal and Évora",
      "Couples wanting somewhere genuinely off the trail",
      "History travelers chasing the Roman wine story",
    ],
    notes: [
      "It's a long day (10–12h) — Vidigueira is ~2h south of Lisbon. The drive is the price of the silence at the other end.",
      "The river-beach stop is seasonal — your guide swaps it for an extra winery in winter.",
    ],
    img: imgRomanHero,
    focal: "50% 45%",
    gallery: [imgRomanHero, imgRomanRuins, imgRomanVillage, imgRomanWinery, imgRomanRiver],
    bookingUrl:
      "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["wine", "heritage"],
      highlights: ["tasting", "viewpoint"],
      pace: "slow",
      tier: "signature",
    },
  },
  {
    id: "southwest-vicentine-coast",
    title: "Southwest Vicentine Coast — Secret Paradise from Lisbon",
    seoTitle: "Southwest Vicentine Coast Tour from Lisbon | Secret Beaches",
    seoDescription:
      "Private day from Lisbon to the Vicentine Coast — Porto Covo, Milfontes, Odeceixe and protected cliffs along one of Portugal's wildest shores.",
    region: "Southwest Alentejo · Costa Vicentina",
    duration: "Long Day",
    durationHours: "9–10h",
    priceFrom: 203,
    theme: "Coastal",
    blurb:
      "Whitewashed fishing villages, protected cliffs and the wild river-meets-ocean beach at Odeceixe — a hidden Atlantic Portugal few travelers reach.",
    intro:
      "Between Alentejo and Algarve lies another Portugal — raw, open, breathtakingly quiet. We follow the Vicentine Coast south from Lisbon, through Porto Covo, Vila Nova de Milfontes and the natural park, to Odeceixe, where the Rio Seixe meets the Atlantic. A slow, cinematic day of secret coves, whitewashed villages and untouched coastal scenery.",
    fitsBest: "Couples · slow travelers · coastal romantics",
    pace: ["Six coastal stops", "Long lunch in Milfontes", "Odeceixe as the finale"],
    stops: [
      {
        label: "Ilha do Pessegueiro",
        story:
          "One of the most iconic coastal views near Porto Covo — the island and its old fortifications guard a coastline that has been strategically important for centuries.",
        imageTheme: "southwest-vicentine-coast",
      },
      {
        label: "Porto Covo",
        story:
          "A small whitewashed fishing village where Portugal still meets the Atlantic on its own terms — dramatic cliffs, quiet coves, a simple rhythm.",
        imageTheme: "southwest-vicentine-coast",
      },
      {
        label: "Vila Nova de Milfontes",
        story:
          "Where the Mira River meets the ocean — calmer waters, whitewashed streets and the ideal pause for a long, unhurried lunch by the water.",
        imageTheme: "southwest-vicentine-coast",
      },
      {
        label: "Parque Natural do Sudoeste Alentejano e Costa Vicentina",
        story:
          "The drive itself is part of the experience — one of Portugal's most protected coastal parks, with cliffs, dunes and habitats that have escaped development.",
        imageTheme: "southwest-vicentine-coast",
      },
      {
        label: "Odeceixe",
        story:
          "The day's highlight — a rare landscape where the Rio Seixe meets the Atlantic, splitting the coast into a calm river beach and a wild ocean beach. Also the natural border between Alentejo and Algarve.",
        imageTheme: "southwest-vicentine-coast",
      },
      {
        label: "Aljezur",
        story:
          "A historic town with Moorish roots, watched over by the ruins of its hilltop castle — the day's final layer of context before the drive back to Lisbon.",
        imageTheme: "southwest-vicentine-coast",
      },
    ],
    highlights: [
      "The wild river-meets-ocean beach at Odeceixe",
      "Whitewashed fishing villages of Porto Covo and Milfontes",
      "Protected cliffs and coves of the Costa Vicentina natural park",
      "The Alentejo–Algarve natural border, seen in a single frame",
      "Moorish hilltop ruins at Aljezur",
    ],
    included: [
      "Air-conditioned vehicle",
      "Private transportation with a local guide",
      "Private pickup and drop-off",
      "All entrances and transportation fees",
      "Bottled water",
      "Private and personalized itinerary",
    ],
    idealFor: [
      "Couples chasing a quieter, more cinematic Portugal",
      "Slow travelers who already know Sintra and Arrábida",
      "Coastal romantics drawn to raw, undeveloped landscapes",
    ],
    notes: [
      "It's a long day (9–10h) — the Vicentine Coast is a real distance from Lisbon. The drive is the price of the silence at the other end.",
      "Meals are not included — your guide books a table in Milfontes or Odeceixe based on the day.",
    ],
    img: "/__l5e/assets-v1/baab2cc3-8f8e-4c48-be82-388c0ea30b67/southwest-vicentine-coast-cover.jpg",
    focal: "50% 50%",
    gallery: [
      "/__l5e/assets-v1/baab2cc3-8f8e-4c48-be82-388c0ea30b67/southwest-vicentine-coast-cover.jpg",
      "/__l5e/assets-v1/a196f9b1-7319-4ad0-90a4-627239fc73f2/yes-tour-b6e8bf6b3edf.webp",
      "/__l5e/assets-v1/efda4d5f-92d2-48dc-82d0-669496f77d36/yes-tour-be801f64f96b.webp",
      "/__l5e/assets-v1/638fa871-f692-4f40-a55f-266ed4598d29/yes-tour-092bb83ed7a2.webp",
      "/__l5e/assets-v1/d550a2d1-a58f-434c-8cac-8234ac9c53fe/yes-tour-70b3dfc928fa.webp",
    ],
    bookingUrl:
      "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
    seed: {
      region: "alentejo",
      duration: "fullday",
      styles: ["coast", "heritage"],
      highlights: ["coastal_scenery", "hidden_villages", "viewpoint"],
      pace: "slow",
      tier: "signature",
    },
  },
];

/** Encode a tour seed into URL search params for /builder?seed=… */
export function seedToSearchParams(tour: SignatureTour): string {
  const params = new URLSearchParams();
  params.set("tour", tour.id);
  return params.toString();
}

/** Per-tour hero image map. Used as the fallback for stops that don't have
 *  an explicit `image`. */
export const STOP_THEME_IMG: Record<StopTheme, string> = {
  "arrabida-boat": imgArrabidaBoatHero,
  "arrabida-wine-allinclusive": imgArrabidaWineHero,
  "azeitao-cheese": imgAzeitaoCheeseHero,
  "evora-alentejo": imgEvoraAlentejo,
  "fatima-nazare-obidos": imgFatimaNazareObidosHero,
  "roman-heritage-alentejo": imgRomanHero,
  "sintra-cascais": imgSintraCascaisHero,
  "southwest-vicentine-coast":
    "/__l5e/assets-v1/f2725404-9b59-4a19-892d-4e5c1bc550ed/yes-tour-94c3a93cd262.webp",
  "tiles-workshop": imgTilesWorkshop,
  "tomar-coimbra": imgTomarCoimbraHero,
  "troia-comporta": imgTroiaComportaHero,
  "wild-beaches-picnic": imgWildBeachesPicnic,
};

/** Resolve the image to render for a given stop, with fallback to the tour
 *  hero. Use this in components instead of reading `s.image` directly so
 *  the fallback logic stays in one place. */
export function stopImage(stop: TourStop): string {
  return stop.image ?? STOP_THEME_IMG[stop.imageTheme];
}

/** Resolve the focal point (object-position) for a stop, falling back to
 *  centered. */
export function stopFocal(stop: TourStop): string {
  return stop.focal ?? "50% 50%";
}
