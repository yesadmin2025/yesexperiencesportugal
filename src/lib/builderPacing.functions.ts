import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashConfig, logAiUsage } from "@/lib/aiAuditLog.server";
import { rateLimit } from "./rateLimit.server";

/**
 * Silent AI pacing advisor for the live builder & review screen.
 * Returns a short editorial warning (≤90 chars) when the route feels rushed,
 * or null when it's well-paced. Never invents stops; tone-only.
 */

const inputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  stops: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        label: z.string().min(1).max(160),
        durationMinutes: z.number().int().min(0).max(600),
        driveMinutesFromPrev: z.number().int().min(0).max(600),
      }),
    )
    .min(1)
    .max(10),
  pace: z.enum(["relaxed", "balanced", "full"]),
  who: z.enum(["couple", "family", "friends", "solo", "corporate", "group"]),
  totalMinutes: z.number().int().min(0).max(24 * 60),
});

type SuggestionResult = {
  warning: string | null;
  rationale: string | null;
  source: "ai" | "fallback" | "rate_limited" | "ok";
};

function deterministicWarning(
  totalMinutes: number,
  stopsCount: number,
  pace: "relaxed" | "balanced" | "full",
  who: string,
): string | null {
  const hours = totalMinutes / 60;
  if (pace === "relaxed" && hours > 7) {
    return "Ritmo apertado para um dia relaxado — considera tirar uma paragem.";
  }
  if (hours > 9) return "Dia muito cheio — ainda é confortável, mas sem margem.";
  if (stopsCount >= 6 && pace !== "full") {
    return "São muitas paragens — talvez uma a menos torne o dia mais respirável.";
  }
  if (who === "family" && hours > 7) {
    return "Para família, este ritmo pode pesar à tarde — pondera abrandar.";
  }
  return null;
}

export const suggestPacing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SuggestionResult> => {
    const fallback: SuggestionResult = {
      warning: deterministicWarning(
        data.totalMinutes,
        data.stops.length,
        data.pace,
        data.who,
      ),
      rationale: null,
      source: "fallback",
    };

    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "builder_pacing",
      limit: 10,
      windowSec: 300,
    });
    if (!rl.ok) {
      return { ...fallback, source: "rate_limited" };
    }

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return fallback;

    const configHash = hashConfig({
      pace: data.pace,
      who: data.who,
      stops: data.stops.map((s) => s.key),
      total: data.totalMinutes,
    });
    const startedAt = Date.now();
    const model = "google/gemini-3-flash-preview";

    try {
      const stopList = data.stops
        .map(
          (s, i) =>
            `${i + 1}. ${s.label} — ${s.durationMinutes}min on stop${
              i > 0 ? `, ${s.driveMinutesFromPrev}min drive` : ""
            }`,
        )
        .join("\n");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a silent pacing advisor for a premium Portugal travel brand. Given a real itinerary, return either no warning (well-paced) or ONE short editorial warning in Portuguese (≤90 chars), sentence case, no clichés. Tone only — never invent or suggest stops.",
            },
            {
              role: "user",
              content: `Pace: ${data.pace}. Who: ${data.who}. Total: ${Math.round(
                data.totalMinutes / 60,
              )}h. Stops:\n${stopList}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "advise_pacing",
                description: "Return a pacing warning or null.",
                parameters: {
                  type: "object",
                  properties: {
                    warning: {
                      type: ["string", "null"],
                      description: "Short PT warning ≤90 chars, or null if well-paced.",
                    },
                    rationale: {
                      type: ["string", "null"],
                      description: "Optional 1-line rationale, ≤120 chars.",
                    },
                  },
                  required: ["warning"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "advise_pacing" } },
        }),
      });

      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        await logAiUsage({
          provider: "lovable_ai",
          model,
          feature: "builder_pacing",
          status: res.status === 429 ? "rate_limited" : "failure",
          latencyMs,
          configHash,
          errorCode: String(res.status),
        });
        return fallback;
      }
      const json = (await res.json()) as {
        choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
      };
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) return fallback;
      const parsed = JSON.parse(argsStr) as { warning: string | null; rationale?: string | null };

      const warning =
        typeof parsed.warning === "string" && parsed.warning.trim().length > 0
          ? parsed.warning.trim().slice(0, 110)
          : null;
      const rationale =
        typeof parsed.rationale === "string" && parsed.rationale.trim().length > 0
          ? parsed.rationale.trim().slice(0, 140)
          : null;

      await logAiUsage({
        provider: "lovable_ai",
        model,
        feature: "builder_pacing",
        status: "success",
        latencyMs,
        configHash,
      });

      return {
        warning,
        rationale,
        source: warning ? "ai" : "ok",
      };
    } catch (err) {
      await logAiUsage({
        provider: "lovable_ai",
        model,
        feature: "builder_pacing",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  });
