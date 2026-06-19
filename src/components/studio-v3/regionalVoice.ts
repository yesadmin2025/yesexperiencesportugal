// Studio V3 — Track 5: Regional voice.
//
// Maps a Signature tour's `region` string to a small "voice" packet
// (eyebrow + atmosphere word) used to colour transitions and the
// investment ribbon. Never invents partners, stops or prices — only the
// felt tone of the place. Keep it short, sentence-fragment style, in
// brand voice.

export interface RegionalVoice {
  /** Short uppercase eyebrow, e.g. "ARRÁBIDA VOICE". */
  eyebrow: string;
  /** One atmosphere word, e.g. "Salt-light". */
  atmosphere: string;
  /** A single felt-sense phrase under ~40 chars. */
  whisper: string;
}

const DEFAULT_VOICE: RegionalVoice = {
  eyebrow: "PORTUGAL VOICE",
  atmosphere: "Quiet light",
  whisper: "Shaped slowly, around you.",
};

/**
 * Resolve a RegionalVoice from a Signature tour `region` string
 * (e.g. "Setúbal · Arrábida", "Lisbon Coast", "Alentejo").
 * Case-insensitive, accent-insensitive, substring match.
 */
export function regionalVoiceFor(region: string | null | undefined): RegionalVoice {
  if (!region) return DEFAULT_VOICE;
  const r = region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (r.includes("arrabida") || r.includes("sesimbra") || r.includes("azeitao") || r.includes("setubal")) {
    return {
      eyebrow: "ARRÁBIDA VOICE",
      atmosphere: "Salt-light",
      whisper: "Cliffs, Moscatel, slow tables by the sea.",
    };
  }
  if (r.includes("alentejo") || r.includes("comporta") || r.includes("evora")) {
    return {
      eyebrow: "ALENTEJO VOICE",
      atmosphere: "Long horizon",
      whisper: "Cork oaks, low sun, time that widens.",
    };
  }
  if (r.includes("sintra") || r.includes("cascais") || r.includes("cabo da roca") || r.includes("lisbon coast")) {
    return {
      eyebrow: "LISBON COAST VOICE",
      atmosphere: "Atlantic edge",
      whisper: "Mist, granite, the end of the continent.",
    };
  }
  if (r.includes("douro") || r.includes("porto")) {
    return {
      eyebrow: "DOURO VOICE",
      atmosphere: "Slow river",
      whisper: "Schist terraces, ports aged in patience.",
    };
  }
  if (r.includes("centro") || r.includes("coimbra") || r.includes("obidos") || r.includes("nazare") || r.includes("fatima")) {
    return {
      eyebrow: "CENTRO VOICE",
      atmosphere: "Old stones",
      whisper: "Walled towns, monasteries, quiet stories.",
    };
  }
  if (r.includes("algarve")) {
    return {
      eyebrow: "ALGARVE VOICE",
      atmosphere: "Warm tide",
      whisper: "Honeyed cliffs, hidden coves, citrus air.",
    };
  }
  return DEFAULT_VOICE;
}
