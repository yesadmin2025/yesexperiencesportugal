import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashConfig, logAiUsage } from "./aiAuditLog.server";
import { rateLimit } from "./rateLimit.server";

/**
 * Studio v5 — AI as Cinematic Orchestrator.
 *
 * Single endpoint, two modes:
 *  - "narrative": ONE short sensory fragment (8–18 words) used during
 *    stage transitions / chip eyebrows / reveal line.
 *  - "proposal": composed { title, subtitle } generated ONCE near the
 *    reveal stage, then cached client-side. Title 2–5 words editorial;
 *    subtitle 8–14 words, may use traveller name once.
 *
 * Hard rules baked into the system prompt:
 *  - 1 sentence only. MUST include at least one tangible sensory anchor
 *    (object · texture · architecture · weather · gesture · food · sound).
 *  - NEVER name real places, partners, hotels, restaurants, roads.
 *  - Banned vocabulary: "hidden gem", "luxury", "unforgettable", "soul of",
 *    "whispers of", any superlative or mystical phrasing.
 *  - Reference tone: Cereal Magazine · Aman Journals · Kinfolk.
 *
 * Returns { fragment, sensoryAnchor } for narrative, or
 * { title, subtitle } for proposal. On any failure / rate limit, returns
 * a static editorial fallback. Caller never sees an error.
 */

type Locale = "pt" | "en" | "es" | "fr";
type Mode = "narrative" | "proposal";
type Stage = "invitation" | "recognition" | "emergence" | "reveal";

const inputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  mode: z.enum(["narrative", "proposal"]),
  locale: z.enum(["pt", "en", "es", "fr"]).default("en"),
  mood: z.string().max(40).nullable().optional(),
  who: z.string().max(40).nullable().optional(),
  intention: z.string().max(40).nullable().optional(),
  journeyType: z.enum(["day", "multi"]).nullable().optional(),
  travellerName: z.string().min(1).max(40).nullable().optional(),
  narrativeStage: z.enum(["invitation", "recognition", "emergence", "reveal"]).default("recognition"),
  confidence: z.number().min(0).max(1).default(0.4),
  acceptedCount: z.number().int().min(0).max(20).default(0),
  lastFragment: z.string().max(220).nullable().optional(),
  lastAcceptedTag: z.string().max(40).nullable().optional(),
});

export type StudioNarrativeResult =
  | { mode: "narrative"; fragment: string; sensoryAnchor: string | null; source: "ai" | "fallback" | "rate_limited" }
  | { mode: "proposal"; title: string; subtitle: string; source: "ai" | "fallback" | "rate_limited" };

/* ───────────────── Fallback editorial pools (Portugal-anchored) ───────────── */

