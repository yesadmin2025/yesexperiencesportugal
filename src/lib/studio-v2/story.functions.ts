/**
 * Studio v2 — Story opener server function.
 *
 * Generates a 3-sentence personal story based on captured signals + the
 * traveller's name. Lovable AI = tone only, NEVER invents stops, partners
 * or prices. The story references signals (atmosphere lean, intimacy,
 * intensity) and the chosen region in editorial Portugal voice.
 *
 * Falls back to a deterministic template on any error (402 credits, 429 rate
 * limit, network) so the reveal never breaks.
 */

import { createServerFn } from "@tanstack/react-start";

interface StoryInput {
  name?: string;            // optional, may be ""
  intent: string;           // IntentAtmosphere
  pace: string;             // PaceV2
  region: string;           // RegionKey
  pax: number;
  signals: Array<{ sceneId: string; tappedFragmentId: string; lingerMs: number }>;
}

const FALLBACK_INTENT_LINE: Record<string, string> = {
  relaxed_scenic:     "you leaned toward open roads and slow afternoon light",
  elegant_cultural:   "you leaned toward stone, shadow and quiet rooms",
  food_local:         "you leaned toward long tables and unhurried tasting",
  social_celebratory: "you leaned toward a day that lifts the room",
  romantic_intimate:  "you leaned toward the coast at dusk, just the two of you",
  coastal_cinematic:  "you leaned toward Atlantic light and the hour the air turns gold",
};

const REGION_PORTRAIT: Record<string, string> = {
  arrabida:       "the Arrábida — vineyards, cliffs, an Atlantic close enough to taste",
  "lisbon-coast": "Sintra and the Atlantic edge — granite, mist, ocean shoulder",
  alentejo:       "the Alentejo — long horizons, slow tables, stone villages",
  centro:         "central Portugal — old roads, quiet stone, late light",
};

function fallback(input: StoryInput): { story: string } {
  const who = input.name ? `${input.name},` : "Quietly,";
  const lean = FALLBACK_INTENT_LINE[input.intent] ?? "you leaned toward something quieter and unhurried";
  const region = REGION_PORTRAIT[input.region] ?? "a corner of Portugal that fits your rhythm";
  const closing =
    input.pace === "light"
      ? "So we composed a day with room to breathe."
      : input.pace === "rich"
      ? "So we composed a day with more in its hands."
      : "So we composed a day with the right weight.";
  return { story: `${who} ${lean}. We're shaping ${region}. ${closing}` };
}

export const generateStoryOpener = createServerFn({ method: "POST" })
  .inputValidator((data: StoryInput) => {
    if (!data || typeof data !== "object") throw new Error("invalid input");
    return {
      name: typeof data.name === "string" ? data.name.slice(0, 40) : "",
      intent: String(data.intent ?? "relaxed_scenic"),
      pace: String(data.pace ?? "balanced"),
      region: String(data.region ?? "arrabida"),
      pax: Math.max(1, Math.min(12, Number(data.pax) || 2)),
      signals: Array.isArray(data.signals) ? data.signals.slice(0, 8) : [],
    } satisfies StoryInput;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fallback(data);

    const signalSummary = data.signals
      .map((s, i) => `Beat ${i + 1}: chose "${s.tappedFragmentId}" after ${Math.round(s.lingerMs / 100) / 10}s`)
      .join("; ");

    const system = [
      "You are the editorial voice of YES Experiences Portugal — a premium, restrained Portugal travel atelier.",
      "Write a 3-sentence personal story about the traveller, in second person, English.",
      "Tone: cinematic, sensory, quiet, slightly literary. No exclamation marks. No marketing words.",
      "STRICT RULES — never break:",
      "- Never invent tour names, stop names, partners, restaurants, hotels, prices, or itinerary steps.",
      "- Reference Portugal only through atmosphere (light, salt, stone, linen, cliff, vineyard, table, road).",
      "- Do not say 'we will take you' or list activities.",
      "- 60–85 words total. Three sentences only. No headings, no quotes, no emoji.",
      "- If a name is given, use it once, naturally, in the first or second sentence.",
    ].join("\n");

    const user = [
      `Traveller name: ${data.name || "(unknown — keep neutral)"}`,
      `Atmospheric lean: ${data.intent}`,
      `Pace preference: ${data.pace}`,
      `Region the composition lives in: ${data.region}`,
      `Group size: ${data.pax}`,
      `Captured behavioural beats: ${signalSummary || "(none)"}`,
      "",
      "Write the three sentences now.",
    ].join("\n");

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        // 402 credits / 429 rate / 5xx — always fall back cleanly.
        return fallback(data);
      }

      const json = await resp.json();
      const text = json?.choices?.[0]?.message?.content?.trim();
      if (!text || text.length < 40) return fallback(data);
      // Guardrail: cap length to avoid AI runaway.
      const story = text.length > 700 ? text.slice(0, 700) : text;
      return { story };
    } catch {
      return fallback(data);
    }
  });
