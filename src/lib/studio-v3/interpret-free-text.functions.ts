/**
 * Studio V3 — AI-AWARE FREE TEXT (Lovable AI), strictly additive.
 *
 * The deterministic interpreter (`freeTextInterpreter.ts`) remains the
 * authority. This function only proposes ADDITIONAL positive signals inside
 * the already-closed semantic vocabulary, for sentences the lexicon cannot
 * reach ("we want somewhere our teenager won't be bored").
 *
 * Guarantees, enforced twice — here and again by `mergeInterpreterOverlay`:
 *  - only known `domain:value` pairs survive;
 *  - AI may never produce a negative signal, so it can never override or
 *    weaken an explicit traveller negation ("no wine" stays "no wine");
 *  - provenance is forced to `ai-interpretation`, the weakest authority;
 *  - any failure returns no events at all — the deterministic reading stands.
 *
 * The raw sentence is sent to the model but is NEVER persisted: only the
 * structured, closed-vocabulary result returns to the client.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit.server";
import {
  SEMANTIC_DOMAINS,
  SEMANTIC_DOMAIN_VALUES,
  isKnownSemanticValue,
  type SemanticDomain,
  type SemanticSourceEvent,
} from "@/lib/studio-v3/semanticSourceEvents";

const inputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  text: z.string().trim().min(3).max(400),
});

const outputSchema = z.object({
  signals: z
    .array(
      z.object({
        domain: z.string().min(2).max(20),
        value: z.string().min(1).max(40),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .max(8),
});

function vocabulary(): string {
  return SEMANTIC_DOMAINS.map(
    (domain) =>
      `${domain}: ${(SEMANTIC_DOMAIN_VALUES[domain] as readonly string[]).join(", ")}`,
  ).join("\n");
}

const SYSTEM_PROMPT = `You convert one short traveller note into structured signals for a private Portugal day.

You may ONLY use the closed vocabulary given to you. You never invent a domain, a value, a place, a stop, a supplier or a price.

HARD RULES:
- Return ONLY signals the traveller clearly WANTS. Never return anything they rule out, dislike or negate — negations are handled elsewhere and you must ignore them entirely.
- If a sentence says "no wine", do NOT return wine, and do not return anything else about wine.
- If nothing in the vocabulary clearly applies, return an empty list.
- Maximum 4 signals.
- Output STRICT JSON only: {"signals":[{"domain":"<domain>","value":"<value>","confidence":0.0-1.0}]}`;

export const interpretFreeTextWithAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ events: SemanticSourceEvent[]; source: string }> => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "studio_v3_free_text_ai",
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return { events: [], source: "fallback" };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { events: [], source: "fallback" };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Closed vocabulary:\n${vocabulary()}\n\nTraveller note:\n"""${data.text}"""\n\nReturn the JSON now.`,
            },
          ],
          temperature: 0.2,
          max_tokens: 260,
          response_format: { type: "json_object" },
        }),
      });
      // 402 / 403 / 429 / 5xx: deterministic reading stands, no retry here.
      if (!res.ok) return { events: [], source: "fallback" };

      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = outputSchema.safeParse(
        JSON.parse(json.choices?.[0]?.message?.content?.toString() ?? "{}"),
      );
      if (!parsed.success) return { events: [], source: "fallback" };

      const events: SemanticSourceEvent[] = [];
      for (const signal of parsed.data.signals) {
        const domain = signal.domain as SemanticDomain;
        if (!SEMANTIC_DOMAINS.includes(domain)) continue;
        if (!isKnownSemanticValue(domain, signal.value)) continue;
        events.push({
          domain,
          value: signal.value,
          // Forced: AI is the weakest authority and may only ever add.
          provenance: "ai-interpretation",
          polarity: "positive",
          confidence: Math.min(0.6, signal.confidence ?? 0.5),
          declaredPriority: false,
        } as SemanticSourceEvent);
      }
      return { events, source: events.length > 0 ? "ai" : "fallback" };
    } catch {
      return { events: [], source: "fallback" };
    }
  });
