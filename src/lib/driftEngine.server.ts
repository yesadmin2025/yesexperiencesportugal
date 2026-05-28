import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  composeDay,
  pickRegion,
  type ComposedDay,
  type ComposerProfile,
  type ConfidenceMap,
} from "@/lib/drift/composer";
import { signatureTours } from "@/data/signatureTours";

/**
 * Drift engine — Phase 1 server helpers.
 *
 * Pure logic + Supabase reads. No streaming, no bandit, no learning yet.
 * Owns:
 *   1. voice loading (editable copy from drift_voice)
 *   2. DNA activation (drift_dna_tokens by simple confidence threshold)
 *   3. AI story generation (Lovable AI, tone-only, never invents stops)
 *   4. Reveal payload assembly
 */

// ─── Voice ────────────────────────────────────────────────────────────────

export interface VoiceLine {
  slot: string;
  text: string;
  slots: string[];
}

export async function loadVoice(): Promise<Record<string, VoiceLine>> {
  const { data, error } = await supabaseAdmin
    .from("drift_voice")
    .select("slot, text, slots")
    .eq("is_active", true)
    .eq("locale", "pt");
  if (error || !data) return {};
  const out: Record<string, VoiceLine> = {};
  for (const row of data) {
    out[row.slot] = {
      slot: row.slot,
      text: row.text,
      slots: row.slots ?? [],
    };
  }
  return out;
}

export function fillSlots(line: string, values: Record<string, string | undefined>): string {
  return line.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = values[key];
    return v && v.trim().length > 0 ? v : "";
  }).replace(/\s+/g, " ").replace(/\s,/g, ",").trim();
}

// ─── DNA activation ───────────────────────────────────────────────────────

export interface DnaToken {
  key: string;
  label: string;
  dimension: string;
  value: string;
  threshold: number;
  priority: number;
}

/**
 * Given a profile (and optional confidence map), return the DNA tokens
 * that activate. Phase 1: explicit profile values count as confidence 1.0.
 */
