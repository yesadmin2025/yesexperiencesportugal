import { useCallback, useEffect, useState } from "react";

/**
 * Studio locale — emotional localization for the Living Atmosphere Studio.
 *
 * Not a generic i18n layer. Every string is curated to keep tone, rhythm and
 * editorial register intact across PT · EN.
 */

export type StudioLocale = "pt" | "en";

const STORAGE_KEY = "studio.locale";
const SUPPORTED: StudioLocale[] = ["pt", "en"];

export interface EmotionOption<V extends string = string> {
  value: V;
  label: string;
}

export interface OpeningScene<V extends string = string> {
  value: V;
  label: string;
}

export interface StudioDict {
  eyebrow: string;
  prologueLines: string[];
  /** Single static line for the cinematic arrival (BEAT 1). */
  arrivalLine: string;
  /** Subtle continue affordance shown after a long pause (BEAT 1). */
  arrivalContinue: string;
  /** Discreet faster-pace affordance shown alongside `arrivalContinue` (BEAT 1). */
  arrivalFast: string;
  /** Discreet "pro / agent" entry for travel agents and power users (BEAT 1). */
  arrivalPro: string;
  /** Single emotional framing question for the opening scene picker (BEAT 2). */
  openingPrompt: string;
  /** 3 full-bleed cinematic scenes for the opening pull (BEAT 2). Each maps to a Mood. */
  openingScenes: OpeningScene<"open" | "romantic" | "slow">[];
  fragments: string[];
  whisperInvite: string;
  whisperHelper: string;
  beginPill: string;
  composerPlaceholders: string[];
  composerFooter: string;
  composerSend: string;
  composerBusy: string;
  composerExpand: string;
  composerVoiceStart: string;
  composerVoiceStop: string;
  back: string;
  yourDay: string;
  saveStory: string;
  speechLang: string;
  emotionPrompt: string;
  phaseTitles: { mood: string; depth: string; who: string; intention: string; pace: string };
  phaseHints: { mood: string; depth: string; who: string; intention: string; pace: string };
  phaseStepLabel: string;
  phaseSkip: string;
  phaseBack: string;
  phaseComplete: string;
  moodOptions: EmotionOption<"slow" | "curious" | "romantic" | "open" | "energetic">[];
  journeyTypeOptions: EmotionOption<"day" | "multi">[];
  whoOptions: EmotionOption<"couple" | "family" | "friends" | "solo">[];
  intentionOptions: EmotionOption<
    "wine" | "gastronomy" | "nature" | "heritage" | "coast" | "wellness"
  >[];
  paceOptions: EmotionOption<"relaxed" | "balanced" | "full">[];
  resumeTitle: string;
  resumeContinue: string;
  resumeRestart: string;
  suggestionFallback: string;
  invitationWhisper: string;
  awakeningCue: string;
  loadingVerbs: { curating: string; shaping: string; composing: string };
  conciergeTitle: string;
  conciergeSub: string;
  conciergeBegin: string;
  conciergeBack: string;
  conciergeTrust: string;
  guidedCue: string;
  guidedAnother: string;
  emergingCues: { early: string; growing: string; settled: string };
  reserveCta: string;
  viewRoute: string;
  hideRoute: string;
  talkConcierge: string;
  nameWhisper: {
    prompt: string;
    placeholder: string;
    accept: string;
    skip: string;
  };
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
    arrivalLine: "Há lugares para visitar.\nPortugal é para sentir.",
    arrivalContinue: "entrar",
    arrivalFast: "em 60 segundos",
    arrivalPro: "sou agente de viagens",
    openingPrompt: "Que tipo de dia fica contigo?",
    openingScenes: [
      { value: "open", label: "Atlântico do nascer ao pôr" },
      { value: "romantic", label: "Almoços longos entre vinhas" },
      { value: "slow", label: "Estradas sem pressa" },
    ],
    fragments: ["vinho", "mar", "silêncio", "luz", "sal", "rota", "tasca", "pinhal"],
    whisperInvite: "Entrar devagar",
    whisperHelper: "primeiro sente, depois escolhe",
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
    emotionPrompt: "Como te sentes?",
    phaseTitles: {
      mood: "Que tipo de dia fica contigo?",
      depth: "Quanto tempo deve durar este sentir?",
      who: "Que presença molda o dia?",
      intention: "O que mais te puxa?",
      pace: "Em que ritmo?",
    },
    phaseHints: {
      mood: "",
      depth: "",
      who: "",
      intention: "",
      pace: "",
    },
    phaseStepLabel: "Capítulo {n} de {total}",
    phaseSkip: "saltar",
    phaseBack: "voltar",
    phaseComplete: "O teu dia já tem o seu ritmo.",
    moodOptions: [
      { value: "romantic", label: "Romântico" },
      { value: "slow", label: "Calmo" },
      { value: "curious", label: "Curioso" },
      { value: "energetic", label: "Vibrante" },
      { value: "open", label: "Aberto" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Um dia, vivido por inteiro" },
      { value: "multi", label: "Vários dias, a desfiar devagar" },
    ],
    whoOptions: [
      { value: "couple", label: "Só os dois" },
      { value: "family", label: "A mesa toda, junta" },
      { value: "friends", label: "Velhos amigos, sem horas" },
      { value: "solo", label: "A sós com Portugal" },
    ],
    intentionOptions: [
      { value: "wine", label: "Almoços longos entre as vinhas" },
      { value: "gastronomy", label: "Mesas onde se perde a hora" },
      { value: "coast", label: "O Atlântico, do nascer ao pôr" },
      { value: "nature", label: "Pinhal e rios sem pressa" },
      { value: "heritage", label: "Pedras antigas, ruas escondidas" },
      { value: "wellness", label: "Tempo que respira" },
    ],
    paceOptions: [
      { value: "relaxed", label: "Lento" },
      { value: "balanced", label: "Equilibrado" },
      { value: "full", label: "Intenso" },
    ],
    resumeTitle: "A tua história ainda está aqui",
    resumeContinue: "Continuar",
    resumeRestart: "Começar de novo",
    suggestionFallback: "um momento à tua espera",
    invitationWhisper: "Respira. Escolhe o que sentes — o resto desperta sozinho.",
    awakeningCue: "A compor o teu dia",
    loadingVerbs: {
      curating: "A compor o teu dia",
      shaping: "A dar forma ao ritmo",
      composing: "A tua história ganha forma",
    },
    conciergeTitle: "Viagens assim são desenhadas à mão.",
    conciergeSub: "Um designer privado pega no que partilhaste e compõe contigo, dia a dia.",
    conciergeBegin: "Continuar em privado",
    conciergeBack: "Voltar a um único dia",
    conciergeTrust: "Composta à mão · Chamada privada · Sem roteiros pré-feitos",
    guidedCue: "Isto encaixa a seguir.",
    guidedAnother: "ver outro",
    emergingCues: {
      early: "Talvez também adores isto",
      growing: "Isto encaixa a seguir",
      settled: "Isto segue naturalmente",
    },
    reserveCta: "Verificar disponibilidade e reservar",
    viewRoute: "Ver percurso no mapa",
    hideRoute: "Esconder mapa",
    talkConcierge: "Falar com um concierge",
    nameWhisper: {
      prompt: "Como te chamas?",
      placeholder: "o teu primeiro nome",
      accept: "Continuar",
      skip: "preferir manter o silêncio",
    },
  },
  en: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Portugal is already listening.",
      "Some journeys begin with a feeling.",
      "What kind of memory shall we make?",
      "Breathe. The story hasn't begun.",
    ],
    arrivalLine: "Some places ask to be visited.\nPortugal asks to be felt.",
    arrivalContinue: "enter",
    arrivalFast: "in 60 seconds",
    arrivalPro: "i'm a travel agent",
    openingPrompt: "What kind of day stays with you?",
    openingScenes: [
      { value: "open", label: "Atlantic all day" },
      { value: "romantic", label: "Long lunches beneath vines" },
      { value: "slow", label: "Roads without rushing" },
    ],
    fragments: ["wine", "sea", "silence", "light", "salt", "road", "table", "pines"],
    whisperInvite: "Enter slowly",
    whisperHelper: "first feel, then choose",
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
    emotionPrompt: "How do you feel?",
    phaseTitles: {
      mood: "What kind of day stays with you?",
      depth: "How long should this feeling last?",
      who: "Whose presence shapes the day?",
      intention: "What pulls you most?",
      pace: "At what rhythm?",
    },
    phaseHints: {
      mood: "",
      depth: "",
      who: "",
      intention: "",
      pace: "",
    },
    phaseStepLabel: "Chapter {n} of {total}",
    phaseSkip: "skip",
    phaseBack: "back",
    phaseComplete: "Your day has its rhythm now.",
    moodOptions: [
      { value: "romantic", label: "Romantic" },
      { value: "slow", label: "Calm" },
      { value: "curious", label: "Curious" },
      { value: "energetic", label: "Vibrant" },
      { value: "open", label: "Open" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "One day, fully lived" },
      { value: "multi", label: "Several days, slowly unfolding" },
    ],
    whoOptions: [
      { value: "couple", label: "Just the two of us" },
      { value: "family", label: "The whole table, together" },
      { value: "friends", label: "Old friends, no schedule" },
      { value: "solo", label: "Alone with Portugal" },
    ],
    intentionOptions: [
      { value: "wine", label: "Long lunches beneath the vines" },
      { value: "gastronomy", label: "Tables worth losing time at" },
      { value: "coast", label: "The Atlantic, all day" },
      { value: "nature", label: "Pine forests and slow rivers" },
      { value: "heritage", label: "Old stones, hidden streets" },
      { value: "wellness", label: "Time that breathes" },
    ],
    paceOptions: [
      { value: "relaxed", label: "Slow" },
      { value: "balanced", label: "Balanced" },
      { value: "full", label: "Full" },
    ],
    resumeTitle: "Your story is still here",
    resumeContinue: "Continue",
    resumeRestart: "Start over",
    suggestionFallback: "a moment waiting for you",
    invitationWhisper: "Breathe. Pick what you feel — the rest awakens on its own.",
    awakeningCue: "Curating your day",
    loadingVerbs: {
      curating: "Curating your day",
      shaping: "Shaping the rhythm",
      composing: "Your story is taking shape",
    },
    conciergeTitle: "Journeys like this are shaped by hand.",
    conciergeSub: "A private designer takes what you've shared and composes the days with you.",
    conciergeBegin: "Continue in private",
    conciergeBack: "Build a single day instead",
    conciergeTrust: "Hand-composed · Private call · No template itineraries",
    guidedCue: "This feels right next.",
    guidedAnother: "show another",
    emergingCues: {
      early: "You might also love",
      growing: "This feels right next",
      settled: "This follows naturally",
    },
    reserveCta: "Check availability & reserve",
    viewRoute: "View route on map",
    hideRoute: "Hide map",
    talkConcierge: "Talk to concierge",
    nameWhisper: {
      prompt: "What shall we call you?",
      placeholder: "your first name",
      accept: "Continue",
      skip: "prefer to stay quiet",
    },
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
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt")
    .slice(0, 2)
    .toLowerCase();
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
};
