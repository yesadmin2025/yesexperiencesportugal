import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashConfig, logAiUsage } from "@/lib/aiAuditLog.server";
import { rateLimit } from "@/lib/rateLimit.server";
import {
  STUDIO_INTENT_MODEL,
  STUDIO_INTENT_PROMPT_VERSION,
  STUDIO_INTENT_SCHEMA_VERSION,
  validateStudioIntentInterpretation,
  type StudioIntentAdvisorInput,
  type StudioIntentAdvisorResult,
} from "@/components/studio-v3/studioIntentAdvisor";

const adaptiveKinds = ["coast", "wine", "hands", "local", "faith", "photo"] as const;
const refineIds = ["more-ocean", "less-wine", "slower"] as const;
const interests = [
  "wine",
  "gastronomy",
  "nature",
  "coast",
  "heritage",
  "photography",
  "wellness",
  "local-life",
  "faith",
  "hands-on",
] as const;

const advisorInputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  input: z.object({
    schemaVersion: z.literal(STUDIO_INTENT_SCHEMA_VERSION),
    feeling: z.enum([
      "coastal",
      "wine-food",
      "hidden",
      "romance",
      "culture",
      "adventure",
      "slow-luxury",
      "faith",
      "hands-on",
    ]),
    companions: z.enum([
      "solo",
      "couple",
      "family",
      "friends",
      "celebration",
      "proposal",
      "corporate",
    ]),
    interests: z.array(z.enum(interests)).max(10),
    rhythm: z.enum(["slow", "balanced", "full", "immersive"]),
    destinationIntent: z.enum([
      "no-preference",
      "anywhere-special",
      "arrabida-setubal-azeitao",
      "comporta-troia",
      "lisbon-sintra-cascais",
      "alentejo-evora-wine",
      "alentejo-roman-talha",
      "spiritual-coast",
      "central-portugal",
      "vicentine-coast",
    ]),
    refinementAnswered: z.boolean(),
    availableAdaptiveKinds: z.array(z.enum(adaptiveKinds)).max(6),
    allowedRefineIntentIds: z.array(z.enum(refineIds)).max(3),
  }),
});

const fallback = (): StudioIntentAdvisorResult => ({
  interpretation: null,
  source: "fallback",
});

/**
 * Server-only, low-cost advisory call. The request has no identity/contact,
 * address, payment, supplier or itinerary fields. The returned classification
 * is validated again against deterministic Studio context before use.
 */
export const adviseStudioIntent = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => advisorInputSchema.parse(value))
  .handler(async ({ data }): Promise<StudioIntentAdvisorResult> => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "studio_intent_advisor",
      limit: 6,
      windowSec: 300,
    });
    if (!rl.ok) return { interpretation: null, source: "rate-limited" };

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return fallback();

    const input = data.input as StudioIntentAdvisorInput;
    const configHash = hashConfig({
      feature: "studio_intent_advisor",
      prompt: STUDIO_INTENT_PROMPT_VERSION,
      schema: STUDIO_INTENT_SCHEMA_VERSION,
      state: input,
    });
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: STUDIO_INTENT_MODEL,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "You are a constrained preference classifier for a private-tour Studio. You do not design an itinerary. Choose only from the IDs supplied. Never infer wine from gastronomy, romance, luxury, or geography alone. Do not invent stops, suppliers, prices, durations, availability, meals or claims. If the traveller is already clear, preferredAdaptiveKind may be none. Keep the result conservative and explainable through the closed rationale code only.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_studio_intent",
                description: "Classify preferences using only the supplied closed Studio choices.",
                parameters: {
                  type: "object",
                  properties: {
                    schemaVersion: { type: "string", enum: [STUDIO_INTENT_SCHEMA_VERSION] },
                    confidence: { type: "string", enum: ["low", "medium", "high"] },
                    preferenceWeights: {
                      type: "object",
                      properties: Object.fromEntries(
                        interests.map((key) => [key, { type: "integer", enum: [0, 1, 2, 3] }]),
                      ),
                      required: [...interests],
                      additionalProperties: false,
                    },
                    paceBias: { type: "string", enum: ["slower", "balanced", "fuller"] },
                    preferredAdaptiveKind: {
                      type: "string",
                      enum: ["none", ...adaptiveKinds],
                    },
                    suggestedRefineIntentIds: {
                      type: "array",
                      maxItems: 2,
                      uniqueItems: true,
                      items: { type: "string", enum: [...refineIds] },
                    },
                    rationaleCode: {
                      type: "string",
                      enum: [
                        "clear-fit",
                        "pace-sensitive",
                        "coast-led",
                        "wine-led",
                        "culture-led",
                        "local-led",
                        "faith-led",
                        "photo-led",
                        "mixed",
                      ],
                    },
                  },
                  required: [
                    "schemaVersion",
                    "confidence",
                    "preferenceWeights",
                    "paceBias",
                    "preferredAdaptiveKind",
                    "suggestedRefineIntentIds",
                    "rationaleCode",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "classify_studio_intent" } },
        }),
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        await logAiUsage({
          provider: "lovable_ai",
          model: STUDIO_INTENT_MODEL,
          feature: "studio_intent_advisor",
          status: response.status === 429 ? "rate_limited" : "failure",
          latencyMs,
          configHash,
          errorCode: String(response.status),
        });
        return fallback();
      }

      const json = (await response.json()) as {
        choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) {
        await logAiUsage({
          provider: "lovable_ai",
          model: STUDIO_INTENT_MODEL,
          feature: "studio_intent_advisor",
          status: "failure",
          latencyMs,
          configHash,
          errorCode: "no_tool_call",
        });
        return fallback();
      }

      const raw = JSON.parse(args) as Record<string, unknown>;
      if (raw.preferredAdaptiveKind === "none") raw.preferredAdaptiveKind = null;
      const interpretation = validateStudioIntentInterpretation(raw, input);
      if (!interpretation) {
        await logAiUsage({
          provider: "lovable_ai",
          model: STUDIO_INTENT_MODEL,
          feature: "studio_intent_advisor",
          status: "failure",
          latencyMs,
          configHash,
          errorCode: "invalid_classification",
        });
        return fallback();
      }

      await logAiUsage({
        provider: "lovable_ai",
        model: STUDIO_INTENT_MODEL,
        feature: "studio_intent_advisor",
        status: "success",
        latencyMs,
        configHash,
      });
      return { interpretation, source: "ai" };
    } catch (error) {
      clearTimeout(timeout);
      await logAiUsage({
        provider: "lovable_ai",
        model: STUDIO_INTENT_MODEL,
        feature: "studio_intent_advisor",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "exception",
      });
      return fallback();
    }
  });
