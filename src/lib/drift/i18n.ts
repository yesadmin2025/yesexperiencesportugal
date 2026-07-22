// Drift i18n — auto-detects navigator.language and resolves a tiny dictionary
// of visible UI strings (convergence labels, CTAs, encouragements, chapter
// prompts/hints).
//
// LANGUAGE STRATEGY
// ─────────────────
// Most YES Experiences clients are international (predominantly American).
// Default = EN. Portuguese is chosen only when the browser clearly asks for it.
// URL override `?lang=en|pt` always wins.
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

export type DriftLocale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  // Chapters — PT formal "você" voice, sensorial + concreto
  "chapter.opening": "Portugal, ao seu ritmo. Sem formulários, sem espera.",
  "chapter.name": "Para começarmos — como o(a) podemos *chamar*?",
  "chapter.name_placeholder": "o seu primeiro nome",
  "chapter.settling": "O seu dia começa a ganhar *forma*.",
  "chapter.settling_named": "{name}, o seu dia começa a ganhar *forma*.",
  "chapter.companions": "Quem *viaja* consigo?",
  "chapter.pickup": "Onde gostaria de *começar* o dia?",
  "chapter.duration": "Um dia, ou *vários*?",
  "chapter.duration_multi_whisper":
    "Várias jornadas — mais profundidade, mais descanso entre cada parada.",
  "chapter.radius": "Até que *distância* está disposto(a) a viajar?",
  "chapter.energy": "Que *ritmo* prefere?",
  "chapter.style": "O que mais o(a) *atrai* em Portugal?",
  "chapter.social": "E como deve *fechar* o dia?",
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
  "wa.intro": "Hi YES — I'm designing a day in Portugal in the Studio",
  "wa.with_name": "I'm {name}",
  "wa.region": "Departure: {region}",
  "wa.companions": "Company: {companions}",
  "wa.closing": "I'd like to refine this day with a local.",

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
  "ui.sensing": "a sentir",
  "ui.choose": "Escolher: {label}",
  "trust.reviews": "avaliações",
  "choice.idle_hint": "Toque numa imagem para escolher — ou demore o tempo que precisar.",
  "preview.expand": "Abrir pré-visualização do seu dia",
  "preview.dialog": "O seu dia — pré-visualização ao vivo",
  "preview.tap_to_open": "toque para abrir",
  "preview.tab_story": "História",
  "preview.tab_timeline": "Horário",
  "preview.tab_map": "Mapa",
  "preview.story_intro":
    "o seu dia está a tomar forma com paragens reais, escolhidas para o ritmo que descreveu.",
  "preview.min_drive": "min de carro",
  "preview.min_stay": "min no local",
  "preview.indicative": "indicativo",
  "build.region_label": "O seu dia · pré-visualização ao vivo",
  "reco.eyebrow": "Também combina consigo",
  "reco.open": "Abrir",
  "quality.eyebrow": "Qualidade do dia",
  "quality.aria": "Pontuação de qualidade do dia composto",
  "quality.summary_high": "Excelente ritmo e equilíbrio entre paragens.",
  "quality.summary_mid": "Bom ritmo — afine mais um sinal para subir.",
  "quality.summary_low": "Composição inicial — continue para afinar.",
  "quality.wine": "Vinho",
  "quality.coast": "Costa",
  "quality.heritage": "Património",
  "quality.table": "Mesa",
  "quality.of_five": "em 5",

  // Guests · Enhancements · Tier (Bible alignment)
  "chapter.guests": "*Quantos* vão viajar?",
  "chapter.guests_placeholder": "2",
  "chapter.guests_help": "usado para calcular o investimento por pessoa",
  "chapter.enhancements": "Quer juntar algum *momento* especial?",
  "hint.enh.0": "Nada extra — ritmo natural",
  "hint.enh.1": "Almoço privado num produtor",
  "hint.enh.2": "Hora extra ao pôr do sol",
  "chapter.tier": "Que nível de *cuidado* prefere?",
  "hint.tier.0": "Essential — privado, simples",
  "hint.tier.1": "Signature — guia sénior, mesa reservada",
  "hint.tier.2": "Bespoke — anfitrião dedicado, tudo orquestrado",

  // Trust (contextual)
  "trust.midflow": "700+ avaliações 5★ em plataformas verificadas · Google · Tripadvisor · Viator",
};