export async function activateDna(
  profile: ComposerProfile & { social?: string; companions?: string },
  confidence: Record<string, number> = {},
): Promise<DnaToken[]> {
  const { data, error } = await supabaseAdmin
    .from("drift_dna_tokens")
    .select("key, label, dimension, value, threshold, priority")
    .eq("is_active", true);
  if (error || !data) return [];

  const profileValues: Record<string, string | undefined> = {
    style: profile.style,
    energy: profile.energy,
    social: (profile as { social?: string }).social,
    companions: profile.companions,
    pickup: profile.pickup,
    radius: profile.radius,
  };

  const out: DnaToken[] = [];
  for (const row of data) {
    const pv = profileValues[row.dimension];
    if (pv === row.value) {
      // Explicit match counts as full confidence.
      out.push(row);
      continue;
    }
    const c = confidence[`${row.dimension}:${row.value}`] ?? 0;
    if (c >= Number(row.threshold)) out.push(row);
  }
  // Highest priority first, cap at 4 tokens.
  return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

// ─── AI story (tone-only, never invents stops) ────────────────────────────

export type DriftLocale = "pt" | "en" | "es" | "fr";
export type TonalRegister = "intimate" | "expansive" | "playful" | "ritual";

export interface RevealStory {
  hero: string;
  microStory: string;
  /** 3–4 chained editorial lines (morning · midday · evening · pull). */
  arc: string[];
  completion: string;
  source: "ai" | "fallback";
}

export interface StoryHints {
  locale?: DriftLocale;
  tonalRegister?: TonalRegister;
  intensityPreference?: number;
}

interface StoryInput {
  profile: ComposerProfile & { name?: string };
  day: ComposedDay;
  voice: Record<string, VoiceLine>;
  regionLabel: string;
  hints: StoryHints;
}

const REGION_LABEL: Record<string, string> = {
  arrabida: "Arrábida",
  "lisbon-coast": "Lisboa e arredores",
  alentejo: "Alentejo",
  centro: "Centro",
};

function fallbackStory(input: StoryInput): RevealStory {
  const { voice, profile, regionLabel, hints } = input;
  const locale = hints.locale ?? "pt";
  const stops = input.day.stops.map((s) => s.stop.name);
  const opener = profile.name ? `${profile.name}, ` : "";

  if (locale !== "pt") {
    const hero = `your day in ${regionLabel} is ready.`;
    const microStory =
      stops.length === 0
        ? `${opener}a day is being drawn in ${regionLabel}, to your measure.`
        : `${opener}we begin close, pause at ${stops.slice(0, 2).join(" and ")}, and leave the afternoon open.`;
    const arc =
      stops.length === 0
        ? [microStory]
        : [
            `${opener}morning opens at ${stops[0]}.`,
            stops[1] ? `midday slows at ${stops[1]}.` : "midday slows, unhurried.",
            stops[stops.length - 1] && stops.length > 2
              ? `evening lands at ${stops[stops.length - 1]}.`
              : "evening lands, softer than expected.",
            "do you want to live this day?",
          ];
    return { hero, microStory, arc, completion: "book this day", source: "fallback" };
  }

  const hero = fillSlots(
    "o seu dia em {region} está pronto.",
    { region: regionLabel, name: profile.name },
  );
  const completion = voice["completion.book"]?.text ?? "reservar este dia";
  const microStory =
    stops.length === 0
      ? `${opener}há um dia desenhado em ${regionLabel}, à sua medida.`
      : `${opener}começamos perto, paramos em ${stops.slice(0, 2).join(" e ")}, e deixamos a tarde em aberto.`;
  const arc =
    stops.length === 0
      ? [microStory]
      : [
          `${opener}a manhã abre em ${stops[0]}.`,
          stops[1] ? `o meio-dia abranda em ${stops[1]}.` : "o meio-dia abranda, sem pressa.",
          stops[stops.length - 1] && stops.length > 2
            ? `a noite pousa em ${stops[stops.length - 1]}.`
            : "a noite pousa, mais devagar do que esperado.",
          "gostaria de viver este dia?",
        ];
  return { hero, microStory, arc, completion, source: "fallback" };
}

function toneClause(hints: StoryHints): string {
  const t = hints.tonalRegister ?? "expansive";
  const i = hints.intensityPreference ?? 3;
  const toneMap: Record<TonalRegister, string> = {
    intimate: "Tone: hushed, close-up, candlelit. Prefer single-clause lines.",
    expansive: "Tone: wide horizon, slow gaze, weather-aware.",
    playful: "Tone: light-footed, warm, a hint of laughter — never frivolous.",
    ritual: "Tone: ceremonial, attentive to gesture, almost liturgical restraint.",
  };
  const intensityClause =
    i >= 4
      ? "Pacing: slightly charged, but never loud."
      : i <= 2
        ? "Pacing: very calm, long breaths between images."
        : "Pacing: balanced, unhurried.";
  return `${toneMap[t]} ${intensityClause}`;
}

export async function generateRevealStory(input: StoryInput): Promise<RevealStory> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) return fallbackStory(input);

  const realStopNames = input.day.stops.map((s) => s.stop.name);
  if (realStopNames.length === 0) return fallbackStory(input);

  const locale = input.hints.locale ?? "pt";
  const langClause =
    locale === "pt"
      ? "Write in European Portuguese (pt-PT), formal address. Lowercase, no exclamation marks, no clichés."
      : locale === "es"
        ? "Write in formal European Spanish. Lowercase, no exclamation marks, no clichés."
        : locale === "fr"
          ? "Write in formal French. Lowercase, no exclamation marks, no clichés."
          : "Write in concise American English. Lowercase, no exclamation marks, no clichés.";

  const profileSummary = [
    input.profile.name ? `name=${input.profile.name}` : null,
    input.profile.companions ? `companions=${input.profile.companions}` : null,
    input.profile.energy ? `energy=${input.profile.energy}` : null,
    input.profile.style ? `style=${input.profile.style}` : null,
    input.profile.radius ? `radius=${input.profile.radius}` : null,
    `region=${input.regionLabel}`,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write tone-only lines for a luxury Portugal travel studio. " +
              "STRICT RULES: never invent stops, prices, partners, hours. Only reference the REAL stop names provided. " +
              "Georgia-italic register, intimate, restrained. " +
              `${langClause} ${toneClause(input.hints)} ` +
              "Each line under 18 words.",
          },
          {
            role: "user",
            content:
              `Profile: ${profileSummary}\n` +
              `Real stops in the composed day (ordered): ${realStopNames.join(" | ")}\n\n` +
              `Write: a hero line; a single micro-story sentence; an "arc" of EXACTLY 4 chained lines ` +
              `(morning · midday · evening · a final pull-line that opens longing without being a CTA, ` +
              `using ONLY the real stops above); and a short completion CTA in lowercase.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "compose_reveal",
              description:
                "Return tone-only copy referencing only the real stops provided. arc has exactly 4 strings.",
              parameters: {
                type: "object",
                properties: {
                  hero: { type: "string", description: "Single editorial line, ≤14 words." },
                  microStory: { type: "string", description: "1 sentence using ONLY real stop names." },
                  arc: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 4,
                    maxItems: 4,
                    description: "Four chained lines: morning, midday, evening, longing-pull.",
                  },
                  completion: { type: "string", description: "Short CTA, ≤6 words, lowercase." },
                },
                required: ["hero", "microStory", "arc", "completion"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "compose_reveal" } },
      }),
    });

    if (!res.ok) return fallbackStory(input);
    const json = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return fallbackStory(input);
    const parsed = JSON.parse(argsStr) as {
      hero?: string;
      microStory?: string;
      arc?: string[];
      completion?: string;
    };

    // Guardrail: if the micro-story or arc references a proper noun NOT in the
    // real stops list, fall back. Keeps AI honest.
    const allowedTokens = new Set(realStopNames.map((n) => n.toLowerCase()));
    const checkText = [parsed.microStory ?? "", ...(parsed.arc ?? [])].join(" ");
    const suspiciousProperNoun = /\b([A-ZÁÉÍÓÚ][a-zà-ÿ]+)\b/.exec(checkText);
    if (suspiciousProperNoun) {
      const candidate = suspiciousProperNoun[1].toLowerCase();
      const matched = [...allowedTokens].some(
        (tok) => tok.includes(candidate) || candidate.includes(tok.split(" ")[0] ?? ""),
      );
      if (!matched && candidate.length > 4) {
        return fallbackStory(input);
      }
    }

    const fb = fallbackStory(input);
    const arc =
      Array.isArray(parsed.arc) && parsed.arc.length === 4
        ? parsed.arc.map((s) => s.trim()).filter(Boolean)
        : fb.arc;

    return {
      hero: (parsed.hero ?? "").trim() || fb.hero,
      microStory: (parsed.microStory ?? "").trim() || fb.microStory,
      arc: arc.length === 4 ? arc : fb.arc,
      completion: (parsed.completion ?? "").trim() || fb.completion,
      source: "ai",
    };
  } catch {
    return fallbackStory(input);
  }
}

// ─── Reveal assembly ──────────────────────────────────────────────────────

export interface RevealPayload {
  region: string;
  regionLabel: string;
  day: ComposedDay;
  story: RevealStory;
  dna: DnaToken[];
  cta: { book: string; save: string; refine: string };
  anchorTourId?: string;
  anchorTourTitle?: string;
}

export async function assembleReveal(
  rawProfile: ComposerProfile & { name?: string; social?: string },
  confidence: ConfidenceMap = {},
  hints: StoryHints = {},
): Promise<RevealPayload> {
  const region = pickRegion(rawProfile);
  const day = composeDay(rawProfile, region, {
    confidence,
    tonalRegister: hints.tonalRegister,
    intensityPreference: hints.intensityPreference,
  });
  const voice = await loadVoice();
  const dna = await activateDna(rawProfile, confidence);
  const regionLabel = REGION_LABEL[region] ?? region;
  const story = await generateRevealStory({ profile: rawProfile, day, voice, regionLabel, hints });
  const ctaFallback = {
    en: { book: "book this day", save: "save for later", refine: "refine with a local" },
    pt: { book: "reservar este dia", save: "guardar para depois", refine: "afinar com um local" },
    es: { book: "reservar este día", save: "guardar para después", refine: "afinar con un local" },
    fr: { book: "réserver cette journée", save: "garder pour plus tard", refine: "affiner avec un local" },
  }[hints.locale ?? "en"];
  const cta = {
    book: hints.locale === "pt" ? voice["completion.book"]?.text ?? ctaFallback.book : ctaFallback.book,
    save: hints.locale === "pt" ? voice["completion.save"]?.text ?? ctaFallback.save : ctaFallback.save,
    refine: hints.locale === "pt" ? voice["completion.refine"]?.text ?? ctaFallback.refine : ctaFallback.refine,
  };
  const anchor = day.anchorTourId
    ? signatureTours.find((t) => t.id === day.anchorTourId)
    : undefined;
  return {
    region,
    regionLabel,
    day,
    story,
    dna,
    cta,
    anchorTourId: anchor?.id,
    anchorTourTitle: anchor?.title,
  };
}

