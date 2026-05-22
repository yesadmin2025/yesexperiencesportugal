import { useCallback, useEffect, useState } from "react";

/**
 * Studio locale — emotional localization for the Living Atmosphere Studio.
 *
 * Not a generic i18n layer. Every string is curated to keep tone, rhythm and
 * editorial register intact across PT · EN · ES · FR.
 */

export type StudioLocale = "pt" | "en" | "es" | "fr";

const STORAGE_KEY = "studio.locale";
const SUPPORTED: StudioLocale[] = ["pt", "en", "es", "fr"];

export interface StudioDict {
  eyebrow: string;
  /** Rotating poetic invitations shown during the passive prologue. */
  prologueLines: string[];
  /** Drifting word-fragments the user can tap to begin. */
  fragments: string[];
  /** Soft optional invitation at the bottom of the prologue. */
  whisperInvite: string;
  /** Helper microcopy under the invite. */
  whisperHelper: string;
  /** Label on the awakening pill. */
  beginPill: string;
  /** Composer placeholders (rotate). */
  composerPlaceholders: string[];
  /** Composer footer + actions. */
  composerFooter: string;
  composerSend: string;
  composerBusy: string;
  composerExpand: string;
  composerVoiceStart: string;
  composerVoiceStop: string;
  /** Top-bar actions. */
  back: string;
  /** Itinerary toggle. */
  yourDay: string;
  saveStory: string;
  /** Web Speech API language tag. */
  speechLang: string;
}

const DICTS: Record<StudioLocale, StudioDict> = {
  pt: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Portugal já está a ouvir.",
      "Algumas viagens começam com um sentimento.",
      "Que memória vamos criar?",
      "Respira. A história ainda nem começou.",
    ],
    fragments: ["vinho", "mar", "silêncio", "luz", "sal", "rota", "tasca", "pinhal"],
    whisperInvite: "Sussurra a primeira palavra",
    whisperHelper: "ou apenas observa, sem pressa",
    beginPill: "Começar a narrar",
    composerPlaceholders: [
      "fim-de-semana romântico, vinho e mar, sem pressa…",
      "um dia para celebrar com a família, junto à costa…",
      "algo lento no Alentejo, gastronomia e silêncio…",
      "uma fuga curta a sós, com mistério e mapa…",
      "vinhos do Douro com amigos, ritmo solto…",
    ],
    composerFooter: "narra · escreve · adiciona",
    composerSend: "Continuar",
    composerBusy: "A ouvir…",
    composerExpand: "Diz mais",
    composerVoiceStart: "Falar",
    composerVoiceStop: "Parar gravação",
    back: "voltar",
    yourDay: "o teu dia",
    saveStory: "guardar esta história",
    speechLang: "pt-PT",
  },
  en: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Portugal is already listening.",
      "Some journeys begin with a feeling.",
      "What kind of memory shall we make?",
      "Breathe. The story hasn't begun.",
    ],
    fragments: ["wine", "sea", "silence", "light", "salt", "road", "table", "pines"],
    whisperInvite: "Whisper your first word",
    whisperHelper: "or just stay a moment, no rush",
    beginPill: "Begin narrating",
    composerPlaceholders: [
      "a romantic weekend, wine and ocean, slow…",
      "a day to celebrate with family, by the coast…",
      "something quiet in Alentejo, food and silence…",
      "a short escape just for two, mystery and a map…",
      "Douro wines with friends, an unhurried rhythm…",
    ],
    composerFooter: "tell · type · add",
    composerSend: "Continue",
    composerBusy: "Listening…",
    composerExpand: "Say more",
    composerVoiceStart: "Speak",
    composerVoiceStop: "Stop recording",
    back: "back",
    yourDay: "your day",
    saveStory: "save this story",
    speechLang: "en-GB",
  },
  es: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Portugal ya te escucha.",
      "Algunos viajes empiezan con un sentimiento.",
      "¿Qué memoria vamos a crear?",
      "Respira. La historia aún no empezó.",
    ],
    fragments: ["vino", "mar", "silencio", "luz", "sal", "ruta", "mesa", "pinos"],
    whisperInvite: "Susurra la primera palabra",
    whisperHelper: "o quédate un momento, sin prisa",
    beginPill: "Empezar a narrar",
    composerPlaceholders: [
      "un fin de semana romántico, vino y mar, sin prisa…",
      "un día para celebrar en familia, junto a la costa…",
      "algo lento en el Alentejo, gastronomía y silencio…",
      "una escapada corta a solas, misterio y mapa…",
      "vinos del Duero con amigos, ritmo suelto…",
    ],
    composerFooter: "narra · escribe · añade",
    composerSend: "Continuar",
    composerBusy: "Escuchando…",
    composerExpand: "Cuenta más",
    composerVoiceStart: "Hablar",
    composerVoiceStop: "Detener",
    back: "volver",
    yourDay: "tu día",
    saveStory: "guardar esta historia",
    speechLang: "es-ES",
  },
  fr: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Le Portugal écoute déjà.",
      "Certains voyages naissent d'une émotion.",
      "Quel souvenir allons-nous créer ?",
      "Respire. L'histoire n'a pas commencé.",
    ],
    fragments: ["vin", "mer", "silence", "lumière", "sel", "route", "table", "pins"],
    whisperInvite: "Murmure ton premier mot",
    whisperHelper: "ou reste un instant, sans hâte",
    beginPill: "Commencer à raconter",
    composerPlaceholders: [
      "un week-end romantique, vin et océan, sans hâte…",
      "un jour pour célébrer en famille, près de la côte…",
      "quelque chose de lent en Alentejo, table et silence…",
      "une escapade à deux, mystère et carte…",
      "vins du Douro entre amis, rythme libre…",
    ],
    composerFooter: "raconte · écris · ajoute",
    composerSend: "Continuer",
    composerBusy: "À l'écoute…",
    composerExpand: "Dis-en plus",
    composerVoiceStart: "Parler",
    composerVoiceStop: "Arrêter",
    back: "retour",
    yourDay: "ta journée",
    saveStory: "garder cette histoire",
    speechLang: "fr-FR",
  },
};

function detect(): StudioLocale {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as StudioLocale | null;
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt").slice(0, 2).toLowerCase();
  if ((SUPPORTED as string[]).includes(nav)) return nav as StudioLocale;
  return "pt";
}

export function useStudioLocale() {
  const [locale, setLocaleState] = useState<StudioLocale>("pt");

  useEffect(() => {
    setLocaleState(detect());
  }, []);

  const setLocale = useCallback((next: StudioLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { locale, setLocale, t: DICTS[locale], supported: SUPPORTED };
}

export const LOCALE_LABELS: Record<StudioLocale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
  fr: "FR",
};
