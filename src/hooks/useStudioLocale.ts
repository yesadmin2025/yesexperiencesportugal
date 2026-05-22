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

export interface StudioDict {
  eyebrow: string;
  prologueLines: string[];
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
      mood: "Como te sentes?",
      depth: "Como queres viver Portugal?",
      who: "Com quem viajas?",
      intention: "O que te chama?",
      pace: "Em que ritmo?",
    },
    phaseHints: {
      mood: "escolhe uma emoção · sem pensar",
      depth: "cada história tem o seu ritmo",
      who: "uma presença molda tudo",
      intention: "o que queres sentir hoje",
      pace: "respira ao teu próprio passo",
    },
    phaseStepLabel: "Capítulo {n} de {total}",
    phaseSkip: "saltar",
    phaseBack: "voltar",
    phaseComplete: "A tua viagem já tem alma.",
    moodOptions: [
      { value: "romantic", label: "Romântico" },
      { value: "slow", label: "Calmo" },
      { value: "curious", label: "Curioso" },
      { value: "energetic", label: "Vibrante" },
      { value: "open", label: "Aberto" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Um dia inesquecível" },
      { value: "multi", label: "Uma viagem de vários dias" },
    ],
    whoOptions: [
      { value: "couple", label: "A dois" },
      { value: "family", label: "Família" },
      { value: "friends", label: "Amigos" },
      { value: "solo", label: "A sós" },
    ],
    intentionOptions: [
      { value: "wine", label: "Vinho" },
      { value: "gastronomy", label: "Gastronomia" },
      { value: "coast", label: "Mar & costa" },
      { value: "nature", label: "Natureza" },
      { value: "heritage", label: "Cultura" },
      { value: "wellness", label: "Descanso" },
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
    awakeningCue: "Curating your day",
    loadingVerbs: {
      curating: "A compor o teu dia",
      shaping: "A dar forma ao ritmo",
      composing: "A tua história ganha forma",
    },
    conciergeTitle: "Viagens assim são desenhadas à mão.",
    conciergeSub: "Um designer privado pega no que partilhaste e compõe contigo, dia a dia.",
    conciergeBegin: "Começar com um designer",
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
      mood: "How do you feel?",
      depth: "How do you want to experience Portugal?",
      who: "Who travels with you?",
      intention: "What calls you?",
      pace: "At what rhythm?",
    },
    phaseHints: {
      mood: "pick a feeling · don't think",
      depth: "every story has its own rhythm",
      who: "a presence shapes everything",
      intention: "what you want to feel today",
      pace: "breathe at your own pace",
    },
    phaseStepLabel: "Chapter {n} of {total}",
    phaseSkip: "skip",
    phaseBack: "back",
    phaseComplete: "Your journey has a soul now.",
    moodOptions: [
      { value: "romantic", label: "Romantic" },
      { value: "slow", label: "Calm" },
      { value: "curious", label: "Curious" },
      { value: "energetic", label: "Vibrant" },
      { value: "open", label: "Open" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "A single unforgettable day" },
      { value: "multi", label: "A journey over several days" },
    ],
    whoOptions: [
      { value: "couple", label: "Just us two" },
      { value: "family", label: "Family" },
      { value: "friends", label: "Friends" },
      { value: "solo", label: "Solo" },
    ],
    intentionOptions: [
      { value: "wine", label: "Wine" },
      { value: "gastronomy", label: "Cuisine" },
      { value: "coast", label: "Sea & coast" },
      { value: "nature", label: "Nature" },
      { value: "heritage", label: "Culture" },
      { value: "wellness", label: "Rest" },
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
    conciergeBegin: "Begin with a designer",
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
      mood: "¿Cómo te sientes?",
      depth: "¿Cómo quieres vivir Portugal?",
      who: "¿Con quién viajas?",
      intention: "¿Qué te llama?",
      pace: "¿A qué ritmo?",
    },
    phaseHints: {
      mood: "elige una emoción · sin pensar",
      depth: "cada historia tiene su propio ritmo",
      who: "una presencia lo cambia todo",
      intention: "lo que quieres sentir hoy",
      pace: "respira a tu propio paso",
    },
    phaseStepLabel: "Capítulo {n} de {total}",
    phaseSkip: "saltar",
    phaseBack: "volver",
    phaseComplete: "Tu viaje ya tiene alma.",
    moodOptions: [
      { value: "romantic", label: "Romántico" },
      { value: "slow", label: "Calmado" },
      { value: "curious", label: "Curioso" },
      { value: "energetic", label: "Vibrante" },
      { value: "open", label: "Abierto" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Un único día inolvidable" },
      { value: "multi", label: "Un viaje de varios días" },
    ],
    whoOptions: [
      { value: "couple", label: "En pareja" },
      { value: "family", label: "Familia" },
      { value: "friends", label: "Amigos" },
      { value: "solo", label: "A solas" },
    ],
    intentionOptions: [
      { value: "wine", label: "Vino" },
      { value: "gastronomy", label: "Gastronomía" },
      { value: "coast", label: "Mar y costa" },
      { value: "nature", label: "Naturaleza" },
      { value: "heritage", label: "Cultura" },
      { value: "wellness", label: "Descanso" },
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
    conciergeBegin: "Empezar con un diseñador",
    conciergeBack: "Volver a un solo día",
    conciergeTrust: "Hecho a mano · Llamada privada · Sin rutas plantilla",
    guidedCue: "Esto encaja a continuación.",
    guidedAnother: "ver otro",
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
      mood: "Comment te sens-tu ?",
      depth: "Comment veux-tu vivre le Portugal ?",
      who: "Avec qui voyages-tu ?",
      intention: "Qu'est-ce qui t'appelle ?",
      pace: "À quel rythme ?",
    },
    phaseHints: {
      mood: "choisis une émotion · sans réfléchir",
      depth: "chaque histoire a son rythme",
      who: "une présence change tout",
      intention: "ce que tu veux ressentir aujourd'hui",
      pace: "respire à ton propre rythme",
    },
    phaseStepLabel: "Chapitre {n} sur {total}",
    phaseSkip: "passer",
    phaseBack: "retour",
    phaseComplete: "Ton voyage a déjà une âme.",
    moodOptions: [
      { value: "romantic", label: "Romantique" },
      { value: "slow", label: "Calme" },
      { value: "curious", label: "Curieux" },
      { value: "energetic", label: "Vibrant" },
      { value: "open", label: "Ouvert" },
    ],
    journeyTypeOptions: [
      { value: "day", label: "Une seule journée inoubliable" },
      { value: "multi", label: "Un voyage de plusieurs jours" },
    ],
    whoOptions: [
      { value: "couple", label: "À deux" },
      { value: "family", label: "Famille" },
      { value: "friends", label: "Amis" },
      { value: "solo", label: "Seul·e" },
    ],
    intentionOptions: [
      { value: "wine", label: "Vin" },
      { value: "gastronomy", label: "Gastronomie" },
      { value: "coast", label: "Mer & côte" },
      { value: "nature", label: "Nature" },
      { value: "heritage", label: "Culture" },
      { value: "wellness", label: "Repos" },
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
    conciergeBegin: "Commencer avec un designer",
    conciergeBack: "Revenir à une seule journée",
    conciergeTrust: "Composé à la main · Appel privé · Pas d'itinéraires types",
    guidedCue: "Cela s'enchaîne bien.",
    guidedAnother: "voir un autre",
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
