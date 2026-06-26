/**
 * Studio V3 — Live story (Lovable AI).
 *
 * Generates a 2-3 sentence editorial whisper for the Living Journey Panel,
 * in the voice of a local Portuguese friend, tailored to the traveller's
 * current profile (feeling / companions / occasion / interests / rhythm /
 * pickup / destinationIntent / firstName).
 *
 * Rules (locked, enforced by system prompt + post-validation):
 *   - Tone & storytelling only. NEVER invents stops, partners, prices, days.
 *   - Never mentions a specific winery, restaurant, hotel, brand, or fact.
 *   - Stays under 280 chars. Uses the firstName at most once, only if given.
 *   - English, sentence case, no exclamation marks, no emojis, no superlatives
 *     ("best", "ultimate", "amazing"…), no competitor mentions.
 *   - Returns deterministic fallback on any model/quota/network error so the
 *     UI never breaks the cinematic feeling.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit.server";

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

const SYSTEM_PROMPT = `You are a local Portuguese friend writing a one-paragraph editorial whisper for a luxury private day in Portugal.

Voice: warm, premium, restrained. Like a calm local who knows the country deeply. Editorial, never salesy. Sentence case only.

HARD RULES — never break:
- 2 to 3 sentences, total under 280 characters.
- Never invent specific facts: no winery names, restaurant names, hotel names, partner names, prices, durations, or "X-hour days".
- Never use superlatives like "best", "ultimate", "world-class", "amazing", "perfect", "incredible", "stunning".
- Never use exclamation marks, emojis, or em-dashes used as breaks (use commas or full stops).
- Never compare to other tours or operators.
- Never reference "we" as a company. Speak as a friend describing how the day feels.
- If a first name is provided, address the traveller by name at most once and only naturally at the start.
- Output plain text only, no quotes, no markdown, no labels.

What you ARE doing: describing the *feeling and atmosphere* this exact profile points to — the light, the pace, the company, the part of Portugal that begins to emerge. Suggest, never declare.`;

function deterministicFallback(input: Input): string {
  const name = (input.firstName ?? "").trim();
  const open = name ? `${name}, the day takes shape gently.` : "The day takes shape gently.";
  const tail =
    input.feeling === "wine-food"
      ? " A slower table, an unhurried afternoon, Portugal felt without rush."
      : input.feeling === "coastal" || input.feeling === "adventure"
        ? " Atlantic light leads the route, with room for the road to breathe."
        : input.feeling === "romance" || input.companions === "couple"
          ? " Soft pacing, space for two, the country meeting you quietly."
          : input.feeling === "hidden"
            ? " Quiet roads, small doors, places that do not perform."
            : input.feeling === "slow-luxury"
              ? " Fewer stops, deeper moments, nothing asked of you."
              : " A few quiet decisions, and a private Portugal begins to settle.";
  return (open + tail).slice(0, 280);
}

function profileLines(input: Input): string {
  const lines: string[] = [];
  if (input.firstName) lines.push(`First name: ${input.firstName}`);
  if (input.feeling) lines.push(`Feeling: ${input.feeling}`);
  if (input.companions) lines.push(`Company: ${input.companions}`);
  if (input.occasion && input.occasion !== "none") lines.push(`Occasion: ${input.occasion}`);
  if (input.destinationIntent && input.destinationIntent !== "no-preference")
    lines.push(`Region intent: ${input.destinationIntent}`);
  if (input.pickup) lines.push(`Starts from: ${input.pickup}`);
  if (input.interests && input.interests.length > 0)
    lines.push(`Interests: ${input.interests.join(", ")}`);
  if (input.rhythm) lines.push(`Rhythm: ${input.rhythm}`);
  if (input.investment) lines.push(`Investment tone: ${input.investment}`);
  return lines.join("\n");
}

/** Post-validation — strips forbidden tokens, hard-clips to 280 chars. */
function sanitize(text: string): string {
  let t = text.trim();
  // strip wrapping quotes the model sometimes adds
  t = t.replace(/^["“'']+|["”'']+$/g, "").trim();
  // collapse whitespace
  t = t.replace(/\s+/g, " ");
  // kill emojis / non-printables (rough heuristic)
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
  // remove exclamation marks
  t = t.replace(/!/g, ".");
  // forbid hard superlatives
  t = t.replace(/\b(best|ultimate|world-class|amazing|perfect|incredible|stunning)\b/gi, "quiet");
  // hard char cap
  if (t.length > 280) t = t.slice(0, 277).replace(/\s+\S*$/, "") + "…";
  return t;
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
      return { text: deterministicFallback(data), source: "fallback" as const };
    }
    const key = process.env.LOVABLE_API_KEY;
    // No key → graceful fallback, never throw to client.
    if (!key) {
      return { text: deterministicFallback(data), source: "fallback" as const };
    }

    const userPrompt = `Traveller profile so far:\n${profileLines(data)}\n\nWrite the whisper now.`;

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
          temperature: 0.85,
          max_tokens: 180,
        }),
      });

      if (!res.ok) {
        // 429/402 are surfaced as fallback (UI never breaks).
        return { text: deterministicFallback(data), source: "fallback" as const };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content?.toString() ?? "";
      const text = sanitize(raw);
      if (!text || text.length < 20) {
        return { text: deterministicFallback(data), source: "fallback" as const };
      }
      return { text, source: "ai" as const };
    } catch {
      return { text: deterministicFallback(data), source: "fallback" as const };
    }
  });
