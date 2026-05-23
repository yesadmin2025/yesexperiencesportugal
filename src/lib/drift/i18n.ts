// Drift i18n — auto-detects navigator.language and resolves a tiny dictionary
// of visible UI strings (convergence labels, CTAs, encouragements, chapter
// whispers/hints).
//
// LANGUAGE STRATEGY
// ─────────────────
// Most YES Experiences clients are international (predominantly American).
// Default = EN. Portuguese is only chosen when navigator.language clearly
// starts with `pt`. URL override `?lang=en|pt` always wins.
//
// VOICE
// ─────
// PT: formal address ("você" / "o seu") — tutear is considered rude with
// premium luxury travellers. Never use "tu", "teu", "contigo", "te".
// EN: warm, direct second person.
//
// AI-generated story text is locale-aware on the server via revealJourney /
// composeStudioMoment, which handle EN + PT (and other locales) directly.

import { useEffect, useState } from "react";

export type DriftLocale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  // Chapters — PT formal "você" voice
  "chapter.opening": "a manhã abre devagar sobre pedra e sal.",
  "chapter.name": "como o(a) podemos chamar",
  "chapter.name_placeholder": "o seu primeiro nome",
  "chapter.settling": "a primeira forma começa a aparecer",
  "chapter.settling_named": "{name}, a primeira forma começa a aparecer.",
  "chapter.companions": "quem o(a) acompanha",
  "chapter.pickup": "onde começa esta história",
  "chapter.duration": "um dia, ou vários",
  "chapter.duration_multi_whisper": "o tempo abre. devagar, sem mapa.",
  "chapter.radius": "até onde seguiria esse instinto",
  "chapter.energy": "que ritmo merece ficar",
  "chapter.style": "o que o(a) chama antes das palavras",
  "chapter.social": "e no fim, que memória fica acesa",
  "hint.companions.0": "só, com espaço",
  "hint.companions.1": "a dois, sem ruído",
  "hint.companions.2": "com os seus",
  "hint.pickup.0": "Lisboa, com a costa perto",
  "hint.pickup.1": "Centro, pedra e silêncio",
  "hint.pickup.2": "Alentejo, em voz baixa",
  "hint.duration.0": "um dia inteiro",
  "hint.duration.1": "vários dias, sem pressa",
  "hint.radius.0": "perto, demorado",
  "hint.radius.1": "um dia inteiro fora",
  "hint.radius.2": "longe, se valer a pena",
  "hint.energy.0": "lento, quase secreto",
  "hint.energy.1": "vivo, com pele",
  "hint.style.0": "mar aberto",
  "hint.style.1": "pedra antiga",
  "hint.style.2": "vinha e ritual",
  "hint.social.0": "uma mesa só vossa",
  "hint.social.1": "copos a tocar devagar",

  // Convergence
  "reveal.eyebrow": "a sua história em Portugal",
  "reveal.eyebrow_named": "{name}, a sua história em Portugal",
  "reveal.signed_by": "composta consigo · YES Experiences",
  "reveal.stops": "paragens",
  "reveal.road": "de estrada",
  "reveal.departure": "partida de",
  "reveal.drive_from_prev": "min de estrada",
  "reveal.no_day": "ainda não há um dia possível para este pedido — fale com um local.",
  "reveal.open_all_day": "aberto todo o dia",
  "reveal.map_label": "o seu trajecto",
  "reveal.hero_fallback": "este é o seu Portugal.",
  "reveal.hero_fallback_named": "{name}, este é o seu Portugal.",

  // Build preview (live itinerary fragment during chapters)
  "build.eyebrow": "a compor à sua volta",

  // CTAs (defaults if Supabase voice is empty)
  "cta.book": "reservar este dia",
  "cta.save": "guardar para depois",
  "cta.refine": "afinar com um local",
  "cta.explore": "explorar tudo",
  "cta.whatsapp": "falar com um local",
  "wa.intro": "Olá, estou a desenhar um dia em Portugal no Studio",
  "wa.with_name": "Sou o(a) {name}",
  "wa.region": "Partida prevista: {region}",
  "wa.companions": "Companhia: {companions}",
  "wa.closing": "Gostava de afinar este dia com um local.",

  // Encouragements — YES-branded, name-aware (use {name} if present)
  "enc.start": "yes · o primeiro sinal entrou",
  "enc.start_named": "yes · {name}, o primeiro sinal entrou",
  "enc.middle": "yes · o mapa começa a responder",
  "enc.middle_named": "yes · {name}, o mapa começa a responder",
  "enc.late": "yes · o dia ganha contorno",
  "enc.late_named": "yes · {name}, o dia ganha contorno",
  "enc.near": "yes · a composição está pronta",
  "enc.near_named": "yes · {name}, a sua composição está pronta",

  // Text phase
  "text.continue": "continuar",

  // Exit
  "ui.exit": "sair",
};