const NARRATIVE_FALLBACKS: Record<Locale, Record<Stage, string[]>> = {
  en: {
    invitation: [
      "The coast keeps its mornings slow, salt drying on stone.",
      "Pine wind moves through the afternoon, unhurried over slate roofs.",
      "Tiled façades hold the light a little longer here.",
      "Atlantic mist lifts off the quay, the day still folded in.",
      "Whitewashed walls catch the first sun, no one in any hurry.",
    ],
    recognition: [
      "A wooden table waits in the shade of cork oaks.",
      "Salt drying on wooden boards beside the late tide.",
      "Bread torn slowly, an enamel cup, the courtyard still cool.",
      "Quiet vines, a long lunch, the day stretches further than expected.",
      "A doorway open to a tiled hallway, coffee on the stove.",
    ],
    emergence: [
      "Late sun on a tiled café, a glass of green wine, no hurry.",
      "Cliffs falling away, a fishing boat tracing the line of the bay.",
      "Cool stone underfoot, an open courtyard, a single lemon tree.",
      "A ferry crossing, the river wide and soft with afternoon light.",
      "Charcoal smoke and sardines on oil-stained paper, plates passed around.",
    ],
    reveal: [
      "This feels like your kind of day — slow, salt-edged, generous.",
      "The day is set: long lunches, sea air, the road in no rush.",
      "A quiet table, a longer afternoon, the coast watching from below.",
      "A day shaped around what you already love — and a little room to wander.",
    ],
  },
  pt: {
    invitation: [
      "A costa guarda as manhãs devagar, sal a secar na pedra.",
      "O vento dos pinhais atravessa a tarde sobre telhas de ardósia, sem pressa.",
      "Os azulejos ainda seguram um pouco a luz.",
      "A neblina sobe do cais, o dia ainda dobrado em silêncio.",
      "Paredes caiadas apanham o primeiro sol, ninguém com pressa.",
    ],
    recognition: [
      "Uma mesa de madeira espera à sombra dos sobreiros.",
      "Sal a secar nas tábuas, junto à maré tardia.",
      "Pão partido sem pressa, uma chávena de esmalte, o pátio ainda fresco.",
      "Vinhas quietas, almoço longo, o dia estica-se sozinho.",
      "Uma porta aberta para um corredor de azulejo, café no fogão.",
    ],
    emergence: [
      "Sol tardio num café de azulejo, um copo de vinho verde, sem hora.",
      "Falésias a cair, um barco a desenhar a baía.",
      "Pedra fresca, pátio aberto, um único limoeiro.",
      "Uma travessia de cacilheiro, o rio largo na luz da tarde.",
      "Sardinha na grelha sobre papel oleado, pratos a passar de mão em mão.",
    ],
    reveal: [
      "Parece o seu tipo de dia — lento, com sal, generoso.",
      "O dia está desenhado: almoços longos, ar do mar, sem pressa.",
      "Mesa tranquila, tarde longa, a costa a olhar de baixo.",
      "Um dia feito do que já aprecia — e um pouco de espaço para vaguear.",
    ],
  },
  es: {
    invitation: [
      "La costa guarda sus mañanas lentas, sal secándose en la piedra.",
      "El viento de los pinares atraviesa la tarde, sin prisa.",
      "Los azulejos sostienen la luz un poco más aquí.",
      "La tarde se posa sobre la piedra antigua como un suspiro lento.",
    ],
    recognition: [
      "Una mesa de madera espera a la sombra de los alcornoques.",
      "Sal secándose en las tablas, junto a la marea tardía.",
      "Pan partido sin prisa, copas llenas sin ceremonia.",
      "Viñas quietas, almuerzo largo, el día se estira por sí solo.",
    ],
    emergence: [
      "Sol tardío en un café de azulejos, una copa de vinho verde, sin hora.",
      "Acantilados que caen, un barco trazando la línea de la bahía.",
      "Piedra fresca, patio abierto, un único limonero.",
      "Una travesía en ferry, el río ancho bajo la luz de la tarde.",
    ],
    reveal: [
      "Parece el tipo de día adecuado — lento, con sal, generoso.",
      "El día está hecho: almuerzos largos, aire de mar, sin prisas.",
      "Mesa tranquila, tarde larga, la costa observando desde abajo.",
      "Un día hecho de lo que usted aprecia — con espacio para vagar.",
    ],
  },
  fr: {
    invitation: [
      "La côte garde ses matins lents, le sel sèche sur la pierre.",
      "Le vent des pins traverse l'après-midi, sans hâte.",
      "Les façades en azulejos retiennent la lumière un peu plus.",
      "L'après-midi se pose sur la pierre comme un souffle lent.",
    ],
    recognition: [
      "Une table en bois attend à l'ombre des chênes-lièges.",
      "Du sel séchant sur les planches, près de la marée tardive.",
      "Du pain rompu sans hâte, des verres remplis sans cérémonie.",
      "Vignes calmes, déjeuner long, la journée s'étire d'elle-même.",
    ],
    emergence: [
      "Soleil tardif sur un café aux azulejos, un verre de vinho verde, sans heure.",
      "Falaises qui tombent, un bateau dessine la baie.",
      "Pierre fraîche, cour ouverte, un seul citronnier.",
      "Une traversée en ferry, le fleuve large dans la lumière de l'après-midi.",
    ],
    reveal: [
      "Cela ressemble à la bonne journée — lente, salée, généreuse.",
      "La journée est tracée : longs déjeuners, air marin, sans hâte.",
      "Table calme, après-midi long, la côte qui regarde d'en bas.",
      "Une journée faite de ce que vous aimez déjà — avec un peu d'espace.",
    ],
  },
};

