/**
 * Curated per-stop operational notes surfaced under the Signature route map.
 *
 * Keys use the same normalization as `stopGeo.ts` (lowercase, accents
 * stripped, punctuation → space, collapsed). Only include entries we can
 * vouch for from real operation — leave fields blank when unknown so the
 * UI hides them (never invent times or transport claims).
 */

export interface StopNote {
  /** Best arrival window — light, crowds, opening hours. */
  bestArrival?: string;
  /** How guests realistically get there. */
  transit?: string;
  /** Time typically spent on site. */
  duration?: string;
}

const NOTES: Record<string, StopNote> = {
  // Arrábida cluster
  arrabida: {
    bestArrival: "9:30–11:00 · softer light, quieter viewpoints",
    transit: "Private transfer only · no public bus into the park",
    duration: "60–90 min for viewpoints + stops",
  },
  portinho: {
    bestArrival: "10:00–12:00 · calm water, easier parking",
    transit: "Narrow winding road · private vehicle recommended",
    duration: "45–75 min · swim + coffee",
  },
  sesimbra: {
    bestArrival: "12:30–14:00 · lunch on the seafront",
    transit: "Private transfer · limited parking in high season",
    duration: "60–90 min · lunch stop",
  },
  "cabo espichel": {
    bestArrival: "Late afternoon · dramatic western light",
    transit: "Private transfer only · no scheduled buses",
    duration: "30–45 min · sanctuary + cliffs",
  },

  // Setúbal / Azeitão
  livramento: {
    bestArrival: "9:00–10:30 · full stalls, freshest catch",
    transit: "Central Setúbal · walk from pickup",
    duration: "30–45 min tasting walk",
  },
  setubal: {
    bestArrival: "Morning · before ferry crossings peak",
    transit: "Private transfer · ferries to Tróia every 30–45 min",
    duration: "45 min in old town",
  },
  azeitao: {
    bestArrival: "11:00–13:00 · winery + workshop opens",
    transit: "Private transfer · 15 min from Setúbal",
    duration: "90–120 min · tasting + workshop",
  },
  "cristo rei": {
    bestArrival: "Late afternoon · Lisbon skyline in warm light",
    transit: "Ferry + private transfer, or bridge crossing",
    duration: "30–45 min viewpoint stop",
  },

  // Tróia / Comporta
  troia: {
    bestArrival: "Around ferry slot · avoid midday peak crossings",
    transit: "Ferry from Setúbal (20 min) · car on board",
    duration: "45 min ferry + arrival",
  },
  "roman ruins of troia": {
    bestArrival: "10:30–12:00 · guided visits available",
    transit: "Short private transfer from ferry",
    duration: "45–60 min guided visit",
  },
  comporta: {
    bestArrival: "13:00–15:30 · long lunch + beach walk",
    transit: "Private transfer · 20 min from Tróia",
    duration: "2–3 hrs · lunch + beach",
  },
  "cais palafitico do porto da carrasqueira": {
    bestArrival: "Golden hour · pier catches full sunset",
    transit: "Private transfer only · rural road access",
    duration: "30–45 min photo stop",
  },

  // Southwest / Vicentine coast
  "ilha do pessegueiro": {
    bestArrival: "Late morning · low tide reveals the crossing",
    transit: "Private transfer · short walk from parking",
    duration: "45–60 min · fort + coves",
  },
  "porto covo": {
    bestArrival: "12:30–14:00 · lunch in the whitewashed square",
    transit: "Private transfer · 1h from Setúbal",
    duration: "60–90 min · village + lunch",
  },
  "vila nova de milfontes": {
    bestArrival: "Afternoon · river estuary in warm light",
    transit: "Private transfer · scenic coastal route",
    duration: "45–60 min riverfront stop",
  },
  "parque natural do sudoeste alentejano e costa vicentina": {
    bestArrival: "Late afternoon · cliffs at golden hour",
    transit: "Private transfer · unpaved sections",
    duration: "60–90 min across viewpoints",
  },

  // Sintra / Cascais
  sintra: {
    bestArrival: "9:00 sharp · palaces before coach tours arrive",
    transit: "Private transfer · book palace tickets ahead",
    duration: "2–3 hrs · palaces + village",
  },
  "cabo da roca": {
    bestArrival: "Late afternoon · Europe's edge in low sun",
    transit: "Private transfer · often windy — bring a layer",
    duration: "20–30 min viewpoint stop",
  },
  cascais: {
    bestArrival: "Around 17:00 · marina + old town aperitivo",
    transit: "Private transfer · walkable old town",
    duration: "60–90 min · walk + drink",
  },

  // Centro / Alentejo
  obidos: {
    bestArrival: "10:00–12:00 · quieter walls before day-trippers",
    transit: "Private transfer · 1h from Lisbon",
    duration: "75–90 min · walls + village",
  },
  nazare: {
    bestArrival: "Midday · Sítio viewpoint clear",
    transit: "Private transfer · funicular to Sítio",
    duration: "60–90 min · viewpoint + beach",
  },
  fatima: {
    bestArrival: "Morning · sanctuary before pilgrim groups",
    transit: "Private transfer · large accessible plaza",
    duration: "45–60 min sanctuary visit",
  },
  evora: {
    bestArrival: "10:00–12:00 · walk the historic centre",
    transit: "Private transfer · 1h40 from Lisbon",
    duration: "2–3 hrs · centre + one site",
  },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function lookupStopNote(rawLabel: string): StopNote | null {
  const key = norm(rawLabel);
  if (NOTES[key]) return NOTES[key];
  const partial = Object.keys(NOTES)
    .filter((k) => key.includes(k))
    .sort((a, b) => b.length - a.length);
  return partial.length ? NOTES[partial[0]] : null;
}
