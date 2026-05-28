import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashConfig, logAiUsage } from "@/lib/aiAuditLog.server";
import { rateLimit } from "./rateLimit.server";

/**
 * AI user-intent helper for the live builder.
 *
 * Given a free-text intent (e.g. "romantic slow weekend, wine + sea") and the
 * current region's catalogue of REAL stops, returns:
 *   - suggestedStopKeys: ordered list of the most relevant real stops
 *   - rankedKeys:        full ranked order of all candidates (for biasing)
 *   - pace / mood notes (optional, for tone only)
 *
 * AI NEVER invents stops. We pass it the real catalog and force it to pick
 * keys from that list via tool calling.
 */

const inputSchema = z.object({
  intent: z.string().min(2).max(500),
  regionKey: z.string().min(1).max(64),
  excludedKeys: z.array(z.string().min(1).max(64)).max(40).default([]),
  sessionId: z.string().min(8).max(64),
});

export const suggestFromIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    // Throttle anon AI calls per session: max 12 calls / 5 min.
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "builder_intent",
      limit: 12,
      windowSec: 300,
    });
    if (!rl.ok) {
      return {
        suggestedStopKeys: [],
        rankedKeys: [],
        paceHint: null,
        source: "rate_limited" as const,
        retryInSec: rl.resetInSec,
      };
    }

    const lovableKey = process.env.LOVABLE_API_KEY;

    const { data: stops, error } = await supabaseAdmin
      .from("builder_stops")
      .select("key,label,blurb,tag,mood_tags,intention_tags,duration_minutes")
      .eq("region_key", data.regionKey)
      .eq("is_active", true);
    if (error) throw new Error(error.message);

    const catalog = (stops ?? []).filter((s) => !data.excludedKeys.includes(s.key));
    if (catalog.length === 0) {
      return { suggestedStopKeys: [], rankedKeys: [], paceHint: null, source: "empty" as const };
    }

    const fallback = {
      suggestedStopKeys: catalog.slice(0, 3).map((s) => s.key),
      rankedKeys: catalog.map((s) => s.key),
      paceHint: null,
      source: "fallback" as const,
    };

    if (!lovableKey) return fallback;

    const configHash = hashConfig({ intent: data.intent, region: data.regionKey });
    const startedAt = Date.now();

    try {
      const catalogText = catalog
        .map(
          (s) =>
            `- ${s.key} | ${s.label}${s.tag ? ` (${s.tag})` : ""} — ${s.blurb ?? ""} [moods:${(s.mood_tags ?? []).join(",")} themes:${(s.intention_tags ?? []).join(",")}]`,
        )
        .join("\n");

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
                "You match a traveller's intent to REAL stops from the catalogue. You MUST only return keys present in the catalogue. Never invent stops, locations, or experiences. Tone-only AI: if intent is unclear, pick the closest mood/theme match.",
            },
            {
              role: "user",
              content: `Intent: "${data.intent}"\n\nCatalogue (key | label — blurb [tags]):\n${catalogText}\n\nReturn the best 3-5 stops for this intent, then the full catalogue ranked best-first.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "rank_stops",
                description: "Rank real catalog stops against the intent.",
                parameters: {
                  type: "object",
                  properties: {
                    suggestedStopKeys: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-5 best-fit stop keys, in suggested visit order.",
                    },
                    rankedKeys: {
                      type: "array",
                      items: { type: "string" },
                      description: "ALL catalogue keys, ordered best-fit first.",
                    },
                    paceHint: {
                      type: "string",
                      enum: ["relaxed", "balanced", "full"],
                    },
                  },
                  required: ["suggestedStopKeys", "rankedKeys"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "rank_stops" } },
        }),
      });

      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        const status = res.status === 429 ? "rate_limited" : "failure";
        await logAiUsage({
          provider: "lovable_ai",
          model: "google/gemini-3-flash-preview",
          feature: "builder_intent",
          status,
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
      if (!argsStr) {
        await logAiUsage({
          provider: "lovable_ai",
          model: "google/gemini-3-flash-preview",
          feature: "builder_intent",
          status: "failure",
          latencyMs,
          configHash,
          errorCode: "no_tool_call",
        });
        return fallback;
      }
      const parsed = JSON.parse(argsStr) as {
        suggestedStopKeys?: string[];
        rankedKeys?: string[];
        paceHint?: "relaxed" | "balanced" | "full";
      };

      const validKeys = new Set(catalog.map((s) => s.key));
      const suggested = (parsed.suggestedStopKeys ?? []).filter((k) => validKeys.has(k)).slice(0, 5);
      const ranked = (parsed.rankedKeys ?? []).filter((k) => validKeys.has(k));
      // Append any catalog keys the model omitted, preserving original order.
      for (const s of catalog) if (!ranked.includes(s.key)) ranked.push(s.key);

      await logAiUsage({
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        feature: "builder_intent",
        status: "success",
        latencyMs,
        configHash,
      });

      return {
        suggestedStopKeys: suggested.length > 0 ? suggested : fallback.suggestedStopKeys,
        rankedKeys: ranked,
        paceHint: parsed.paceHint ?? null,
        source: "ai" as const,
      };
    } catch (err) {
      await logAiUsage({
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        feature: "builder_intent",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  });
