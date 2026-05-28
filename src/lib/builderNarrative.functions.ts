import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashConfig, logAiUsage } from "@/lib/aiAuditLog.server";
import { rateLimit } from "./rateLimit.server";

/**
 * Narrative entry parser for the Builder.
 *
 * The traveller writes a single editorial sentence describing the trip they
 * want ("romantic weekend, wine and sea, no rush"). We call Lovable AI with
 * structured tool-calling to convert that into the builder's canonical enums.
 *
 * AI NEVER invents stops or regions. It only maps free-text intent to the
 * existing vocabulary the builder already supports.
 */

const MOODS = ["slow", "curious", "romantic", "open", "energetic"] as const;
const WHOS = ["couple", "family", "friends", "solo", "corporate", "group"] as const;
const INTENTIONS = [
  "wine",
  "gastronomy",
  "nature",
  "heritage",
  "coast",
  "hidden",
  "wonder",
  "wellness",
] as const;
const PACES = ["relaxed", "balanced", "full"] as const;
const REGIONS = ["lisbon", "porto", "alentejo", "douro", "algarve", "sintra"] as const;

const inputSchema = z.object({
  narrative: z.string().trim().min(4).max(500),
  sessionId: z.string().min(8).max(64),
});

const outputSchema = z.object({
  mood: z.enum(MOODS).nullable().optional(),
  who: z.enum(WHOS).nullable().optional(),
  intention: z.enum(INTENTIONS).nullable().optional(),
  pace: z.enum(PACES).nullable().optional(),
  regionHint: z.enum(REGIONS).nullable().optional(),
  rationale: z.string().max(120).nullable().optional(),
});

export type ParsedNarrative = z.infer<typeof outputSchema>;

export const parseNarrative = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ParsedNarrative & { source: "ai" | "rate_limited" | "fallback" }> => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "builder_narrative",
      limit: 8,
      windowSec: 300,
    });
    if (!rl.ok) {
      return { source: "rate_limited" };
    }

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return { source: "fallback" };

    const configHash = hashConfig({ narrative: data.narrative.slice(0, 80) });
    const startedAt = Date.now();

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
                "You translate a traveller's one-sentence wish into the YES builder's canonical enums. Pick ONLY values from the provided lists. Never invent stops, regions, or experiences. If the sentence is unclear for a field, return null. Tone-only AI: do not write itinerary content.",
            },
            {
              role: "user",
              content: `Traveller's sentence: "${data.narrative}"\n\nAllowed values:\n- mood: ${MOODS.join(", ")}\n- who: ${WHOS.join(", ")}\n- intention: ${INTENTIONS.join(", ")}\n- pace: ${PACES.join(", ")}\n- regionHint (optional): ${REGIONS.join(", ")}\n\nRationale: short editorial line (≤80 chars) in the same language as the input, no marketing fluff.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "map_to_enums",
                description: "Map the traveller's wish to the builder's canonical enums.",
                parameters: {
                  type: "object",
                  properties: {
                    mood: { type: ["string", "null"], enum: [...MOODS, null] },
                    who: { type: ["string", "null"], enum: [...WHOS, null] },
                    intention: { type: ["string", "null"], enum: [...INTENTIONS, null] },
                    pace: { type: ["string", "null"], enum: [...PACES, null] },
                    regionHint: { type: ["string", "null"], enum: [...REGIONS, null] },
                    rationale: { type: ["string", "null"] },
                  },
                  required: ["mood", "who", "intention", "pace", "regionHint", "rationale"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "map_to_enums" } },
        }),
      });

      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        await logAiUsage({
          provider: "lovable_ai",
          model: "google/gemini-3-flash-preview",
          feature: "builder_narrative",
          status: res.status === 429 ? "rate_limited" : "failure",
          latencyMs,
          configHash,
          errorCode: String(res.status),
        });
        return { source: "fallback" };
      }

      const json = (await res.json()) as {
        choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
      };
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) {
        await logAiUsage({
          provider: "lovable_ai",
          model: "google/gemini-3-flash-preview",
          feature: "builder_narrative",
          status: "failure",
          latencyMs,
          configHash,
          errorCode: "no_tool_call",
        });
        return { source: "fallback" };
      }

      const parsed = outputSchema.parse(JSON.parse(argsStr));

      await logAiUsage({
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        feature: "builder_narrative",
        status: "success",
        latencyMs,
        configHash,
      });

      return { ...parsed, source: "ai" };
    } catch (err) {
      await logAiUsage({
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        feature: "builder_narrative",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return { source: "fallback" };
    }
  });
