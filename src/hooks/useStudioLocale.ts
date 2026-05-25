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
    reserveCta: "Reservar este dia",
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
    reserveCta: "Reserve this day",
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
  es: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Portugal ya te escucha.",
      "Algunos viajes empiezan con un sentimiento.",
      "¿Qué memoria vamos a crear?",
      "Respira. La historia aún no empezó.",
    ],
    arrivalLine: "Hay lugares para visitar.\nA Portugal se le siente.",
    arrivalContinue: "entrar",
    arrivalFast: "en 60 segundos",
    arrivalPro: "soy agente de viajes",
    openingPrompt: "¿Qué tipo de día se queda contigo?",
    openingScenes: [
      { value: "open", label: "Atlántico de sol a sol" },
      { value: "romantic", label: "Almuerzos largos entre viñas" },
      { value: "slow", label: "Carreteras sin prisa" },
    ],
    fragments: ["vino", "mar", "silencio", "luz", "sal", "ruta", "mesa", "pinos"],
    whisperInvite: "Entrar despacio",
    whisperHelper: "primero siente, luego elige",
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
    emotionPrompt: "¿Cómo te sientes?",
    phaseTitles: {
      mood: "¿Qué tipo de día se queda contigo?",
      depth: "¿Cuánto debe durar este sentir?",
      who: "¿Qué presencia da forma al día?",
      intention: "¿Qué te llama más?",
      pace: "¿A qué ritmo?",
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
    phaseBack: "volver",
    phaseComplete: "Tu día ya tiene su ritmo.",
    moodOptions: [
      { value: "romantic", label: "Romántico" },
      { value: "slow", label: "Calmado" },
      { value: "curious", label: "Curioso" },
      { value: "energetic", label: "Vibrante" },
      { value: "open", label: "Abierto" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Un día, vivido por entero" },
      { value: "multi", label: "Varios días, desplegándose despacio" },
    ],
    whoOptions: [
      { value: "couple", label: "Solo los dos" },
      { value: "family", label: "La mesa entera, junta" },
      { value: "friends", label: "Viejos amigos, sin reloj" },
      { value: "solo", label: "A solas con Portugal" },
    ],
    intentionOptions: [
      { value: "wine", label: "Almuerzos largos entre las viñas" },
      { value: "gastronomy", label: "Mesas donde se pierde la hora" },
      { value: "coast", label: "El Atlántico, de sol a sol" },
      { value: "nature", label: "Pinares y ríos sin prisa" },
      { value: "heritage", label: "Piedras antiguas, calles escondidas" },
      { value: "wellness", label: "Tiempo que respira" },
    ],
    paceOptions: [
      { value: "relaxed", label: "Lento" },
      { value: "balanced", label: "Equilibrado" },
      { value: "full", label: "Intenso" },
    ],
    resumeTitle: "Tu historia sigue aquí",
    resumeContinue: "Continuar",
    resumeRestart: "Empezar de nuevo",
    suggestionFallback: "un momento esperándote",
    invitationWhisper: "Respira. Elige lo que sientes — el resto despierta solo.",
    awakeningCue: "Componiendo tu día",
    loadingVerbs: {
      curating: "Componiendo tu día",
      shaping: "Dando forma al ritmo",
      composing: "Tu historia toma forma",
    },
    conciergeTitle: "Viajes así se diseñan a mano.",
    conciergeSub: "Un diseñador privado toma lo que compartiste y compone los días contigo.",
    conciergeBegin: "Continuar en privado",
    conciergeBack: "Volver a un solo día",
    conciergeTrust: "Hecho a mano · Llamada privada · Sin rutas plantilla",
    guidedCue: "Esto encaja a continuación.",
    guidedAnother: "ver otro",
    emergingCues: {
      early: "Quizá también te encante",
      growing: "Esto encaja a continuación",
      settled: "Esto sigue con naturalidad",
    },
    reserveCta: "Reservar este día",
    viewRoute: "Ver ruta en el mapa",
    hideRoute: "Ocultar mapa",
    talkConcierge: "Hablar con un concierge",
    nameWhisper: {
      prompt: "¿Cómo te llamas?",
      placeholder: "tu primer nombre",
      accept: "Continuar",
      skip: "prefiero mantener el silencio",
    },
  },
  fr: {
    eyebrow: "Experience Studio",
    prologueLines: [
      "Le Portugal écoute déjà.",
      "Certains voyages naissent d'une émotion.",
      "Quel souvenir allons-nous créer ?",
      "Respire. L'histoire n'a pas commencé.",
    ],
    arrivalLine: "Certains lieux se visitent.\nLe Portugal se ressent.",
    arrivalContinue: "entrer",
    arrivalFast: "en 60 secondes",
    arrivalPro: "je suis agent de voyages",
    openingPrompt: "Quel genre de journée te marque ?",
    openingScenes: [
      { value: "open", label: "L'Atlantique du matin au soir" },
      { value: "romantic", label: "Longs déjeuners sous les vignes" },
      { value: "slow", label: "Des routes sans hâte" },
    ],
    fragments: ["vin", "mer", "silence", "lumière", "sel", "route", "table", "pins"],
    whisperInvite: "Entrer lentement",
    whisperHelper: "ressens d'abord, choisis ensuite",
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
    emotionPrompt: "Comment te sens-tu ?",
    phaseTitles: {
      mood: "Quel genre de journée te marque ?",
      depth: "Combien de temps doit durer ce ressenti ?",
      who: "Quelle présence dessine la journée ?",
      intention: "Qu'est-ce qui t'attire le plus ?",
      pace: "À quel rythme ?",
    },
    phaseHints: {
      mood: "",
      depth: "",
      who: "",
      intention: "",
      pace: "",
    },
    phaseStepLabel: "Chapitre {n} sur {total}",
    phaseSkip: "passer",
    phaseBack: "retour",
    phaseComplete: "Ta journée a trouvé son rythme.",
    moodOptions: [
      { value: "romantic", label: "Romantique" },
      { value: "slow", label: "Calme" },
      { value: "curious", label: "Curieux" },
      { value: "energetic", label: "Vibrant" },
      { value: "open", label: "Ouvert" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Un jour, pleinement vécu" },
      { value: "multi", label: "Plusieurs jours, qui s'étirent doucement" },
    ],
    whoOptions: [
      { value: "couple", label: "Rien que vous deux" },
      { value: "family", label: "Toute la table, réunie" },
      { value: "friends", label: "Vieux amis, sans montre" },
      { value: "solo", label: "Seul·e avec le Portugal" },
    ],
    intentionOptions: [
      { value: "wine", label: "Longs déjeuners sous les vignes" },
      { value: "gastronomy", label: "Des tables où l'on perd l'heure" },
      { value: "coast", label: "L'Atlantique, du matin au soir" },
      { value: "nature", label: "Pinèdes et rivières sans hâte" },
      { value: "heritage", label: "Vieilles pierres, ruelles cachées" },
      { value: "wellness", label: "Du temps qui respire" },
    ],
    paceOptions: [
      { value: "relaxed", label: "Lent" },
      { value: "balanced", label: "Équilibré" },
      { value: "full", label: "Intense" },
    ],
    resumeTitle: "Ton histoire est toujours là",
    resumeContinue: "Continuer",
    resumeRestart: "Recommencer",
    suggestionFallback: "un instant qui t'attend",
    invitationWhisper: "Respire. Choisis ce que tu ressens — le reste s'éveille seul.",
    awakeningCue: "Composition de ta journée",
    loadingVerbs: {
      curating: "Composition de ta journée",
      shaping: "Le rythme prend forme",
      composing: "Ton histoire prend forme",
    },
    conciergeTitle: "Ces voyages se dessinent à la main.",
    conciergeSub: "Un designer privé prend ce que tu as partagé et compose les jours avec toi.",
    conciergeBegin: "Continuer en privé",
    conciergeBack: "Revenir à une seule journée",
    conciergeTrust: "Composé à la main · Appel privé · Pas d'itinéraires types",
    guidedCue: "Cela s'enchaîne bien.",
    guidedAnother: "voir un autre",
    emergingCues: {
      early: "Tu pourrais aussi aimer",
      growing: "Cela s'enchaîne bien",
      settled: "Cela vient naturellement",
    },
    reserveCta: "Réserver cette journée",
    viewRoute: "Voir l'itinéraire sur la carte",
    hideRoute: "Masquer la carte",
    talkConcierge: "Parler à un concierge",
    nameWhisper: {
      prompt: "Comment t'appelles-tu ?",
      placeholder: "ton prénom",
      accept: "Continuer",
      skip: "préférer garder le silence",
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