const PROPOSAL_FALLBACKS: Record<Locale, { titles: string[]; subtitleTemplates: string[] }> = {
  en: {
    titles: ["Between Salt and Vines", "The Atlantic Table", "A Slow Tide", "The Long Afternoon", "Cork, Sea, Late Light"],
    subtitleTemplates: [
      "A day shaped around slow tables, sea air, and long afternoons.",
      "Quiet vines, an open coast, and a table waiting in the shade.",
      "Late light, generous lunches, the road moving at its own pace.",
    ],
  },
  pt: {
    titles: ["Entre o Sal e as Vinhas", "A Mesa Atlântica", "Maré Lenta", "A Tarde Longa", "Cortiça, Mar, Luz Tardia"],
    subtitleTemplates: [
      "Um dia feito de mesas lentas, ar do mar e tardes que não acabam.",
      "Vinhas tranquilas, costa aberta, uma mesa à espera na sombra.",
      "Luz tardia, almoços generosos, a estrada no seu próprio passo.",
    ],
  },
  es: {
    titles: ["Entre Sal y Viñas", "La Mesa Atlántica", "Marea Lenta", "La Tarde Larga", "Corcho, Mar, Luz Tardía"],
    subtitleTemplates: [
      "Un día hecho de mesas lentas, aire de mar y tardes largas.",
      "Viñas tranquilas, costa abierta, una mesa esperando a la sombra.",
      "Luz tardía, almuerzos generosos, la carretera a su propio ritmo.",
    ],
  },
  fr: {
    titles: ["Entre Sel et Vignes", "La Table Atlantique", "Marée Lente", "L'Après-midi Long", "Liège, Mer, Lumière Tardive"],
    subtitleTemplates: [
      "Une journée faite de tables lentes, d'air marin et de longs après-midis.",
      "Vignes tranquilles, côte ouverte, une table qui attend à l'ombre.",
      "Lumière tardive, déjeuners généreux, la route à son propre rythme.",
    ],
  },
};

function pickStable<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function narrativeFallback(locale: Locale, stage: Stage, seed: string): { fragment: string; sensoryAnchor: string | null } {
  const pool = NARRATIVE_FALLBACKS[locale][stage];
  return { fragment: pickStable(pool, seed), sensoryAnchor: null };
}

function proposalFallback(locale: Locale, seed: string, travellerName?: string | null): { title: string; subtitle: string } {
  const pack = PROPOSAL_FALLBACKS[locale];
  const title = pickStable(pack.titles, seed);
  let subtitle = pickStable(pack.subtitleTemplates, seed + "_sub");
  if (travellerName) {
    if (locale === "pt") subtitle = `${travellerName}, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}`;
    else if (locale === "es") subtitle = `${travellerName}, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}`;
    else if (locale === "fr") subtitle = `${travellerName}, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}`;
    else subtitle = `${travellerName}, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}`;
  }
  return { title, subtitle };
}

/* ───────────────────────── Prompt construction ────────────────────────────── */

