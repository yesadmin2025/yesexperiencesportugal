// Drift i18n — auto-detects navigator.language and resolves a tiny dictionary
// of visible UI strings (convergence labels, CTAs, encouragements, chapter
// prompts/hints).
//
// LANGUAGE STRATEGY
// ─────────────────
// Most YES Experiences clients are international (predominantly American).
// Default = EN. Portuguese/Spanish/French are chosen only when the browser
// clearly asks for them. URL override `?lang=en|pt|es|fr` always wins.
//
// VOICE (Studio v4 copy reset)
// ───────────────────────────
// Rule: every visible line is 1 sensation + 1 fact + 1 verb. No empty
// metaphors ("a quietness arrives", "stone remembers you", "whispers"). Copy
// must move the user toward a decision while keeping a warm, premium tone.
// PT: formal address ("você" / "o seu") — tutear is rude with luxury travellers.
// EN: warm, direct second person.
//
// AI-generated story text is locale-aware on the server via revealJourney /
// composeStudioMoment, which handle EN + PT (and other locales) directly.

import { useEffect, useState } from "react";

export type DriftLocale = "pt" | "en" | "es" | "fr";

type Dict = Record<string, string>;

const PT: Dict = {
  // Chapters — PT formal "você" voice, sensorial + concreto
  "chapter.opening": "Portugal, ao seu ritmo. Sem formulários, sem espera.",
  "chapter.name": "Para começarmos — como o(a) podemos chamar?",
  "chapter.name_placeholder": "o seu primeiro nome",
  "chapter.settling": "O seu dia começa a ganhar forma.",
  "chapter.settling_named": "{name}, o seu dia começa a ganhar forma.",
  "chapter.companions": "Quem viaja consigo?",
  "chapter.pickup": "Onde gostaria de começar o dia?",
  "chapter.duration": "Um dia, ou vários?",
  "chapter.duration_multi_whisper": "Várias jornadas — mais profundidade, mais descanso entre cada parada.",
  "chapter.radius": "Até que distância está disposto(a) a viajar?",
  "chapter.energy": "Que ritmo prefere?",
  "chapter.style": "O que mais o(a) atrai em Portugal?",
  "chapter.social": "E como deve fechar o dia?",
  "hint.companions.0": "Só eu",
  "hint.companions.1": "Nós os dois",
  "hint.companions.2": "Com a minha gente",
  "hint.pickup.0": "Lisboa — costa à mão",
  "hint.pickup.1": "Centro — aldeias e vinhas",
  "hint.pickup.2": "Alentejo — amplo e lento",
  "hint.duration.0": "Um dia inteiro",
  "hint.duration.1": "Vários dias, sem pressa",
  "hint.radius.0": "Perto — até 1h de carro",
  "hint.radius.1": "Dia completo — até 3h",
  "hint.radius.2": "Longe — se valer a pena",
  "hint.energy.0": "Lento — almoços longos, lugares calmos",
  "hint.energy.1": "Vivo — miradouros, caminhadas, provas",
  "hint.style.0": "Costa — falésias, praias, sal",
  "hint.style.1": "Património — palácios e aldeias",
  "hint.style.2": "Vinho — provas e mesas longas",
  "hint.social.0": "Mesa privada",
  "hint.social.1": "Partilhado com locais",

  // Convergence
  "reveal.eyebrow": "A sua experiência em Portugal",
  "reveal.eyebrow_named": "{name}, a sua experiência em Portugal",
  "reveal.signed_by": "Composta consigo · YES Experiences",
  "reveal.stops": "paragens",
  "reveal.road": "de estrada",
  "reveal.departure": "Partida de",
  "reveal.drive_from_prev": "min de estrada",
  "reveal.no_day": "Ainda não conseguimos compor um dia para este pedido — fale com um local.",
  "reveal.open_all_day": "aberto todo o dia",
  "reveal.map_label": "O seu trajeto",
  "reveal.hero_fallback": "O seu dia em Portugal está pronto.",
  "reveal.hero_fallback_named": "{name}, o seu dia em Portugal está pronto.",

  // Build preview (live itinerary fragment during chapters)
  "build.eyebrow": "O seu dia até agora",

  // CTAs
  "cta.book": "Reservar este dia",
  "cta.save": "Guardar para depois",
  "cta.refine": "Afinar com um local",
  "cta.explore": "Explorar tudo",
  "cta.whatsapp": "Falar com um local",
  "wa.intro": "Olá, estou a desenhar um dia em Portugal no Studio",
  "wa.with_name": "Sou o(a) {name}",
  "wa.region": "Partida prevista: {region}",
  "wa.companions": "Companhia: {companions}",
  "wa.closing": "Gostava de afinar este dia com um local.",

  // Encouragements — concretos, name-aware
  "enc.start": "O seu dia começa a compor-se",
  "enc.start_named": "{name}, o seu dia começa a compor-se",
  "enc.middle": "O trajeto está a ganhar forma",
  "enc.middle_named": "{name}, o trajeto está a ganhar forma",
  "enc.late": "Quase pronto — a afinar os detalhes",
  "enc.late_named": "{name}, quase pronto — a afinar os detalhes",
  "enc.near": "Pronto a reservar",
  "enc.near_named": "{name}, pronto a reservar",

  // Text phase
  "text.continue": "Continuar",

  // Exit
  "ui.exit": "Sair",
  "ui.back": "Voltar",
  "ui.choose": "Escolher: {label}",
  "trust.reviews": "avaliações",
  "build.region_label": "O seu dia · pré-visualização ao vivo",
};

