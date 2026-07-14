/**
 * Curated lookup of YES experiences stop names → SVG viewBox coordinates
 * (same coordinate system the builder's PremiumMap uses: 0 0 100 130).
 *
 * The importer normalizes scraped stop labels and snaps to the closest entry
 * here. Everything that doesn't match falls back to the region centroid + jitter.
 */

export type StopCoord = { x: number; y: number; label: string; tag: string };

export const STOP_COORDS: Record<string, StopCoord> = {
  // Lisbon / South of Tagus
  lisbon: { x: 28, y: 78, label: "Lisbon", tag: "City" },
  "april 25th bridge": { x: 28, y: 79, label: "April 25th Bridge", tag: "Landmark" },
  "cristo rei": { x: 28, y: 80, label: "Cristo Rei", tag: "Viewpoint" },
  almada: { x: 28, y: 80, label: "Almada", tag: "Viewpoint" },
  azeitao: { x: 30, y: 81, label: "Azeitão", tag: "Cheese & wine" },
  azeitão: { x: 30, y: 81, label: "Azeitão", tag: "Cheese & wine" },
  setubal: { x: 33, y: 82, label: "Setúbal", tag: "Market" },
  setúbal: { x: 33, y: 82, label: "Setúbal", tag: "Market" },
  livramento: { x: 33, y: 82, label: "Livramento Market", tag: "Market" },
  "livramento market": { x: 33, y: 82, label: "Livramento Market", tag: "Market" },
  arrabida: { x: 36, y: 82, label: "Arrábida Natural Park", tag: "Nature" },
  arrábida: { x: 36, y: 82, label: "Arrábida Natural Park", tag: "Nature" },
  portinho: { x: 35, y: 84, label: "Portinho da Arrábida", tag: "Coast" },
  "portinho da arrábida": { x: 35, y: 84, label: "Portinho da Arrábida", tag: "Coast" },
  sesimbra: { x: 32, y: 86, label: "Sesimbra", tag: "Fishing village" },
  "cabo espichel": { x: 29, y: 86, label: "Cabo Espichel", tag: "Cliffs" },
  espichel: { x: 29, y: 86, label: "Cabo Espichel", tag: "Cliffs" },
  sintra: { x: 22, y: 76, label: "Sintra", tag: "Heritage" },
  cascais: { x: 20, y: 78, label: "Cascais", tag: "Coast" },
  "cabo da roca": { x: 18, y: 76, label: "Cabo da Roca", tag: "Coast" },

  // Centro / Alentejo route hubs
  obidos: { x: 28, y: 64, label: "Óbidos", tag: "Medieval" },
  óbidos: { x: 28, y: 64, label: "Óbidos", tag: "Medieval" },
  nazare: { x: 32, y: 58, label: "Nazaré", tag: "Coast" },
  nazaré: { x: 32, y: 58, label: "Nazaré", tag: "Coast" },
  fatima: { x: 38, y: 60, label: "Fátima", tag: "Sanctuary" },
  fátima: { x: 38, y: 60, label: "Fátima", tag: "Sanctuary" },
  tomar: { x: 50, y: 70, label: "Tomar", tag: "Templar" },
  coimbra: { x: 46, y: 64, label: "Coimbra", tag: "University" },
  evora: { x: 54, y: 84, label: "Évora", tag: "Heritage" },
  évora: { x: 54, y: 84, label: "Évora", tag: "Heritage" },
  monsaraz: { x: 60, y: 92, label: "Monsaraz", tag: "Quiet" },
  comporta: { x: 42, y: 96, label: "Comporta", tag: "Coast" },
  alentejo: { x: 56, y: 82, label: "Alentejo wineries", tag: "Wine" },

  // Porto / North
  porto: { x: 38, y: 22, label: "Porto", tag: "City" },
  ribeira: { x: 38, y: 22, label: "Ribeira", tag: "Old town" },
  gaia: { x: 38, y: 23, label: "Vila Nova de Gaia", tag: "Port cellars" },
  douro: { x: 46, y: 24, label: "Douro Valley", tag: "Wine" },
  "douro valley": { x: 46, y: 24, label: "Douro Valley", tag: "Wine" },
  pinhao: { x: 52, y: 28, label: "Pinhão", tag: "River" },
  pinhão: { x: 52, y: 28, label: "Pinhão", tag: "River" },
  braga: { x: 36, y: 18, label: "Braga", tag: "Heritage" },
  "bom jesus": { x: 36, y: 18, label: "Bom Jesus do Monte", tag: "Sanctuary" },
  guimaraes: { x: 40, y: 20, label: "Guimarães", tag: "Heritage" },
  guimarães: { x: 40, y: 20, label: "Guimarães", tag: "Heritage" },

  // Algarve
  lagos: { x: 38, y: 112, label: "Lagos", tag: "Coast" },
  benagil: { x: 40, y: 114, label: "Benagil Caves", tag: "Boat ride" },
  "vicentine coast": { x: 36, y: 116, label: "Vicentine Coast", tag: "Wild coast" },
  vicentine: { x: 36, y: 116, label: "Vicentine Coast", tag: "Wild coast" },
  monchique: { x: 42, y: 108, label: "Monchique", tag: "Mountain" },
  "ria formosa": { x: 50, y: 116, label: "Ria Formosa", tag: "Nature" },
  tavira: { x: 54, y: 110, label: "Tavira", tag: "Quiet" },
};

export const REGION_CENTROIDS: Record<string, { x: number; y: number; label: string }> = {
  lisbon: { x: 28, y: 78, label: "Lisbon & Coast" },
  porto: { x: 38, y: 22, label: "Porto & Douro" },
  alentejo: { x: 50, y: 80, label: "Alentejo & Centro" },
  algarve: { x: 44, y: 112, label: "Algarve" },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics for matching
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Snap a free-text stop label to a real coord, or fall back to region centroid. */
export function snapStop(rawLabel: string, region: string, indexInRoute = 0): StopCoord {
  const key = norm(rawLabel);
  // Direct hit
  if (STOP_COORDS[key]) return STOP_COORDS[key];
  // Substring scan (longest matching key wins)
  const candidates = Object.keys(STOP_COORDS)
    .filter((k) => key.includes(k))
    .sort((a, b) => b.length - a.length);
  if (candidates.length) return STOP_COORDS[candidates[0]];

  // Fallback: region centroid + small deterministic jitter
  const c = REGION_CENTROIDS[region] ?? REGION_CENTROIDS.lisbon;
  const jitter = ((indexInRoute * 37) % 11) - 5;
  return {
    x: c.x + jitter * 0.4,
    y: c.y + (((indexInRoute * 17) % 9) - 4) * 0.4,
    label: rawLabel,
    tag: "Stop",
  };
}
