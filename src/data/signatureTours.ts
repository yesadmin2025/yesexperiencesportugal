// rev 3 — multi-photo Viator galleries + per-stop images
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
  | "sintra-cascais"
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
  priceFrom: number;          // EUR — guide price, final cost confirmed at booking
  theme: string;
  blurb: string;              // one-line card teaser
  intro: string;              // 2–3 sentence opening on detail page
  fitsBest: string;
  pace: string[];
  stops: TourStop[];
  highlights: string[];
  included: string[];
  idealFor: string[];
  notes: string[];
  img: string;                // hero photo of this tour
  /** Default object-position for the hero crop (e.g. "50% 35%"). */
  focal?: string;
  /** Supporting Viator photos used in the detail-page gallery strip. */
  gallery?: string[];
  /** Internal reference — used by the importer & admin tools. Never linked. */
  bookingUrl: string;
  /** Deprecated — kept for compatibility with older importer code. */
  tripadvisorUrl?: string;
  seed: TourSeed;
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
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "7–9h",
    priceFrom: 138,
    theme: "Wine",
    blurb:
      "A complete Arrábida day from Lisbon — three family wineries, market visit, traditional lunch and Sesimbra by the sea.",
    intro:
      "The most-loved YES day, in one word: complete. We leave Lisbon for the Arrábida hills, slip into three small family wineries, sit down for a long traditional lunch, and walk Sesimbra harbour as the boats come in. Nothing extra to plan or pay for.",
    fitsBest: "Couples · friends · wine-curious travelers",
    pace: ["Two to three wineries", "Local lunch", "Sesimbra harbour"],
    stops: [
      {
        label: "Cristo Rei viewpoint",
        story: "First stop above the Tagus — Lisbon laid out, the bridge gleaming below.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineViewpoint,
        focal: "50% 40%",
      },
      {
        label: "Family winery in Azeitão",
        story: "Cellar walk and a guided tasting with the people who pressed the grapes.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineWinery,
        focal: "50% 45%",
      },
      {
        label: "Long traditional lunch",
        story: "Regional plates and pairings, the natural park visible through the windows.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineLunch,
        focal: "50% 50%",
      },
      {
        label: "Sesimbra harbour",
        story: "A quiet end-of-day walk by the fishing boats before the drive back.",
        imageTheme: "arrabida-wine-allinclusive",
        image: imgArrabidaWineSesimbra,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "Up to three private tastings at family-run wineries",
      "Cristo Rei panorama over Lisbon",
      "Traditional Portuguese lunch with paired wines",
      "Stop at the Livramento tile-clad market",
      "All driving and pours handled — you only sip",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Up to three winery tastings",
      "Lunch with paired wines",
      "Bottled water on board",
      "All transport and tolls",
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
    gallery: [imgArrabidaWineViewpoint, imgArrabidaWineWinery, imgArrabidaWineLunch, imgArrabidaWineSesimbra],
    bookingUrl:
      "https://yesexperiences.pt/tour/private-full-day-wine-tour-setubal-arrabida/",
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
    region: "Arrábida · Sesimbra",
    duration: "Full Day",
    durationHours: "6+h",
    priceFrom: 190,
    theme: "Coastal",
    blurb:
      "A private coastal day — Arrábida viewpoints, hidden coves and a slow picnic on a quiet beach.",
    intro:
      "The good parts of the Lisbon coast aren't on the postcards. We take the small roads into Arrábida, drop down to the coves locals keep to themselves, and set a picnic on the sand with the natural park behind us. No queues, no rush.",
    fitsBest: "Couples · families · slow travelers",
    pace: ["Arrábida viewpoints", "Hidden cove picnic", "Sesimbra"],
    stops: [
      {
        label: "Arrábida viewpoints",
        story: "Pull-overs above the bays — turquoise water, cork-oak hills, no crowds.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Picnic on a quiet beach",
        story: "Local cheese, bread, fruit, chilled wine — set on a beach you'll have mostly to yourselves.",
        imageTheme: "wild-beaches-picnic",
      },
      {
        label: "Sesimbra at dusk",
        story: "The fishing village glows. Time for a final stroll along the harbour.",
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
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Beach picnic with local food and wine",
      "All transport and park access",
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
    region: "Setúbal · Arrábida",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 159,
    theme: "Coastal",
    blurb:
      "A private Arrábida day with a boat ride into the park's turquoise coves — swim, snorkel, drift and lunch by the water.",
    intro:
      "A day told by the sea. We cross into the Arrábida Natural Park and trade the coast road for a boat into its quiet coves — swim or simply drift — then lunch in Portinho with sand still on your feet before easing into Sesimbra at golden hour.",
    fitsBest: "Couples · families · active travelers",
    pace: ["Arrábida by road", "Boat into the coves", "Sesimbra at dusk"],
    stops: [
      {
        label: "Arrábida coves by boat",
        story: "Boat into the park's secret beaches — swim, snorkel or simply drift.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatCoves,
        focal: "50% 55%",
      },
      {
        label: "Lunch in Portinho",
        story: "A long lunch by the water — grilled fish, white wine, no rush.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatPortinho,
        focal: "50% 55%",
      },
      {
        label: "Sesimbra at dusk",
        story: "The fishing village glows. Final stroll along the harbour before the drive home.",
        imageTheme: "arrabida-boat",
        image: imgArrabidaBoatSesimbra,
        focal: "50% 50%",
      },
    ],
    highlights: [
      "Boat ride into Arrábida's hidden coves",
      "Swim, snorkel or simply drift in turquoise water",
      "Seafood lunch by the harbour in Portinho",
      "Golden-hour walk in Sesimbra",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Coastal boat tour in Arrábida",
      "Snorkel gear when sea conditions allow",
      "All transport and tolls",
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
    gallery: [imgArrabidaBoatCoves, imgArrabidaBoatPortinho, imgArrabidaBoatSesimbra, imgArrabidaBoatExtra],
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
    region: "Azeitão · Sesimbra",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 145,
    theme: "Heritage",
    blurb:
      "Paint your own azulejo in a centuries-old atelier, taste local wines next door, then unwind by the sea in Sesimbra.",
    intro:
      "Five centuries of tile-making in one quiet courtyard. You meet the master, mix the cobalt blue, and paint a single azulejo that becomes yours forever. The day softens from there — a glass of local wine, then the salt and sun of Sesimbra.",
    fitsBest: "Couples · creatives · families with teens",
    pace: ["Tile atelier", "Wine tasting", "Sesimbra coast"],
    stops: [
      {
        label: "Tile painting atelier",
        story: "Brush, glaze, fire — and a piece of Portugal you'll carry home.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Wine tasting next door",
        story: "Three Setúbal wines on a shaded patio, the kilns still warm behind you.",
        imageTheme: "tiles-workshop",
      },
      {
        label: "Sesimbra coast",
        story: "End the day where the fishermen do — a quiet walk and easy plates.",
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
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Tile-painting workshop with all materials",
      "Wine tasting",
      "All transport and tolls",
    ],
    idealFor: [
      "Couples and creative travelers",
      "Families with teenagers",
      "First-time visitors curious about Portuguese craft",
    ],
    notes: [
      "Tiles are fired after you leave; we ship them to your home address on request.",
    ],
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
    region: "Azeitão · Sesimbra",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 135,
    theme: "Gastronomy",
    blurb:
      "Hands-on cheese making in Azeitão, a private winery tasting next door, then sea air and seafood in Sesimbra.",
    intro:
      "You won't watch — you'll work. In a small Azeitão dairy, hands deep in fresh curd, you shape the cheese that built this village's reputation. The afternoon answers with wine from the next farm and a quiet table by the sea in Sesimbra.",
    fitsBest: "Foodies · couples · curious first-timers",
    pace: ["Cheese workshop", "Winery tasting", "Sesimbra"],
    stops: [
      {
        label: "Hands-on cheese workshop",
        story: "Fresh sheep's milk, a wooden mould, your initials. You take a wheel home.",
        imageTheme: "azeitao-cheese",
        image: imgAzeitaoWorkshop,
        focal: "50% 50%",
      },
      {
        label: "Local winery tasting",
        story: "Three glasses, a quiet patio, a producer who happily talks all afternoon.",
        imageTheme: "azeitao-cheese",
        image: imgAzeitaoWinery,
        focal: "50% 45%",
      },
      {
        label: "Sesimbra by the sea",
        story: "A coastal walk, fresh fish, and time slowing down with the tide.",
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
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Cheese-making workshop with materials",
      "Winery tasting",
      "All transport and tolls",
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
    region: "Lisbon Coast",
    duration: "Full Day",
    durationHours: "8–9h",
    priceFrom: 159,
    theme: "Heritage",
    blurb:
      "Sintra's quieter palaces and forests, the wild westernmost coast, Cascais lanes and a private wine tasting.",
    intro:
      "Sintra without the queues. We slip into the smaller estates, walk the forest paths most visitors never find, then chase the cliffs to Cabo da Roca — the western edge of Europe — before easing into Cascais and a glass of wine in a quiet courtyard.",
    fitsBest: "Couples · culture lovers · first-timers",
    pace: ["Sintra forests", "Cabo da Roca", "Cascais tasting"],
    stops: [
      {
        label: "Sintra's hidden estates",
        story: "Quiet gardens and the romantic palaces — without the bus-tour crush.",
        imageTheme: "sintra-cascais",
        image: imgSintraEstates,
        focal: "50% 45%",
      },
      {
        label: "Cabo da Roca",
        story: "The western edge of Europe. Wind, cliffs, the Atlantic stretched flat.",
        imageTheme: "sintra-cascais",
        image: imgSintraCabo,
        focal: "50% 50%",
      },
      {
        label: "Cascais courtyard tasting",
        story: "A small bar in the old town, three local wines, no rush to leave.",
        imageTheme: "sintra-cascais",
        image: imgSintraCascais2,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "Quieter Sintra route — palaces without the queues",
      "Westernmost point of mainland Europe",
      "Walk through Cascais's old fishing town",
      "Private wine tasting in a local courtyard",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Private wine tasting",
      "All transport and tolls",
    ],
    idealFor: [
      "Couples on a first trip to Portugal",
      "Culture lovers who hate tourist queues",
      "Travelers with limited time who want depth, not a rush",
    ],
    notes: [
      "Palace interior tickets are optional — your guide books them on request.",
    ],
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
    region: "Tróia · Comporta · Alentejo",
    duration: "Full Day",
    durationHours: "8–10h",
    priceFrom: 165,
    theme: "Coastal",
    blurb:
      "Cross the Sado by ferry to the Roman ruins of Tróia, then long Comporta beaches, rice fields and a slow Alentejo lunch.",
    intro:
      "A quiet day in the Alentejo most visitors miss. We board the ferry across the Sado to Tróia's Roman ruins, then drift down to Comporta — long Atlantic beaches, rice paddies, white-and-blue villages — and finish with a slow lunch in the country.",
    fitsBest: "Couples · slow travelers · style-led explorers",
    pace: ["Sado ferry", "Tróia ruins", "Comporta beach & lunch"],
    stops: [
      {
        label: "Sado estuary crossing",
        story: "The ferry ride — dolphins are common, rice fields open on the other side.",
        imageTheme: "troia-comporta",
        image: imgTroiaFerry,
        focal: "50% 45%",
      },
      {
        label: "Tróia Roman ruins",
        story: "One of the Iberian Peninsula's largest Roman fish-salting sites — quiet, sea-side, surprisingly intact.",
        imageTheme: "troia-comporta",
        image: imgTroiaRuins,
        focal: "50% 50%",
      },
      {
        label: "Comporta beach & lunch",
        story: "Pine forests and white sand, a long lunch in a thatched-roof restaurant.",
        imageTheme: "troia-comporta",
        image: imgTroiaBeach,
        focal: "50% 60%",
      },
    ],
    highlights: [
      "Ferry crossing of the Sado estuary (dolphins often spotted)",
      "Roman ruins of Tróia by the sea",
      "Long, quiet beaches of Comporta",
      "Slow Alentejo lunch among the rice fields",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Ferry crossing for the vehicle",
      "All transport and tolls",
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
    bookingUrl:
      "https://yesexperiences.pt/tour/private-troia-comporta-tour-from-lisbon/",
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
    region: "Alentejo",
    duration: "Long Day",
    durationHours: "9–11h",
    priceFrom: 262,
    theme: "Wine",
    blurb:
      "Roman temples and the Chapel of Bones in Évora, then Alentejo wineries and a slow lunch in vineyard country.",
    intro:
      "Alentejo unwinds you. Plains of cork oaks, white-washed villages, and a city — Évora — that's quietly held two thousand years of history together. We walk it slowly, then disappear into the wineries that have been quietly making some of Portugal's best reds.",
    fitsBest: "History buffs · wine lovers · couples",
    pace: ["Évora old town", "Chapel of Bones", "Alentejo winery"],
    stops: [
      {
        label: "Évora old town",
        story: "Roman temple, cathedral, narrow streets — a city that earns its UNESCO listing.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Chapel of Bones",
        story: "Strange, quiet, unforgettable — the monks built it from bones to remember.",
        imageTheme: "evora-alentejo",
      },
      {
        label: "Alentejo winery & lunch",
        story: "A long, vineyard-side lunch with the wines made on the same estate.",
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
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Winery tasting and lunch",
      "All transport and tolls",
    ],
    idealFor: [
      "History and architecture lovers",
      "Couples wanting a quieter, slower day",
      "Travelers chasing the next great Portuguese red",
    ],
    notes: [
      "It's a long day — pickup typically at 8:00, return after 19:00. Worth it.",
    ],
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
    region: "Centro",
    duration: "Full Day",
    durationHours: "9–10h",
    priceFrom: 220,
    theme: "Heritage",
    blurb:
      "The Templar Convento de Cristo in Tomar, then Coimbra's ancient university and old town along the Mondego.",
    intro:
      "Two cities, eight centuries, one quiet day inland. Tomar holds the Templar convent that shaped Portugal's discoveries; Coimbra holds the oldest university library in the country. Between them, a slow lunch and a river that has watched it all.",
    fitsBest: "History lovers · couples · culture seekers",
    pace: ["Convento de Cristo", "Coimbra University", "Old town walk"],
    stops: [
      {
        label: "Convento de Cristo, Tomar",
        story: "The Templar fortress — round church, manueline window, layers of orders.",
        imageTheme: "tomar-coimbra",
        image: imgTomarConvento,
        focal: "50% 45%",
      },
      {
        label: "Coimbra University",
        story: "The Joanina library, the law students' black capes, the bell over the river.",
        imageTheme: "tomar-coimbra",
        image: imgTomarCoimbra2,
        focal: "50% 45%",
      },
      {
        label: "Old town along the Mondego",
        story: "Steep lanes, a fado bar, an easy walk back as the river turns gold.",
        imageTheme: "tomar-coimbra",
        image: imgTomarMondego,
        focal: "50% 55%",
      },
    ],
    highlights: [
      "Private visit to Tomar's Templar convent",
      "Coimbra University and the Joanina library",
      "Walk along the Mondego",
      "Lunch in a quiet inland town",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "All transport and tolls",
    ],
    idealFor: [
      "History and heritage lovers",
      "Couples on a longer Portugal trip",
      "Travelers who already know Sintra and Évora",
    ],
    notes: [
      "Library entry has timed slots — your guide pre-books on the day.",
    ],
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
    region: "Centro · Coast",
    duration: "Full Day",
    durationHours: "9–10h",
    priceFrom: 195,
    theme: "Heritage",
    blurb:
      "The Sanctuary of Fátima, the giant waves of Nazaré, the medieval lanes of Óbidos and a Ginjinha tasting.",
    intro:
      "Three landmarks, one perfectly composed day. Faith in Fátima, the awe of Nazaré's giant Atlantic waves, and the medieval streets of Óbidos finished off with a small ceramic cup of cherry liqueur.",
    fitsBest: "Pilgrims · couples · families",
    pace: ["Fátima sanctuary", "Nazaré cliffs", "Óbidos & Ginjinha"],
    stops: [
      {
        label: "Sanctuary of Fátima",
        story: "Quiet time at the chapel of apparitions — pilgrims, candles, peace.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaSanctuary,
        focal: "50% 45%",
      },
      {
        label: "Nazaré cliffs",
        story: "The lighthouse over the canyon that makes the world's biggest waves.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaNazare,
        focal: "50% 50%",
      },
      {
        label: "Óbidos & Ginjinha",
        story: "Medieval walls, narrow lanes, cherry liqueur in a chocolate cup.",
        imageTheme: "fatima-nazare-obidos",
        image: imgFatimaObidos,
        focal: "50% 45%",
      },
    ],
    highlights: [
      "Time for reflection at the Fátima sanctuary",
      "The famous Nazaré big-wave viewpoint",
      "Walk inside Óbidos's medieval walls",
      "Ginjinha tasting in a chocolate cup",
    ],
    included: [
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Ginjinha tasting",
      "All transport and tolls",
    ],
    idealFor: [
      "Pilgrims and faith travelers",
      "Families with mixed interests",
      "First-time visitors looking for variety in one day",
    ],
    notes: [
      "Big waves at Nazaré peak in winter — but the cliff view is stunning year-round.",
    ],
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
    region: "Alentejo · Vidigueira",
    duration: "Long Day",
    durationHours: "10–12h",
    priceFrom: 260,
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
        imageTheme: "evora-alentejo",
        image: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f3/caption.jpg",
        focal: "50% 45%",
      },
      {
        label: "Centro Interpretativo do Vinho de Talha",
        story:
          "Portugal's most unique wine tradition — fermentation in clay amphorae, unchanged for two millennia. A small museum that opens the door to it.",
        imageTheme: "evora-alentejo",
        image: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/ff/caption.jpg",
        focal: "50% 50%",
      },
      {
        label: "Vila Alva",
        story:
          "A drive through a whitewashed village few visitors stop in — gentle, slow, deeply Alentejano.",
        imageTheme: "evora-alentejo",
        image: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/82/03/caption.jpg",
        focal: "50% 55%",
      },
      {
        label: "Adega do Mestre Daniel · XXVI Talhas",
        story:
          "A small family winery still pressing wine into Roman-style talhas. You taste straight from the clay, the way it has been done for centuries.",
        imageTheme: "evora-alentejo",
        image: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/ad/15/caption.jpg",
        focal: "50% 50%",
      },
      {
        label: "Albergaria dos Fusos",
        story:
          "A quiet river beach surrounded by cork oaks — a slow finish before the drive back to Lisbon. (Warmer months only.)",
        imageTheme: "evora-alentejo",
        image: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f6/caption.jpg",
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
      "Private guide and driver",
      "Hotel pickup and drop-off in Lisbon",
      "Roman site entrance",
      "Talha winery tasting",
      "All transport and tolls",
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
    img: "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f3/caption.jpg",
    focal: "50% 45%",
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f3/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/ff/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/82/03/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/ad/15/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f6/caption.jpg",
    ],
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
  "sintra-cascais": imgSintraCascaisHero,
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