const EN: Dict = {
  "chapter.opening": "Portugal, your way. No forms, no waiting.",
  "chapter.name": "First — what should we call you?",
  "chapter.name_placeholder": "your first name",
  "chapter.settling": "Your day is starting to take shape.",
  "chapter.settling_named": "{name}, your day is starting to take shape.",
  "chapter.companions": "Who is travelling with you?",
  "chapter.pickup": "Where would you like to start the day?",
  "chapter.duration": "One day, or several?",
  "chapter.duration_multi_whisper": "Multi-day journeys unfold slower — more depth, more rest between stops.",
  "chapter.radius": "How far are you willing to travel?",
  "chapter.energy": "Your pace?",
  "chapter.style": "What pulls you in most?",
  "chapter.social": "And how should the day close?",
  "hint.companions.0": "Just me",
  "hint.companions.1": "The two of us",
  "hint.companions.2": "With my people",
  "hint.pickup.0": "Lisbon — coast nearby",
  "hint.pickup.1": "Central Portugal — villages & vineyards",
  "hint.pickup.2": "Alentejo — wide & slow",
  "hint.duration.0": "One full day",
  "hint.duration.1": "Several days, unhurried",
  "hint.radius.0": "Close — under 1h drive",
  "hint.radius.1": "Full day — up to 3h",
  "hint.radius.2": "Far — if it's worth it",
  "hint.energy.0": "Slow — long lunches, quiet places",
  "hint.energy.1": "Alive — viewpoints, walks, tastings",
  "hint.style.0": "Coast — cliffs, beaches, salt",
  "hint.style.1": "Heritage — palaces & villages",
  "hint.style.2": "Wine — tastings & long tables",
  "hint.social.0": "A private table",
  "hint.social.1": "Shared with locals",

  "reveal.eyebrow": "Your Portugal day",
  "reveal.eyebrow_named": "{name}, your Portugal day",
  "reveal.signed_by": "Composed with you · YES Experiences",
  "reveal.stops": "stops",
  "reveal.road": "on the road",
  "reveal.departure": "Departing from",
  "reveal.drive_from_prev": "min drive",
  "reveal.no_day": "We couldn't compose a day for this request yet — speak to a local.",
  "reveal.open_all_day": "open all day",
  "reveal.map_label": "Your route",
  "reveal.hero_fallback": "Your Portugal day is ready.",
  "reveal.hero_fallback_named": "{name}, your Portugal day is ready.",

  "build.eyebrow": "Your day so far",

  "cta.book": "Reserve this day",
  "cta.save": "Save for later",
  "cta.refine": "Refine with a local",
  "cta.explore": "Explore everything",
  "cta.whatsapp": "Talk to a local",
  "wa.intro": "Hi, I'm shaping a day in Portugal in the Studio",
  "wa.with_name": "I'm {name}",
  "wa.region": "Departure: {region}",
  "wa.companions": "Company: {companions}",
  "wa.closing": "I'd love to refine this day with a local.",

  "enc.start": "Your day is starting to compose",
  "enc.start_named": "{name}, your day is starting to compose",
  "enc.middle": "Your route is taking shape",
  "enc.middle_named": "{name}, your route is taking shape",
  "enc.late": "Almost there — tuning the details",
  "enc.late_named": "{name}, almost there — tuning the details",
  "enc.near": "Ready to reserve",
  "enc.near_named": "{name}, ready to reserve",

  "text.continue": "Continue",

  "ui.exit": "Exit",
  "ui.choose": "Choose: {label}",
  "build.region_label": "Your day · live preview",
};

