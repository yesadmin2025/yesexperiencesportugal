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
import { rateLimit } from "@/lib/rateLimit.server";

interface StoryInput {
  name?: string; // optional, may be ""
  intent: string; // IntentAtmosphere
  pace: string; // PaceV2
  region: string; // RegionKey
  pax: number;
  signals: Array<{ sceneId: string; tappedFragmentId: string; lingerMs: number }>;
  sessionId: string;
}

const FALLBACK_INTENT_LINE: Record<string, string> = {
  relaxed_scenic: "a day built around open roads and slow afternoon light",
  elegant_cultural: "a day built around stone, shadow and quiet rooms",
  food_local: "a day built around long tables and unhurried tasting",
  social_celebratory: "a day built to lift the room and hold the moment",
  romantic_intimate: "a day built for two — the coast, the quiet, the dusk",
  coastal_cinematic: "a day built around Atlantic light and the hour the air turns gold",
};

const REGION_PORTRAIT: Record<string, string> = {
  arrabida: "set in the Arrábida — vineyards, cliffs, an Atlantic close enough to taste",
  "lisbon-coast": "set along Sintra and the Atlantic edge — granite, mist, ocean shoulder",
  alentejo: "set across the Alentejo — long horizons, slow tables, stone villages",
  centro: "set across central Portugal — old roads, quiet stone, late light",
};

function fallback(input: StoryInput): { story: string } {
  const who = input.name ? `${input.name},` : "For you,";
  const lean =
    FALLBACK_INTENT_LINE[input.intent] ?? "a day built around something quieter and unhurried";
  const region =
    REGION_PORTRAIT[input.region] ?? "set in the corner of Portugal that fits your rhythm";
  const closing =
    input.pace === "light"
      ? "Designed with room to breathe — nothing rushed, nothing filler."
      : input.pace === "rich"
        ? "Designed with more in its hands — full, but never hurried."
        : "Designed with the right weight — exactly what you wanted, nothing you didn't.";
  return { story: `${who} ${lean}, ${region}. ${closing}` };
}

export const generateStoryOpener = createServerFn({ method: "POST" })
  .inputValidator((data: StoryInput) => {
    if (!data || typeof data !== "object") throw new Error("invalid input");
    const sid = typeof data.sessionId === "string" ? data.sessionId.trim() : "";
    if (sid.length < 8 || sid.length > 64) throw new Error("invalid sessionId");
    return {
      name: typeof data.name === "string" ? data.name.slice(0, 40) : "",
      intent: String(data.intent ?? "relaxed_scenic"),
      pace: String(data.pace ?? "balanced"),
      region: String(data.region ?? "arrabida"),
      pax: Math.max(1, Math.min(12, Number(data.pax) || 2)),
      signals: Array.isArray(data.signals) ? data.signals.slice(0, 8) : [],
      sessionId: sid,
    } satisfies StoryInput;
  })
  .handler(async ({ data }) => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "studio_v2_story",
      limit: 5,
      windowSec: 60,
    });
    if (!rl.ok) return fallback(data);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fallback(data);

    const signalSummary = data.signals
      .map(
        (s, i) =>
          `Beat ${i + 1}: chose "${s.tappedFragmentId}" after ${Math.round(s.lingerMs / 100) / 10}s`,
      )
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