const NARRATIVE_SYS = `You are the silent narrative voice of a Portuguese travel atelier — closer to a cinematographer than a copywriter. Your job is atmosphere, not description.

OUTPUT FORMAT
- Exactly ONE sentence, 8 to 16 words.
- No quotes, no labels, no prefix, no emoji, no exclamation marks.

MANDATORY SENSORY ANCHOR
Every sentence MUST contain at least one tangible, physical anchor the reader can SEE, TOUCH, HEAR, SMELL or TASTE. Draw from: linen · salt air · tiled walls · ferry wind · candlelight · market noise · stone texture · vineyard shade · ceramic cups · sea reflections · pine shadows · wooden boards · cork dust · azulejo · wet quay · sun on plaster · oil-stained paper · charcoal smoke · bread crust · enamel cups · stovetop coffee · slate roof · whitewashed wall · clay tile · sardine smoke.
Pure emotional abstraction is REJECTED.
Bad: "the Atlantic slows around you."
Good: "salt drying beside wooden tables under late afternoon wind."

STAGE VOICE — match strictly to the stage provided. Stage voice is non-negotiable.
- invitation : distant, atmospheric, OPEN. Weather · light · texture · architecture only. NO second-person pronoun (no "you", "your", "te", "teu", "tu", "ti", "tua", "vous", "ton", "ta", "tes"). NO human gesture. NO name. The frame is a wide shot with nobody in it yet. Example shape: "the coast keeps its mornings slow, salt drying on stone."
- recognition: warmer, grounded. One small physical object enters (a table · a doorway · a cup · a chair). Still NO second-person pronoun, NO name. Example shape: "a wooden table waits in the shade of cork oaks."
- emergence  : tactile, sensory, inevitable. A specific gesture · ritual · material · food appears. Confidence rises, abstraction falls. Second person allowed but rare. NO name. Example shape: "salt drying beside wooden tables while a ferry crosses the river."
- reveal     : intimate, settled, quietly emotional. Second person allowed. May use the traveller name ONCE — never in the first three words, never followed by an exclamation. Example shape: "this day already feels like it belongs to you."

PORTUGAL TEXTURE — every sentence must feel unmistakably Portuguese
azulejos · Atlantic light · pine wind · cork oaks · vineyard shade · ferry crossings · whitewashed walls · slate roofs · tiled cafés · river quays · stovetop coffee · bread torn slowly · enamel cups · cobble streets · sardine smoke · candlelit tavernas · stone villages · late afternoon sun.
NEVER name real places, hotels, restaurants, roads, partners, villages, regions.

CONTINUITY
If a previous fragment is provided, continue the SAME emotional thread and SAME hour of day, but reuse NONE of its nouns or imagery.

FORBIDDEN VOCABULARY (immediate rejection — bare words too, not only phrases)
hidden · gem · off the beaten path · luxury · unforgettable · journey of a lifetime · whispers · whisper · soul · magic · magical · breathtaking · stunning · amazing · enchanting · captivating · timeless · authentic · vibrant · idyllic · pristine · paradise · escape · adventure · discover · discovers · discovering · immersive · immerse · dream · dreams · dreamlike · once-in-a-lifetime — any superlative, any mystical phrasing, any travel-brochure cliché.

NAME RESTRAINT
Do NOT use the traveller's name unless the stage is "reveal". Even then, use it at most ONCE, never in the first three words, never followed by an exclamation.

Register: Cereal Magazine · Aman Journals · Kinfolk travel essays. Editorial restraint over poetic excess. Observational, not performative. The reader should be able to SEE the frame.

Return ONLY the sentence.`;

const PROPOSAL_SYS = `You compose the editorial identity of a curated Portuguese day-journey.

Return TWO lines exactly, separated by a single newline:
  Line 1 — title: 2 to 5 words. Editorial, plausible, restrained. Like a magazine feature headline. Examples of the right shape (do not reuse): "Between Salt and Vines", "The Atlantic Table", "A Slow Tide".
  Line 2 — subtitle: 8 to 14 words. One sentence. MUST contain at least one tangible sensory anchor (texture · weather · food · gesture · material · light · sound).

If a traveller name is provided you MAY use it ONCE in the subtitle, softly, never in the title.

NEVER name real places, hotels, restaurants, roads, partners, villages.
Forbidden vocabulary: hidden · gem · luxury · unforgettable · journey of a lifetime · whispers · soul · magic · magical · breathtaking · stunning · amazing · enchanting · captivating · timeless · authentic · vibrant · idyllic · pristine · paradise · escape · adventure · discover · immersive · dream — any superlative, any mystical phrasing, any exclamation mark.
Register: Cereal Magazine · Aman Journals · Kinfolk.

Return ONLY the two lines — no quotes, no labels, no prefixes.`;