const ES: Dict = {
  "chapter.opening": "Portugal, a su ritmo. Sin formularios, sin espera.",
  "chapter.name": "Para empezar — ¿cómo deberíamos llamarle?",
  "chapter.name_placeholder": "su nombre",
  "chapter.settling": "Su día empieza a tomar forma.",
  "chapter.settling_named": "{name}, su día empieza a tomar forma.",
  "chapter.companions": "¿Quién viaja con usted?",
  "chapter.pickup": "¿Dónde le gustaría empezar el día?",
  "chapter.duration": "¿Un día, o varios?",
  "chapter.duration_multi_whisper": "Varios días — más profundidad, más descanso entre paradas.",
  "chapter.radius": "¿Hasta qué distancia está dispuesto(a) a viajar?",
  "chapter.energy": "¿Qué ritmo prefiere?",
  "chapter.style": "¿Qué le atrae más de Portugal?",
  "chapter.social": "¿Y cómo debería cerrar el día?",
  "hint.companions.0": "Solo yo",
  "hint.companions.1": "Los dos",
  "hint.companions.2": "Con mi gente",
  "hint.pickup.0": "Lisboa — la costa cerca",
  "hint.pickup.1": "Centro de Portugal — pueblos y viñedos",
  "hint.pickup.2": "Alentejo — amplio y lento",
  "hint.duration.0": "Un día completo",
  "hint.duration.1": "Varios días, sin prisa",
  "hint.radius.0": "Cerca — hasta 1h en coche",
  "hint.radius.1": "Día completo — hasta 3h",
  "hint.radius.2": "Lejos — si merece la pena",
  "hint.energy.0": "Lento — almuerzos largos, lugares tranquilos",
  "hint.energy.1": "Vivo — miradores, paseos, catas",
  "hint.style.0": "Costa — acantilados, playas, sal",
  "hint.style.1": "Patrimonio — palacios y pueblos",
  "hint.style.2": "Vino — catas y mesas largas",
  "hint.social.0": "Mesa privada",
  "hint.social.1": "Compartido con locales",

  "reveal.eyebrow": "Su día en Portugal",
  "reveal.eyebrow_named": "{name}, su día en Portugal",
  "reveal.signed_by": "Compuesto con usted · YES Experiences",
  "reveal.stops": "paradas",
  "reveal.road": "en ruta",
  "reveal.departure": "Salida desde",
  "reveal.drive_from_prev": "min en coche",
  "reveal.no_day": "Aún no podemos componer un día para esta petición — hable con un local.",
  "reveal.open_all_day": "abierto todo el día",
  "reveal.map_label": "Su ruta",
  "reveal.hero_fallback": "Su día en Portugal está listo.",
  "reveal.hero_fallback_named": "{name}, su día en Portugal está listo.",

  "build.eyebrow": "Su día hasta ahora",

  "cta.book": "Reservar este día",
  "cta.save": "Guardar para después",
  "cta.refine": "Afinar con un local",
  "cta.explore": "Explorar todo",
  "cta.whatsapp": "Hablar con un local",
  "wa.intro": "Hola, estoy dando forma a un día en Portugal en el Studio",
  "wa.with_name": "Soy {name}",
  "wa.region": "Salida prevista: {region}",
  "wa.companions": "Compañía: {companions}",
  "wa.closing": "Me gustaría afinar este día con un local.",

  "enc.start": "Su día empieza a componerse",
  "enc.start_named": "{name}, su día empieza a componerse",
  "enc.middle": "La ruta está tomando forma",
  "enc.middle_named": "{name}, la ruta está tomando forma",
  "enc.late": "Casi listo — afinando los detalles",
  "enc.late_named": "{name}, casi listo — afinando los detalles",
  "enc.near": "Listo para reservar",
  "enc.near_named": "{name}, listo para reservar",

  "text.continue": "Continuar",

  "ui.exit": "Salir",
  "ui.choose": "Elegir: {label}",
  "build.region_label": "Su día · vista en vivo",
};

