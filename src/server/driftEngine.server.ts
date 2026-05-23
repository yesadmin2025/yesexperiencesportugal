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

export interface RevealStory {
  hero: string;
  microStory: string;
  completion: string;
  source: "ai" | "fallback";
}

interface StoryInput {
  profile: ComposerProfile & { name?: string };
  day: ComposedDay;
  voice: Record<string, VoiceLine>;
  regionLabel: string;
}

const REGION_LABEL: Record<string, string> = {
  arrabida: "Arrábida",
  "lisbon-coast": "Lisboa e arredores",
  alentejo: "Alentejo",
  centro: "Centro",
};

function fallbackStory(input: StoryInput): RevealStory {
  const { voice, profile, regionLabel } = input;
  const hero = fillSlots(
    voice["reveal.hero"]?.text ?? "o teu dia em {region} está pronto.",
    { region: regionLabel, name: profile.name },
  );
  const completion = voice["completion.book"]?.text ?? "reservar este dia";
  const stops = input.day.stops.map((s) => s.stop.name);
  const opener = profile.name ? `${profile.name}, ` : "";
  const microStory =
    stops.length === 0
      ? `${opener}há um dia desenhado em ${regionLabel}, à tua medida.`
      : `${opener}começamos perto, paramos em ${stops.slice(0, 2).join(" e ")}, e deixamos a tarde respirar.`;
  return { hero, microStory, completion, source: "fallback" };
}

export async function generateRevealStory(input: StoryInput): Promise<RevealStory> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) return fallbackStory(input);

  const realStopNames = input.day.stops.map((s) => s.stop.name);
  if (realStopNames.length === 0) return fallbackStory(input);

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
              "You write tone-only Portuguese lines for a luxury Portugal travel studio. " +
              "STRICT RULES: never invent stops, prices, partners, hours. Only reference the REAL stop names provided. " +
              "Lowercase, Georgia-italic register, intimate, restrained, no exclamation marks, no clichés. " +
              "European Portuguese (pt-PT), under 22 words per line.",
          },
          {
            role: "user",
            content: `Profile: ${profileSummary}\nReal stops in the composed day (ordered): ${realStopNames.join(" | ")}\n\nWrite a hero line, a micro-story (1-2 sentences using ONLY the real stops above), and a single completion CTA in lowercase.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "compose_reveal",
              description: "Return tone-only Portuguese copy referencing only the real stops provided.",
              parameters: {
                type: "object",
                properties: {
                  hero: { type: "string", description: "Single editorial line, ≤14 words." },
                  microStory: { type: "string", description: "1–2 sentences using ONLY real stop names." },
                  completion: { type: "string", description: "Short CTA, ≤6 words, lowercase." },
                },
                required: ["hero", "microStory", "completion"],
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
      completion?: string;
    };

    // Guardrail: if the micro-story references a name not in real stops AND not a
    // common Portuguese word, fall back. Simple heuristic — keeps AI honest.
    const story = (parsed.microStory ?? "").toLowerCase();
    const allowedTokens = new Set(realStopNames.map((n) => n.toLowerCase()));
    const suspiciousProperNoun = /\b([A-ZÁÉÍÓÚ][a-zà-ÿ]+)\b/.exec(parsed.microStory ?? "");
    if (suspiciousProperNoun) {
      const candidate = suspiciousProperNoun[1].toLowerCase();
      const matched = [...allowedTokens].some((t) => t.includes(candidate) || candidate.includes(t.split(" ")[0] ?? ""));
      if (!matched && candidate.length > 4) {
        return fallbackStory(input);
      }
    }

    return {
      hero: (parsed.hero ?? "").trim() || fallbackStory(input).hero,
      microStory: (parsed.microStory ?? "").trim() || fallbackStory(input).microStory,
      completion: (parsed.completion ?? "").trim() || fallbackStory(input).completion,
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
): Promise<RevealPayload> {
  const region = pickRegion(rawProfile);
  const day = composeDay(rawProfile, region, { confidence });
  const voice = await loadVoice();
  const dna = await activateDna(rawProfile, confidence);
  const regionLabel = REGION_LABEL[region] ?? region;
  const story = await generateRevealStory({ profile: rawProfile, day, voice, regionLabel });
  const cta = {
    book: voice["completion.book"]?.text ?? "reservar este dia",
    save: voice["completion.save"]?.text ?? "guardar para depois",
    refine: voice["completion.refine"]?.text ?? "refinar com um local",
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