function localeName(loc: Locale): string {
  return { en: "English", pt: "European Portuguese", es: "Spanish (Spain)", fr: "French (France)" }[loc];
}

function buildUserPrompt(data: z.infer<typeof inputSchema>): string {
  const parts: string[] = [];
  parts.push(`Language: ${localeName(data.locale)}.`);
  parts.push(`Stage: ${data.narrativeStage}.`);
  parts.push(`Confidence: ${data.confidence.toFixed(2)} (0 = exploration, 1 = certainty).`);
  parts.push(`Accepted moments so far: ${data.acceptedCount}.`);

  const fingerprint: string[] = [];
  if (data.mood) fingerprint.push(`mood:${data.mood}`);
  if (data.who) fingerprint.push(`with:${data.who}`);
  if (data.intention) fingerprint.push(`pull:${data.intention}`);
  if (data.journeyType) fingerprint.push(`shape:${data.journeyType === "multi" ? "multi-day" : "single-day"}`);
  if (fingerprint.length) parts.push(`Emotional fingerprint: ${fingerprint.join(" · ")}.`);

  if (data.travellerName && data.narrativeStage === "reveal") {
    parts.push(`Traveller name (use ONCE, softly — only because stage is reveal): ${data.travellerName}.`);
  }

  if (data.lastFragment) {
    parts.push(
      `Previous fragment — continue the SAME emotional thread and SAME hour of day, but reuse NONE of its nouns or imagery:\n  "${data.lastFragment}"`,
    );
  }
  if (data.lastAcceptedTag) {
    parts.push(`Last accepted theme: ${data.lastAcceptedTag} — do not echo this theme in the imagery.`);
  }

  const stageCue =
    data.narrativeStage === "invitation"
      ? "Atmosphere only — weather, light, distance, texture. NO second-person pronoun, NO human gesture, NO name. The frame is a wide shot with nobody in it yet."
      : data.narrativeStage === "recognition"
        ? "Warmer. One small grounded object enters the frame — a table, a doorway, a cup, a chair in shade. Still NO second-person pronoun, NO name. The camera moves closer; the room is empty but felt."
        : data.narrativeStage === "emergence"
          ? "More tactile. A specific gesture, ritual, food or material appears (bread torn, glass set down, ferry crossing). Confidence rises, abstraction falls. The day is beginning to feel inevitable."
          : "Intimate, settled, quietly emotional. Second person is allowed. May use the name once, softly, never in the first three words, never with an exclamation. The day has landed.";
  parts.push(`Voice for this stage: ${stageCue}`);

  return parts.join("\n");
}

/* ───────────────────────── Output sanitisation ────────────────────────────── */

const BANNED = /\b(hidden gem|hidden|gem|gems|off the beaten path|luxury|unforgettable|breathtaking|stunning|amazing|magical|magic|enchanting|captivating|timeless|authentic|vibrant|idyllic|pristine|paradise|whispers?|soul|souls|journey of a lifetime|escape|escapes|escaped|escaping|adventure|adventures|discover|discovers|discovering|discovery|immersive|immerse|dream|dreams|dreamlike|once[- ]in[- ]a[- ]lifetime)\b/i;

/** Extended sensory anchor vocabulary — used both for extraction (telemetry)
 *  and as a mandatory presence check inside sanitiseFragment. If a generated
 *  fragment contains none of these, it is rejected and the caller falls back
 *  to the static editorial pool — preventing pure-abstraction AI output. */
