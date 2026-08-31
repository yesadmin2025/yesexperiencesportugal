/**
 * Studio V3 — DIRECTOR VOICE (Lovable AI).
 *
 * The Director alone decides IF a question exists, WHICH question it is and
 * the EXACT ordered options. This server function only proposes WORDING for
 * that already-made decision, and the pure, fail-closed validator in
 * `questionPresentationAdapter.ts` decides whether the wording is used at all.
 *
 * Hard contract:
 *  - the model receives the question key and the ordered option keys, and MUST
 *    return exactly those keys, in exactly that order;
 *  - it may not add, drop, reorder or merge an option;
 *  - it may not mention prices, times, percentages, matches, suppliers, AI, or
 *    make a recommendation;
 *  - any error, quota, rate limit or malformed answer returns `null`, and the
 *    deterministic copy is used. The traveller never sees a delay or a break.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit.server";

const inputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  questionKey: z.string().min(3).max(80),
  /** Deterministic copy the model is rewriting, for tone anchoring. */
  baseTitle: z.string().max(120),
  baseTitleAccent: z.string().max(120),
  baseEyebrow: z.string().max(60),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        label: z.string().max(80),
        whisper: z.string().max(160),
      }),
    )
    .min(2)
    .max(6),
  /** Neutral taste signals. No PII, no free text, no prices. */
  feeling: z.string().trim().max(40).nullable().optional(),
  companions: z.string().trim().max(40).nullable().optional(),
  rhythm: z.string().trim().max(40).nullable().optional(),
  interests: z.array(z.string().trim().max(40)).max(12).optional(),
});

export type DirectorVoiceInput = z.infer<typeof inputSchema>;

const candidateSchema = z.object({
  eyebrow: z.string().trim().min(2).max(40),
  title: z.string().trim().min(4).max(90),
  titleAccent: z.string().trim().min(2).max(90),
  hint: z.string().trim().max(120).optional().default(""),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().trim().min(2).max(56),
        whisper: z.string().trim().min(2).max(120),
      }),
    )
    .min(2)
    .max(6),
});

const SYSTEM_PROMPT = `You write the wording for ONE question inside a cinematic Portugal travel studio.

You are NOT deciding anything. The question and its options are already fixed. You only rewrite the words.

HARD RULES — never break:
- Return the SAME option ids, the SAME number of options, in the SAME order you were given.
- Never add, remove, merge or reorder an option.
- Never mention prices, currency, durations, clock times, percentages, "match", "recommended", "our pick", "AI", or any supplier, winery, restaurant or hotel name.
- Never invent a place, a stop or a fact. Speak about feeling and direction only.
- English, sentence case, no exclamation marks, no emojis, no markdown.
- Option label: max 6 words. Option whisper: one short sentence.
- Title + titleAccent read as one sentence in two parts.
- Output STRICT JSON only, matching: {"eyebrow":string,"title":string,"titleAccent":string,"hint":string,"options":[{"id":string,"label":string,"whisper":string}]}`;

function userPrompt(data: DirectorVoiceInput): string {
  const signals = [
    data.feeling ? `Feeling: ${data.feeling}` : null,
    data.companions ? `Company: ${data.companions}` : null,
    data.rhythm ? `Rhythm: ${data.rhythm}` : null,
    data.interests && data.interests.length > 0 ? `Interests: ${data.interests.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `Question key: ${data.questionKey}`,
    `Current eyebrow: ${data.baseEyebrow}`,
    `Current title: ${data.baseTitle} ${data.baseTitleAccent}`,
    "",
    "Options (keep these ids, this order):",
    ...data.options.map((o) => `- ${o.id} — ${o.label} (${o.whisper})`),
    "",
    signals ? `Traveller so far:\n${signals}` : "Traveller so far: nothing decided yet.",
    "",
    "Rewrite the wording now as JSON.",
  ].join("\n");
}

export const composeDirectorVoice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "studio_v3_director_voice",
      limit: 12,
      windowSec: 60,
    });
    if (!rl.ok) return { candidate: null, source: "fallback" as const };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { candidate: null, source: "fallback" as const };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(data) },
          ],
          temperature: 0.7,
          max_tokens: 420,
          response_format: { type: "json_object" },
        }),
      });
      // 402 / 403 / 429 / 5xx all resolve to the deterministic copy. The
      // Studio never blocks, never retries in the request path.
      if (!res.ok) return { candidate: null, source: "fallback" as const };

      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content?.toString() ?? "";
      const parsed = candidateSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return { candidate: null, source: "fallback" as const };

      return {
        // The pure adapter still validates keys, order and forbidden copy.
        candidate: { questionKey: data.questionKey, ...parsed.data },
        source: "ai" as const,
      };
    } catch {
      return { candidate: null, source: "fallback" as const };
    }
  });
