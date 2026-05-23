// Drift i18n — auto-detects navigator.language and resolves a tiny dictionary
// of visible UI strings (convergence labels, CTAs, encouragements, chapter
// whispers/hints). PT is canonical; EN is a respectful translation.
//
// Override with `?lang=en` on the URL for testing. Falls back to PT.
//
// NOTE: We intentionally keep the dictionary small. AI-generated story text
// is locale-aware on the server side via `revealJourney({ locale })`.

import { useEffect, useState } from "react";

export type DriftLocale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  // Chapters — PT is canonical Studio Bible voice
  "chapter.opening": "portugal já está acordada. respira primeiro.",
  "chapter.name": "como te devemos chamar",
  "chapter.name_placeholder": "o teu primeiro nome",
  "chapter.settling": "portugal está a reparar em ti",
  "chapter.settling_named": "{name}, portugal está a reparar em ti.",
  "chapter.companions": "quem vem contigo",
  "chapter.pickup": "onde começa esta história",
  "chapter.duration": "um dia, ou vários",
  "chapter.duration_multi_whisper": "o tempo abre. devagar, sem mapa.",
  "chapter.radius": "até onde irias seguir esse instinto",
  "chapter.energy": "que ritmo merece ficar",
  "chapter.style": "o que te chama antes das palavras",
  "chapter.social": "e no fim, que memória fica acesa",
  "hint.companions.0": "só, com espaço",
  "hint.companions.1": "a dois, sem ruído",
  "hint.companions.2": "com os teus",
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
  "reveal.eyebrow": "o teu dia, composto",
  "reveal.stops": "paragens",
  "reveal.road": "de estrada",
  "reveal.departure": "partida de",
  "reveal.drive_from_prev": "min de estrada",
  "reveal.no_day": "ainda não há um dia possível para este pedido — fala com um local.",
  "reveal.open_all_day": "aberto todo o dia",
  "reveal.map_label": "o teu trajecto",

  // CTAs (defaults if Supabase voice is empty)
  "cta.book": "reservar este dia",
  "cta.save": "guardar para depois",
  "cta.refine": "refinar com um local",
  "cta.explore": "explorar tudo",
  "cta.whatsapp": "falar com um local",
  "wa.intro": "Olá, estou a desenhar um dia em Portugal no Studio",
  "wa.with_name": "Sou o(a) {name}",
  "wa.region": "Partida prevista: {region}",
  "wa.companions": "Companhia: {companions}",
  "wa.closing": "Gostava de afinar este dia com um local.",

  // Encouragements (shown above progress bar at key moments)
  "enc.start": "um traço de Portugal",
  "enc.middle": "a forma começa a aparecer",
  "enc.late": "já há um dia a ganhar corpo",
  "enc.near": "a revelação está pronta",

  // Text phase
  "text.continue": "continuar",

  // Exit
  "ui.exit": "sair",
};

const EN: Dict = {
  "chapter.opening": "Portugal is already awake. Breathe first.",
  "chapter.name": "what should we call you",
  "chapter.name_placeholder": "your first name",
  "chapter.settling": "Portugal is starting to notice you",
  "chapter.settling_named": "{name}, Portugal is starting to notice you.",
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

  "reveal.eyebrow": "your day, composed",
  "reveal.stops": "stops",
  "reveal.road": "on the road",
  "reveal.departure": "departing from",
  "reveal.drive_from_prev": "min drive",
  "reveal.no_day": "we couldn't compose a day for this request yet — speak to a local.",
  "reveal.open_all_day": "open all day",
  "reveal.map_label": "your route",

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

  "enc.start": "a trace of Portugal",
  "enc.middle": "the shape is emerging",
  "enc.late": "a day is taking form",
  "enc.near": "the reveal is ready",

  "text.continue": "continue",

  "ui.exit": "exit",
};

const DICTS: Record<DriftLocale, Dict> = { pt: PT, en: EN };

function detect(): DriftLocale {
  if (typeof window === "undefined") return "pt";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "en" || q === "pt") return q;
  } catch {
    /* noop */
  }
  const nav =
    typeof navigator !== "undefined" ? (navigator.language || "pt").toLowerCase() : "pt";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

export function useDriftLocale(): DriftLocale {
  const [loc, setLoc] = useState<DriftLocale>("pt");
  useEffect(() => {
    setLoc(detect());
  }, []);
  return loc;
}

export function t(key: string, locale: DriftLocale): string {
  const dict = DICTS[locale] ?? DICTS.pt;
  return dict[key] ?? DICTS.pt[key] ?? key;
}