const ANCHOR_VOCAB = [
  "salt","stone","wood","wooden","tile","tiles","tiled","azulejo","azulejos","pine","cork","vine","vines","wine","glass","bread","bread crust","table","light","wind","breeze","cliff","cliffs","tide","ferry","lemon","sun","sunlight","shade","river","sea","ocean","atlantic","fishing","boat","courtyard","candle","candlelit","oak","afternoon","morning","evening","dusk","dawn","quay","quayside","linen","napkin","ceramic","clay","plaster","whitewashed","slate","cobble","cobbles","coffee","sardine","sardines","oil","paper","enamel","copper","brass","cup","cups","bowl","plate","door","doorway","window","shutter","shutters","balcony","tram","fado","market","crust","smoke","mist","fog","dew","limestone","marble","reed","cane","fig","orange","olive","rosemary","sandy","tilework","mosaic","sal","pedra","madeira","azulejo","pinhal","cortiça","vinha","luz","tarde","manhã","mesa","copo","janela","porta","mar","rio","ferry","cacilheiro","cais","barro","cerâmica","cal","ardósia","pão","azeite","sardinha","calçada","sombra"
];

function sanitiseFragment(raw: string): string | null {
  const cleaned = raw
    .replace(/^["'""`*\s]+|["'""`*\s]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[!]+/g, ".")
    .trim();
  if (!cleaned) return null;
  if (BANNED.test(cleaned)) return null;
  // Take first sentence.
  const firstSentence = cleaned.split(/(?<=[.?])\s+/)[0] ?? cleaned;
  const words = firstSentence.split(/\s+/);
  if (words.length < 5 || words.length > 24) return null;
  // MANDATORY sensory anchor — pure abstraction is rejected.
  if (!extractAnchor(firstSentence)) return null;
  return firstSentence;
}

function extractAnchor(fragment: string): string | null {
  const lower = fragment.toLowerCase();
  for (const a of ANCHOR_VOCAB) if (lower.includes(a)) return a;
  return null;
}

function sanitiseProposal(raw: string): { title: string; subtitle: string } | null {
  const lines = raw
    .split(/\r?\n+/)
    .map((l) => l.replace(/^["'""`*\s\-•\d.)\]]+|["'""`*\s]+$/g, "").trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const title = lines[0].replace(/[.!?]+$/g, "").trim();
  const subtitle = lines[1].replace(/[!]+/g, ".").trim();
  if (!title || !subtitle) return null;
  if (BANNED.test(title) || BANNED.test(subtitle)) return null;
  const titleWords = title.split(/\s+/);
  if (titleWords.length < 2 || titleWords.length > 6) return null;
  const subWords = subtitle.split(/\s+/);
  if (subWords.length < 6 || subWords.length > 20) return null;
  return { title, subtitle };
}

/* ───────────────────────────── Server function ────────────────────────────── */

export const composeStudioMoment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<StudioNarrativeResult> => {
    const seed = `${data.mood ?? ""}|${data.who ?? ""}|${data.intention ?? ""}|${data.acceptedCount}|${data.narrativeStage}`;

    const buildFallback = (): StudioNarrativeResult => {
      if (data.mode === "narrative") {
        const fb = narrativeFallback(data.locale, data.narrativeStage, seed);
        return { mode: "narrative", fragment: fb.fragment, sensoryAnchor: fb.sensoryAnchor, source: "fallback" };
      }
      const fb = proposalFallback(data.locale, seed, data.travellerName);
      return { mode: "proposal", title: fb.title, subtitle: fb.subtitle, source: "fallback" };
    };

    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: data.mode === "proposal" ? "studio_proposal" : "studio_narrative",
      limit: data.mode === "proposal" ? 4 : 8,
      windowSec: 300,
    });
    if (!rl.ok) return { ...buildFallback(), source: "rate_limited" } as StudioNarrativeResult;

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return buildFallback();

    const configHash = hashConfig({
      mode: data.mode,
      mood: data.mood,
      who: data.who,
      intention: data.intention,
      stage: data.narrativeStage,
      acceptedCount: data.acceptedCount,
      locale: data.locale,
      hasName: Boolean(data.travellerName),
    });
    const startedAt = Date.now();
    const model = "google/gemini-3-flash-preview";
    const feature = data.mode === "proposal" ? "studio_proposal" : "studio_narrative";

    try {
      const sys = data.mode === "proposal" ? PROPOSAL_SYS : NARRATIVE_SYS;
      const usr = buildUserPrompt(data);

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          temperature:
            data.mode === "proposal"
              ? 0.72
              : data.narrativeStage === "invitation"
                ? 0.7
                : data.narrativeStage === "recognition"
                  ? 0.78
                  : data.narrativeStage === "emergence"
                    ? 0.78
                    : 0.62,

          max_tokens: data.mode === "proposal" ? 80 : 60,
        }),
      });
      const latencyMs = Date.now() - startedAt;
      if (!res.ok) {
        await logAiUsage({
          provider: "lovable_ai",
          model,
          feature,
          status: res.status === 429 ? "rate_limited" : "failure",
          latencyMs,
          configHash,
          errorCode: String(res.status),
        });
        return buildFallback();
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return buildFallback();

      if (data.mode === "narrative") {
        const sanitised = sanitiseFragment(text);
        if (!sanitised) {
          await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "rejected" });
          return buildFallback();
        }
        // Continuity guard — same emotional thread, fresh imagery. If the
        // generated line reuses the previous fragment's primary anchor word
        // (e.g. "salt" twice in a row), fall back rather than echo.
        if (data.lastFragment) {
          const prevAnchor = extractAnchor(data.lastFragment);
          if (prevAnchor && sanitised.toLowerCase().includes(prevAnchor)) {
            await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "echo" });
            return buildFallback();
          }
        }
        // Stage-voice guard — invitation/recognition must read like a wide
        // editorial frame: no second-person pronouns. This is what keeps the
        // early stages atmospheric instead of conversational.
        if (data.narrativeStage === "invitation" || data.narrativeStage === "recognition") {
          const secondPerson = /\b(you|your|yours|yourself|te|teu|tua|teus|tuas|ti|tu|vous|votre|vos|toi|ton|ta|tes)\b/i;
          if (secondPerson.test(sanitised)) {
            await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "second_person_too_early" });
            return buildFallback();
          }
        }
        // Name restraint — name allowed ONLY at reveal stage, never in the
        // first three words. Prevents over-personalisation that erodes intimacy.
        if (data.travellerName) {
          const namePattern = new RegExp(`\\b${data.travellerName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i");
          const nameAppears = namePattern.test(sanitised);
          if (nameAppears && data.narrativeStage !== "reveal") {
            await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "name_too_early" });
            return buildFallback();
          }
          if (nameAppears && data.narrativeStage === "reveal") {
            const firstThree = sanitised.split(/\s+/).slice(0, 3).join(" ");
            if (namePattern.test(firstThree)) {
              await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "name_too_front" });
              return buildFallback();
            }
          }
        }
        await logAiUsage({ provider: "lovable_ai", model, feature, status: "success", latencyMs, configHash });
        return { mode: "narrative", fragment: sanitised, sensoryAnchor: extractAnchor(sanitised), source: "ai" };
      }


      const composed = sanitiseProposal(text);
      if (!composed) {
        await logAiUsage({ provider: "lovable_ai", model, feature, status: "failure", latencyMs, configHash, errorCode: "rejected" });
        return buildFallback();
      }
      await logAiUsage({ provider: "lovable_ai", model, feature, status: "success", latencyMs, configHash });
      return { mode: "proposal", title: composed.title, subtitle: composed.subtitle, source: "ai" };
    } catch (err) {
      await logAiUsage({
        provider: "lovable_ai",
        model,
        feature,
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return buildFallback();
    }
  });