const FR: Dict = {
  "chapter.opening": "Le Portugal, à votre rythme. Sans formulaires, sans attente.",
  "chapter.name": "Pour commencer — comment devrions-nous vous appeler ?",
  "chapter.name_placeholder": "votre prénom",
  "chapter.settling": "Votre journée commence à prendre forme.",
  "chapter.settling_named": "{name}, votre journée commence à prendre forme.",
  "chapter.companions": "Qui voyage avec vous ?",
  "chapter.pickup": "Où aimeriez-vous commencer la journée ?",
  "chapter.duration": "Un jour, ou plusieurs ?",
  "chapter.duration_multi_whisper": "Plusieurs jours — plus de profondeur, plus de repos entre les étapes.",
  "chapter.radius": "Jusqu'où êtes-vous prêt(e) à voyager ?",
  "chapter.energy": "Quel rythme préférez-vous ?",
  "chapter.style": "Qu'est-ce qui vous attire le plus au Portugal ?",
  "chapter.social": "Et comment la journée doit-elle se terminer ?",
  "hint.companions.0": "Juste moi",
  "hint.companions.1": "Nous deux",
  "hint.companions.2": "Avec mes proches",
  "hint.pickup.0": "Lisbonne — la côte à proximité",
  "hint.pickup.1": "Centre du Portugal — villages et vignobles",
  "hint.pickup.2": "Alentejo — vaste et lent",
  "hint.duration.0": "Une journée complète",
  "hint.duration.1": "Plusieurs jours, sans hâte",
  "hint.radius.0": "Proche — moins d'1h de route",
  "hint.radius.1": "Journée complète — jusqu'à 3h",
  "hint.radius.2": "Loin — si cela en vaut la peine",
  "hint.energy.0": "Lent — déjeuners longs, lieux calmes",
  "hint.energy.1": "Vivant — points de vue, marches, dégustations",
  "hint.style.0": "Côte — falaises, plages, sel",
  "hint.style.1": "Patrimoine — palais et villages",
  "hint.style.2": "Vin — dégustations et longues tables",
  "hint.social.0": "Une table privée",
  "hint.social.1": "Partagé avec des locaux",

  "reveal.eyebrow": "Votre journée au Portugal",
  "reveal.eyebrow_named": "{name}, votre journée au Portugal",
  "reveal.signed_by": "Composée avec vous · YES Experiences",
  "reveal.stops": "arrêts",
  "reveal.road": "sur la route",
  "reveal.departure": "Départ de",
  "reveal.drive_from_prev": "min de route",
  "reveal.no_day": "Nous ne pouvons pas encore composer cette journée — parlez à un local.",
  "reveal.open_all_day": "ouvert toute la journée",
  "reveal.map_label": "Votre itinéraire",
  "reveal.hero_fallback": "Votre journée au Portugal est prête.",
  "reveal.hero_fallback_named": "{name}, votre journée au Portugal est prête.",

  "build.eyebrow": "Votre journée jusqu'à présent",

  "cta.book": "Réserver cette journée",
  "cta.save": "Garder pour plus tard",
  "cta.refine": "Affiner avec un local",
  "cta.explore": "Tout explorer",
  "cta.whatsapp": "Parler à un local",
  "wa.intro": "Bonjour, je façonne une journée au Portugal dans le Studio",
  "wa.with_name": "Je suis {name}",
  "wa.region": "Départ prévu : {region}",
  "wa.companions": "Compagnie : {companions}",
  "wa.closing": "J'aimerais affiner cette journée avec un local.",

  "enc.start": "Votre journée commence à se composer",
  "enc.start_named": "{name}, votre journée commence à se composer",
  "enc.middle": "L'itinéraire prend forme",
  "enc.middle_named": "{name}, l'itinéraire prend forme",
  "enc.late": "Presque prêt — réglage des détails",
  "enc.late_named": "{name}, presque prêt — réglage des détails",
  "enc.near": "Prêt à réserver",
  "enc.near_named": "{name}, prêt à réserver",

  "text.continue": "Continuer",

  "ui.exit": "Sortir",
  "ui.choose": "Choisir : {label}",
  "build.region_label": "Votre journée · aperçu en direct",
};

const DICTS: Record<DriftLocale, Dict> = { pt: PT, en: EN, es: ES, fr: FR };

function detect(): DriftLocale {
  // SSR / no-window → default EN (most clients are international).
  if (typeof window === "undefined") return "en";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "en" || q === "pt" || q === "es" || q === "fr") return q;
  } catch {
    /* noop */
  }
  // Auto-detect: use the visitor's supported browser language. Anything else
  // (including de-DE, it-IT, nl-NL, …) falls back to EN for the US-heavy audience.
  const nav =
    typeof navigator !== "undefined"
      ? ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase()
      : "en";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
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
