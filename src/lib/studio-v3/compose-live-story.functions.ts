/**
 * Studio V3 — Live story (Lovable AI).
 *
 * Generates a compact editorial whisper for the Living Journey Panel, in the
 * voice of a local Portuguese friend. This is a presentation layer only: it
 * never feeds curation, pricing, route logic, suppliers or checkout.
 *
 * Rules (locked, enforced by system prompt + post-validation):
 *   - Synthesises relationships between profile signals instead of parroting labels.
 *   - Tone & storytelling only. NEVER invents stops, partners, prices or durations.
 *   - Never mentions a specific winery, restaurant, hotel, brand, or unsupported fact.
 *   - Stays under 220 chars. Uses firstName at most once, only when natural.
 *   - English, sentence case, no exclamation marks, emojis or superlatives.
 *   - Returns a deterministic combination-aware fallback on model/quota/network error.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit.server";
import {
  containsRawStudioTaxonomy,
  deterministicLiveStoryFallback,
  sanitizeLiveStory,
} from "@/lib/studio-v3/liveStoryVoice";

const inputSchema = z.object({
  firstName: z.string().trim().max(32).nullable().optional(),
  feeling: z.string().trim().max(40).nullable().optional(),
  companions: z.string().trim().max(40).nullable().optional(),
  occasion: z.string().trim().max(40).nullable().optional(),
  pickup: z.string().trim().max(60).nullable().optional(),
  destinationIntent: z.string().trim().max(60).nullable().optional(),
  interests: z.array(z.string().trim().max(40)).max(8).optional(),
  rhythm: z.string().trim().max(40).nullable().optional(),
  investment: z.string().trim().max(40).nullable().optional(),
  sessionId: z.string().min(8).max(64),
});

type Input = z.infer<typeof inputSchema>;

const SYSTEM_PROMPT = `You are a perceptive local Portuguese friend writing a tiny editorial read for a luxury private day in Portugal.

Voice: warm, premium, restrained, specific in emotional logic. Like a calm local travel designer who understands why a combination of preferences matters. Editorial, never salesy.

HARD RULES — never break:
- Write 1 or 2 sentences, total under 220 characters.
- When at least two profile signals are supplied, connect at least two distinct signals into one coherent interpretation. Show the relationship between them instead of listing them.
- Never mirror the profile fields back as a recap and never output raw taxonomy IDs such as "wine-food", "slow-luxury", "local-life" or "no-preference".
- Translate selections into implications: pace, intimacy, breathing room, sociability, atmosphere, attention, light or depth.
- Never invent specific facts: no stop names, winery names, restaurant names, hotel names, partner names, prices, durations, inclusions, availability or promises.
- Never use superlatives such as "best", "ultimate", "world-class", "amazing", "perfect", "incredible" or "stunning".
- Never use exclamation marks, emojis or em dashes as breaks. Use commas or full stops.
- Never compare to other tours or operators.
- Never say that an AI, algorithm, system or company analysed the traveller.
- Never reference "we" as a company. Speak as a friend interpreting how the day should feel.
- If a first name is provided, use it at most once and only naturally.
- Output plain text only, no quotes, markdown, labels or headings.

Aim for a small moment of recognition: the traveller should feel that two or more of their choices have been understood together, not repeated back to them.`;

function profileLines(input: Input): string {
  const lines: string[] = [];
  if (input.firstName) lines.push(`First name: ${input.firstName}`);
  if (input.feeling) lines.push(`Feeling signal: ${input.feeling}`);
  if (input.companions) lines.push(`Company signal: ${input.companions}`);
  if (input.occasion && input.occasion !== "none") lines.push(`Occasion signal: ${input.occasion}`);
  if (input.destinationIntent && input.destinationIntent !== "no-preference")
    lines.push(`Destination intent: ${input.destinationIntent}`);
  if (input.pickup) lines.push(`Starting point signal: ${input.pickup}`);
  if (input.interests && input.interests.length > 0)
    lines.push(`Taste signals: ${input.interests.join(", ")}`);
  if (input.rhythm) lines.push(`Pace signal: ${input.rhythm}`);
  return lines.join("\n");
}

function fallback(input: Input): string {
  return deterministicLiveStoryFallback(input);
}

export const composeLiveStory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "studio_v3_live_story",
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) {
      return { text: fallback(data), source: "fallback" as const };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { text: fallback(data), source: "fallback" as const };
    }

    const userPrompt = `Traveller profile signals so far:\n${profileLines(data)}\n\nWrite the compact interpretation now. Do not list the signals; connect them.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.68,
          max_tokens: 130,
        }),
      });

      if (!res.ok) {
        return { text: fallback(data), source: "fallback" as const };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content?.toString() ?? "";
      const text = sanitizeLiveStory(raw);
      if (!text || text.length < 20 || containsRawStudioTaxonomy(text)) {
        return { text: fallback(data), source: "fallback" as const };
      }
      return { text, source: "ai" as const };
    } catch {
      return { text: fallback(data), source: "fallback" as const };
    }
  });
