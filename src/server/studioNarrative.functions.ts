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
      "Pine wind moves through the afternoon, unhurried.",
      "Tiled façades hold the light a little longer here.",
      "Afternoon settles over old stone like a soft breath.",
    ],
    recognition: [
      "A wooden table waits in the shade of cork oaks.",
      "Salt drying on wooden boards beside the late tide.",
      "Bread torn slowly, glasses filled without ceremony.",
      "Quiet vines, a long lunch, the day stretches further than expected.",
    ],
    emergence: [
      "Late sun on a tiled café, a glass of green wine, no hurry.",
      "Cliffs falling away, a fishing boat tracing the line of the bay.",
      "Cool stone underfoot, an open courtyard, a single lemon tree.",
      "A ferry crossing, the river wide and soft with afternoon light.",
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
      "O vento dos pinhais atravessa a tarde, sem pressa.",
      "Os azulejos ainda seguram um pouco a luz.",
      "A tarde pousa sobre a pedra como um sopro lento.",
    ],
    recognition: [
      "Uma mesa de madeira espera à sombra dos sobreiros.",
      "Sal a secar nas tábuas, junto à maré tardia.",
      "Pão partido sem pressa, copos cheios sem cerimónia.",
      "Vinhas quietas, almoço longo, o dia estica-se sozinho.",
    ],
    emergence: [
      "Sol tardio num café de azulejo, um copo de vinho verde, sem hora.",
      "Falésias a cair, um barco a desenhar a baía.",
      "Pedra fresca, pátio aberto, um único limoeiro.",
      "Uma travessia de cacilheiro, o rio largo na luz da tarde.",
    ],
    reveal: [
      "Parece o teu tipo de dia — lento, com sal, generoso.",
      "O dia está desenhado: almoços longos, ar do mar, sem pressa.",
      "Mesa tranquila, tarde longa, a costa a olhar de baixo.",
      "Um dia feito do que já amas — e um pouco de espaço para vaguear.",
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
      "Parece tu tipo de día — lento, con sal, generoso.",
      "El día está hecho: almuerzos largos, aire de mar, sin prisas.",
      "Mesa tranquila, tarde larga, la costa observando desde abajo.",
      "Un día hecho de lo que ya amas — con un poco de espacio para vagar.",
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
      "Cela ressemble à ta journée — lente, salée, généreuse.",
      "La journée est tracée : longs déjeuners, air marin, sans hâte.",
      "Table calme, après-midi long, la côte qui regarde d'en bas.",
      "Une journée faite de ce que tu aimes déjà — avec un peu d'espace pour flâner.",
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

const NARRATIVE_SYS = `You are the quiet narrative voice of a luxury Portuguese travel atelier.

Write ONE sentence, 8–18 words. It MUST contain at least one tangible sensory anchor: object, texture, architecture, weather, human gesture, food, sound, light, material, or movement. The reader must be able to *see* the scene.

NEVER name real places, hotels, restaurants, roads, partners, or villages. Speak in feeling and texture, not geography.

Reference tone: Cereal Magazine, Aman Journals, Kinfolk travel essays. Editorial, restrained, confident, never theatrical.

Forbidden vocabulary (immediate rejection): "hidden gem", "off the beaten path", "luxury", "unforgettable", "journey of a lifetime", "whispers of", "soul of", "magical", "breathtaking", "stunning", "amazing", any superlative, any mystical or fantasy phrasing, any exclamation mark.

If a previous fragment is provided, continue the same emotional thread without repeating its imagery.

If a traveller name is provided AND the stage is "reveal", you MAY use the name once, softly. Otherwise never use the name.

Return ONLY the sentence — no quotes, no prefix, no label.`;

const PROPOSAL_SYS = `You compose the editorial identity of a curated Portuguese day-journey.

Return TWO lines exactly, separated by a single newline:
  Line 1 — title: 2 to 5 words. Editorial, plausible, restrained. Like a magazine feature headline. Examples of the right shape (do not reuse): "Between Salt and Vines", "The Atlantic Table", "A Slow Tide".
  Line 2 — subtitle: 8 to 14 words. One sentence. Includes at least one sensory anchor (texture, weather, food, gesture, material, light, sound).

If a traveller name is provided you MAY use it ONCE in the subtitle, softly, never in the title.

NEVER name real places, hotels, restaurants, roads, partners, villages.
Forbidden vocabulary: "hidden gem", "luxury", "unforgettable", "journey of a lifetime", "whispers of", "soul of", "magical", "breathtaking", "stunning", any superlative, any mystical phrasing, any exclamation mark.
Reference tone: Cereal Magazine, Aman Journals, Kinfolk.

Return ONLY the two lines — no quotes, no labels, no prefixes.`;

function localeName(loc: Locale): string {
  return { en: "English", pt: "European Portuguese", es: "Spanish (Spain)", fr: "French (France)" }[loc];
}

function buildUserPrompt(data: z.infer<typeof inputSchema>): string {
  const parts: string[] = [];
  parts.push(`Language: ${localeName(data.locale)}`);
  parts.push(`Stage: ${data.narrativeStage}`);
  parts.push(`Confidence: ${data.confidence.toFixed(2)}`);
  parts.push(`Accepted stops so far: ${data.acceptedCount}`);
  if (data.mood) parts.push(`Mood: ${data.mood}`);
  if (data.who) parts.push(`Travelling: ${data.who}`);
  if (data.intention) parts.push(`Pull: ${data.intention}`);
  if (data.journeyType) parts.push(`Journey: ${data.journeyType === "multi" ? "multi-day (intimate, editorial)" : "single day"}`);
  if (data.travellerName) parts.push(`Traveller name: ${data.travellerName}`);
  if (data.lastAcceptedTag) parts.push(`Last accepted theme: ${data.lastAcceptedTag} — do not repeat this theme`);
  if (data.lastFragment) parts.push(`Previous fragment (continue this emotional thread without repeating imagery): "${data.lastFragment}"`);
  parts.push(`Stage voice:`);
  if (data.narrativeStage === "invitation") parts.push(`  → distant atmosphere, soft, open, no name`);
  else if (data.narrativeStage === "recognition") parts.push(`  → emotional resonance, warmer, no name`);
  else if (data.narrativeStage === "emergence") parts.push(`  → specific objects and textures, confident`);
  else parts.push(`  → intimate, settled, may use the name once`);
  parts.push(`World vocabulary (do NOT name places, but draw from this texture): azulejos · Atlantic cliffs · pine forests · cork oaks · salt pans · vineyard lunches · candlelit tavernas · river air · stone villages · tiled cafés · ferry crossings · late afternoon sun.`);
  return parts.join("\n");
}

/* ───────────────────────── Output sanitisation ────────────────────────────── */

const BANNED = /\b(hidden gem|off the beaten path|luxury|unforgettable|breathtaking|stunning|amazing|magical|whispers of|soul of|journey of a lifetime)\b/i;

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
  if (words.length < 5 || words.length > 26) return null;
  return firstSentence;
}

function extractAnchor(fragment: string): string | null {
  const anchors = [
    "salt","stone","wood","tile","azulejo","pine","cork","vine","wine","bread","table","light","wind","cliff","tide","ferry","lemon","sun","shade","glass","river","sea","fishing","boat","courtyard","candle","oak","oak","afternoon","morning",
  ];
  const lower = fragment.toLowerCase();
  for (const a of anchors) if (lower.includes(a)) return a;
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
          temperature: 0.8,
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