const EN: Dict = {
  "chapter.opening": "morning opens slowly over stone and salt.",
  "chapter.name": "what should we call you",
  "chapter.name_placeholder": "your first name",
  "chapter.settling": "the first shape is starting to appear",
  "chapter.settling_named": "{name}, the first shape is starting to appear.",
  "chapter.companions": "who is coming with you",
  "chapter.pickup": "where does this story begin",
  "chapter.duration": "one day, or several",
  "chapter.duration_multi_whisper": "time opens. slowly, without a map.",
  "chapter.radius": "how far would you follow the feeling",
  "chapter.energy": "which rhythm should stay",
  "chapter.style": "what calls before words",
  "chapter.social": "and in the end, what stays warm",
  "hint.companions.0": "alone, with space",
  "hint.companions.1": "two of you, no noise",
  "hint.companions.2": "with your people",
  "hint.pickup.0": "Lisbon, close to the coast",
  "hint.pickup.1": "Central Portugal, stone and quiet",
  "hint.pickup.2": "Alentejo, low voice",
  "hint.duration.0": "one full day",
  "hint.duration.1": "several days, unhurried",
  "hint.radius.0": "nearby, slowly",
  "hint.radius.1": "a whole day out",
  "hint.radius.2": "far, if it is worth it",
  "hint.energy.0": "slow, almost secret",
  "hint.energy.1": "alive, textured",
  "hint.style.0": "open Atlantic",
  "hint.style.1": "old stone",
  "hint.style.2": "vineyard and ritual",
  "hint.social.0": "a table of your own",
  "hint.social.1": "glasses touching softly",

  "reveal.eyebrow": "your Portugal story",
  "reveal.eyebrow_named": "{name}, your Portugal story",
  "reveal.signed_by": "composed with you · YES Experiences",
  "reveal.stops": "stops",
  "reveal.road": "on the road",
  "reveal.departure": "departing from",
  "reveal.drive_from_prev": "min drive",
  "reveal.no_day": "we couldn't compose a day for this request yet — speak to a local.",
  "reveal.open_all_day": "open all day",
  "reveal.map_label": "your route",
  "reveal.hero_fallback": "this is your Portugal.",
  "reveal.hero_fallback_named": "{name}, this is your Portugal.",

  "build.eyebrow": "being built around you",

  "cta.book": "book this day",
  "cta.save": "save for later",
  "cta.refine": "refine with a local",
  "cta.explore": "explore everything",
  "cta.whatsapp": "talk to a local",
  "wa.intro": "Hi, I'm shaping a day in Portugal in the Studio",
  "wa.with_name": "I'm {name}",
  "wa.region": "Departure: {region}",
  "wa.companions": "Company: {companions}",
  "wa.closing": "I'd love to refine this day with a local.",

  "enc.start": "yes · the first signal is in",
  "enc.start_named": "yes · {name}, the first signal is in",
  "enc.middle": "yes · the map is starting to respond",
  "enc.middle_named": "yes · {name}, the map is starting to respond",
  "enc.late": "yes · the day has a contour",
  "enc.late_named": "yes · {name}, the day has a contour",
  "enc.near": "yes · the composition is ready",
  "enc.near_named": "yes · {name}, your composition is ready",

  "text.continue": "continue",

  "ui.exit": "exit",
};

const DICTS: Record<DriftLocale, Dict> = { pt: PT, en: EN };

function detect(): DriftLocale {
  // SSR / no-window → default EN (most clients are international).
  if (typeof window === "undefined") return "en";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "en" || q === "pt") return q;
  } catch {
    /* noop */
  }
  // Auto-detect: only choose PT when the navigator clearly says Portuguese.
  // Anything else (en-US, en-GB, fr-FR, es-ES, de-DE, …) → EN.
  const nav =
    typeof navigator !== "undefined"
      ? ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase()
      : "en";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

export function useDriftLocale(): DriftLocale {
  // Initial render = EN so SSR + first paint match the international default.
  // After hydration we re-detect and may switch to PT if the browser asks.
  const [loc, setLoc] = useState<DriftLocale>("en");
  useEffect(() => {
    setLoc(detect());
  }, []);
  return loc;
}

export function t(key: string, locale: DriftLocale): string {
  const dict = DICTS[locale] ?? DICTS.en;
  return dict[key] ?? DICTS.en[key] ?? key;
}

/** Convenience: resolve `{key}_named` if a name is present, otherwise the base key,
 *  and interpolate `{name}` automatically. Keeps personalization visible and consistent. */
export function tName(baseKey: string, locale: DriftLocale, name?: string | null): string {
  if (name && name.trim().length > 0) {
    const dict = DICTS[locale] ?? DICTS.en;
    const namedKey = `${baseKey}_named`;
    const tpl = dict[namedKey] ?? DICTS.en[namedKey];
    if (tpl) return tpl.replace("{name}", name.trim());
  }
  return t(baseKey, locale);
}
