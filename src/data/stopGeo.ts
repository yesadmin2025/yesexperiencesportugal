/**
 * Real-world lat/lng for the curated YES experiences stops.
 * Used by the Leaflet builder map so we don't have to geocode well-known
 * Portuguese places at runtime. Anything missing falls back to live
 * Nominatim geocoding (cached in localStorage).
 *
 * Coordinates are approximate centres of each town/landmark.
 */

export type StopLatLng = { lat: number; lng: number; label: string; region: string };

export const STOP_LATLNG: Record<string, StopLatLng> = {
  // Lisbon & coast
  lisbon: { lat: 38.7223, lng: -9.1393, label: "Lisbon", region: "lisbon" },
  lisboa: { lat: 38.7223, lng: -9.1393, label: "Lisboa", region: "lisbon" },
  "april 25th bridge": { lat: 38.6906, lng: -9.1772, label: "Ponte 25 de Abril", region: "lisbon" },
  "cristo rei": { lat: 38.6781, lng: -9.1721, label: "Cristo Rei", region: "lisbon" },
  almada: { lat: 38.6803, lng: -9.1604, label: "Almada", region: "lisbon" },
  azeitao: { lat: 38.5167, lng: -9.0167, label: "Azeitão", region: "lisbon" },
  azeitão: { lat: 38.5167, lng: -9.0167, label: "Azeitão", region: "lisbon" },
  setubal: { lat: 38.5244, lng: -8.8882, label: "Setúbal", region: "lisbon" },
  setúbal: { lat: 38.5244, lng: -8.8882, label: "Setúbal", region: "lisbon" },
  livramento: { lat: 38.5249, lng: -8.892, label: "Livramento Market", region: "lisbon" },
  "livramento market": { lat: 38.5249, lng: -8.892, label: "Livramento Market", region: "lisbon" },
  arrabida: { lat: 38.4833, lng: -8.9833, label: "Arrábida Natural Park", region: "lisbon" },
  arrábida: { lat: 38.4833, lng: -8.9833, label: "Arrábida Natural Park", region: "lisbon" },
  portinho: { lat: 38.4833, lng: -8.9333, label: "Portinho da Arrábida", region: "lisbon" },
  "portinho da arrábida": {
    lat: 38.4833,
    lng: -8.9333,
    label: "Portinho da Arrábida",
    region: "lisbon",
  },
  sesimbra: { lat: 38.4444, lng: -9.1019, label: "Sesimbra", region: "lisbon" },
  "cabo espichel": { lat: 38.4147, lng: -9.2156, label: "Cabo Espichel", region: "lisbon" },
  espichel: { lat: 38.4147, lng: -9.2156, label: "Cabo Espichel", region: "lisbon" },
  sintra: { lat: 38.7972, lng: -9.3906, label: "Sintra", region: "lisbon" },
  cascais: { lat: 38.6979, lng: -9.4215, label: "Cascais", region: "lisbon" },
  "cabo da roca": { lat: 38.7805, lng: -9.4989, label: "Cabo da Roca", region: "lisbon" },

  // Centro / Alentejo
  obidos: { lat: 39.3606, lng: -9.1571, label: "Óbidos", region: "alentejo" },
  óbidos: { lat: 39.3606, lng: -9.1571, label: "Óbidos", region: "alentejo" },
  nazare: { lat: 39.601, lng: -9.0707, label: "Nazaré", region: "alentejo" },
  nazaré: { lat: 39.601, lng: -9.0707, label: "Nazaré", region: "alentejo" },
  fatima: { lat: 39.6308, lng: -8.6789, label: "Fátima", region: "alentejo" },
  fátima: { lat: 39.6308, lng: -8.6789, label: "Fátima", region: "alentejo" },
  tomar: { lat: 39.6018, lng: -8.4117, label: "Tomar", region: "alentejo" },
  coimbra: { lat: 40.2033, lng: -8.4103, label: "Coimbra", region: "alentejo" },
  evora: { lat: 38.5713, lng: -7.9135, label: "Évora", region: "alentejo" },
  évora: { lat: 38.5713, lng: -7.9135, label: "Évora", region: "alentejo" },
  monsaraz: { lat: 38.4436, lng: -7.3811, label: "Monsaraz", region: "alentejo" },
  comporta: { lat: 38.3878, lng: -8.7862, label: "Comporta", region: "alentejo" },
  alentejo: { lat: 38.5713, lng: -7.9135, label: "Alentejo wineries", region: "alentejo" },

  // Porto & North
  porto: { lat: 41.1579, lng: -8.6291, label: "Porto", region: "porto" },
  ribeira: { lat: 41.1408, lng: -8.6133, label: "Ribeira", region: "porto" },
  gaia: { lat: 41.1339, lng: -8.6111, label: "Vila Nova de Gaia", region: "porto" },
  douro: { lat: 41.175, lng: -7.7889, label: "Douro Valley", region: "porto" },
  "douro valley": { lat: 41.175, lng: -7.7889, label: "Douro Valley", region: "porto" },
  pinhao: { lat: 41.19, lng: -7.545, label: "Pinhão", region: "porto" },
  pinhão: { lat: 41.19, lng: -7.545, label: "Pinhão", region: "porto" },
  braga: { lat: 41.5454, lng: -8.4265, label: "Braga", region: "porto" },
  "bom jesus": { lat: 41.5547, lng: -8.3772, label: "Bom Jesus do Monte", region: "porto" },
  guimaraes: { lat: 41.4419, lng: -8.2919, label: "Guimarães", region: "porto" },
  guimarães: { lat: 41.4419, lng: -8.2919, label: "Guimarães", region: "porto" },

  // Algarve
  lagos: { lat: 37.1028, lng: -8.6741, label: "Lagos", region: "algarve" },
  benagil: { lat: 37.0867, lng: -8.4258, label: "Benagil Caves", region: "algarve" },
  "vicentine coast": { lat: 37.2, lng: -8.8, label: "Vicentine Coast", region: "algarve" },
  vicentine: { lat: 37.2, lng: -8.8, label: "Vicentine Coast", region: "algarve" },
  monchique: { lat: 37.3175, lng: -8.5536, label: "Monchique", region: "algarve" },
  "ria formosa": { lat: 37.0167, lng: -7.85, label: "Ria Formosa", region: "algarve" },
  tavira: { lat: 37.1273, lng: -7.6506, label: "Tavira", region: "algarve" },
  faro: { lat: 37.0194, lng: -7.9304, label: "Faro", region: "algarve" },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Look up a curated stop by free-text label. Returns null if no match. */
export function lookupStop(rawLabel: string): StopLatLng | null {
  const key = norm(rawLabel);
  if (STOP_LATLNG[key]) return STOP_LATLNG[key];
  const candidates = Object.keys(STOP_LATLNG)
    .filter((k) => key.includes(k))
    .sort((a, b) => b.length - a.length);
  return candidates.length ? STOP_LATLNG[candidates[0]] : null;
}

/** Geocode an unknown stop via Nominatim (OpenStreetMap), biased to Portugal.
 *  Cached in localStorage so each unknown stop is only fetched once. */
export async function geocodeStop(rawLabel: string): Promise<StopLatLng | null> {
  if (typeof window === "undefined") return null;
  const cacheKey = `geo:${norm(rawLabel)}`;
  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed === null) return null; // negative cache
      return parsed as StopLatLng;
    }
  } catch {
    /* ignore */
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${rawLabel}, Portugal`);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "pt");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!json.length) {
      try {
        window.localStorage.setItem(cacheKey, "null");
      } catch {
        /* ignore */
      }
      return null;
    }
    const hit = json[0];
    const result: StopLatLng = {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      label: rawLabel,
      region: "lisbon",
    };
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      /* ignore */
    }
    return result;
  } catch {
    return null;
  }
}