const EN: Dict = {
  "chapter.opening": "Portugal, your way. No forms, no waiting.",
  "chapter.name": "First — what should we *call* you?",
  "chapter.name_placeholder": "your first name",
  "chapter.settling": "Your day is starting to take *shape*.",
  "chapter.settling_named": "{name}, your day is starting to take *shape*.",
  "chapter.companions": "Who is *travelling* with you?",
  "chapter.pickup": "Where would you like to *start* the day?",
  "chapter.duration": "One day, or *several*?",
  "chapter.duration_multi_whisper":
    "Multi-day journeys unfold slower — more depth, more rest between stops.",
  "chapter.radius": "How *far* are you willing to travel?",
  "chapter.energy": "Your *pace*?",
  "chapter.style": "What *pulls* you in most?",
  "chapter.social": "And how should the day *close*?",
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

  "cta.book": "Secure Your Experience",
  "cta.save": "Save My Experience",
  "cta.refine": "Refine with a Local Designer",
  "cta.explore": "Explore everything",
  "cta.whatsapp": "Talk to a local",
  "wa.intro": "Hi YES — I'm designing a day in Portugal in the Studio",
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
  "ui.back": "Back",
  "ui.sensing": "sensing",
  "ui.choose": "Choose: {label}",
  "trust.reviews": "reviews",
  "choice.idle_hint": "Tap any image to choose — or take all the time you need.",
  "preview.expand": "Open live preview of your day",
  "preview.dialog": "Your day — live preview",
  "preview.tap_to_open": "tap to open",
  "preview.tab_story": "Story",
  "preview.tab_timeline": "Timeline",
  "preview.tab_map": "Map",
  "preview.story_intro":
    "your day is forming around real stops, chosen for the rhythm you described.",
  "preview.min_drive": "min drive",
  "preview.min_stay": "min stay",
  "preview.indicative": "indicative",
  "build.region_label": "Your day · live preview",
  "reco.eyebrow": "Also fits you",
  "reco.open": "Open",
  "quality.eyebrow": "Day quality",
  "quality.aria": "Quality score for the composed day",
  "quality.summary_high": "Excellent flow and balance between stops.",
  "quality.summary_mid": "Good rhythm — one more signal lifts it further.",
  "quality.summary_low": "Early composition — keep going to refine.",
  "quality.wine": "Wine",
  "quality.coast": "Coast",
  "quality.heritage": "Heritage",
  "quality.table": "Table",
  "quality.of_five": "of 5",

  // Guests · Enhancements · Tier (Bible alignment)
  "chapter.guests": "*How many* of you are travelling?",
  "chapter.guests_placeholder": "2",
  "chapter.guests_help": "used to price your experience per person",
  "chapter.enhancements": "Add a *special* moment?",
  "hint.enh.0": "Nothing extra — keep the natural rhythm",
  "hint.enh.1": "Private lunch with a producer",
  "hint.enh.2": "Extra sunset hour",
  "chapter.tier": "Which level of *care* suits you?",
  "hint.tier.0": "Essential — private, simple",
  "hint.tier.1": "Signature — senior guide, reserved table",
  "hint.tier.2": "Bespoke — dedicated host, fully orchestrated",

  // Trust (contextual)
  "trust.midflow": "700+ five-star reviews across verified platforms · Google · Tripadvisor · Viator",
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
  // Auto-detect: only PT is offered; anything else falls back to EN.
  const nav =
    typeof navigator !== "undefined"
      ? (
          (navigator.languages && navigator.languages[0]) ||
          navigator.language ||
          "en"
        ).toLowerCase()
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
