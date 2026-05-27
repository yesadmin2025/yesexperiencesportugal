import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashConfig, logAiUsage } from "./aiAuditLog.server";
import {
  type BuilderInput,
  type BuilderRoute,
  type CompatibilityRule,
  type Intention,
  type Mood,
  type Pace,
  type RegionRow,
  type RoutingRules,
  type StopRow,
  type Who,
  buildRouteFromStopKeys,
  computeDayEligibility,
  fallbackNarrative,
  generateRoute,
} from "./builderEngine.server";

const inputSchema = z.object({
  mood: z.enum(["slow", "curious", "romantic", "open", "energetic"]),
  who: z.enum(["couple", "family", "friends", "solo", "corporate", "group"]),
  intention: z.enum([
    "wine",
    "gastronomy",
    "nature",
    "heritage",
    "coast",
    "hidden",
    "wonder",
    "wellness",
  ]),
  regionKey: z.string().min(1).max(64).optional(),
  pace: z.enum(["relaxed", "balanced", "full"]).optional(),
  pinnedStopKeys: z.array(z.string().min(1).max(64)).max(8).optional(),
  excludedStopKeys: z.array(z.string().min(1).max(64)).max(20).optional(),
});

async function loadCatalog() {
  const [regionsRes, stopsRes, rulesRes, compatRes] = await Promise.all([
    supabaseAdmin
      .from("builder_regions")
      .select("key,label,blurb,lat,lng")
      .order("sort_order"),
    supabaseAdmin
      .from("builder_stops")
      .select(
        "key,canonical_key,variant_bucket,variant_label,source_tour_keys,region_key,label,blurb,tag,lat,lng,duration_minutes,mood_tags,pace_tags,intention_tags,who_tags,compatible_with,weight",
      )
      .eq("is_active", true),
    supabaseAdmin
      .from("builder_routing_rules")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("builder_compatibility_rules")
      .select("stop_a,stop_b,cooccurrence_count"),
  ]);

  if (regionsRes.error) throw new Error(regionsRes.error.message);
  if (stopsRes.error) throw new Error(stopsRes.error.message);
  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (compatRes.error) throw new Error(compatRes.error.message);

  const regions = (regionsRes.data ?? []).map((r) => ({
    ...r,
    lat: Number(r.lat),
    lng: Number(r.lng),
  })) as RegionRow[];
  const stops = (stopsRes.data ?? []).map((s) => ({
    ...s,
    lat: Number(s.lat),
    lng: Number(s.lng),
  })) as StopRow[];
  const rules = (rulesRes.data ?? {
    max_experience_hours: 8,
    max_driving_hours: 3,
    min_stops: 3,
    max_stops: 6,
    default_pace: "balanced",
    base_price_per_person_eur: 180,
    pace_multiplier_relaxed: 0.85,
    pace_multiplier_balanced: 1,
    pace_multiplier_full: 1.2,
  }) as RoutingRules;
  const compatibility = (compatRes.data ?? []) as CompatibilityRule[];

  return { regions, stops, rules, compatibility };
}

/** Generate a feasible route from emotional input. Pure logic, no AI. */
export const generateBuilderRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { regions, stops, rules, compatibility } = await loadCatalog();
    const route = generateRoute(data as BuilderInput, regions, stops, rules, compatibility);
    return { route };
  });

/** Generate a poetic narrative for a real route. Lovable AI Gateway with
 *  deterministic fallback so the UI never shows nothing. */
const narrateSchema = z.object({
  routeStopKeys: z.array(z.string().min(1).max(64)).min(1).max(10),
  mood: z.enum(["slow", "curious", "romantic", "open", "energetic"]),
  who: z.enum(["couple", "family", "friends", "solo", "corporate", "group"]),
  intention: z.enum([
    "wine",
    "gastronomy",
    "nature",
    "heritage",
    "coast",
    "hidden",
    "wonder",
    "wellness",
  ]),
  pace: z.enum(["relaxed", "balanced", "full"]),
  regionKey: z.string().min(1).max(64),
});

export const narrateBuilderRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => narrateSchema.parse(input))
  .handler(async ({ data }) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const { regions, stops, rules, compatibility } = await loadCatalog();
    const route = generateRoute(
      {
        mood: data.mood as Mood,
        who: data.who as Who,
        intention: data.intention as Intention,
        regionKey: data.regionKey,
        pace: data.pace as Pace,
        pinnedStopKeys: data.routeStopKeys,
      },
      regions,
      stops,
      rules,
      compatibility,
    );

    const fallback = fallbackNarrative(route, {
      mood: data.mood as Mood,
      who: data.who as Who,
      intention: data.intention as Intention,
    });

    const configHash = hashConfig({
      stops: data.routeStopKeys,
      mood: data.mood,
      who: data.who,
      intention: data.intention,
      pace: data.pace,
      region: data.regionKey,
    });

    // No provider configured — fallback only
    if (!openaiKey && !lovableKey) {
      await logAiUsage({
        provider: "none",
        feature: "builder_narrative",
        status: "fallback",
        configHash,
        errorCode: "no_provider",
      });
      return { narrative: fallback, source: "fallback" as const };
    }

    const useOpenAI = Boolean(openaiKey);
    const provider = useOpenAI ? "openai" : "lovable_ai";
    const model = useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-flash";
    const startedAt = Date.now();

    try {
      const stopList = route.stops
        .map((s, i) => `${i + 1}. ${s.label}${s.tag ? ` (${s.tag})` : ""} — ${s.blurb ?? ""}`)
        .join("\n");

      const url = useOpenAI
        ? "https://api.openai.com/v1/chat/completions"
        : "https://ai.gateway.lovable.dev/v1/chat/completions";
      const authKey = useOpenAI ? openaiKey! : lovableKey!;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You write short, warm, editorial travel narratives for a premium Portugal travel brand. Three sentences max. Sentence-case. No clichés (no 'hidden gem', no 'unforgettable', no 'breathtaking'). Reference only the real stops provided. Address the reader as 'you'.",
            },
            {
              role: "user",
              content: `Mood: ${data.mood}. Travelling: ${data.who}. Looking for: ${data.intention}. Pace: ${data.pace}. Region: ${route.region.label}.\n\nReal stops, in order:\n${stopList}\n\nWrite the narrative.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 220,
        }),
      });

      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        const status = res.status === 429 ? "rate_limited" : "failure";
        await logAiUsage({
          provider,
          model,
          feature: "builder_narrative",
          status,
          latencyMs,
          configHash,
          errorCode: String(res.status),
          errorMessage: `${res.status} ${res.statusText}`,
        });
        return { narrative: fallback, source: "fallback" as const };
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        await logAiUsage({
          provider,
          model,
          feature: "builder_narrative",
          status: "failure",
          latencyMs,
          configHash,
          errorCode: "empty_response",
        });
        return { narrative: fallback, source: "fallback" as const };
      }
      await logAiUsage({
        provider,
        model,
        feature: "builder_narrative",
        status: "success",
        latencyMs,
        configHash,
      });
      return { narrative: text, source: "ai" as const };
    } catch (err) {
      await logAiUsage({
        provider,
        model,
        feature: "builder_narrative",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return { narrative: fallback, source: "fallback" as const };
    }
  });

/* ─── multi-day live builder server functions ──────────────────── */

const dayInputSchema = z.object({
  regionKey: z.string().min(1).max(64),
  pace: z.enum(["relaxed", "balanced", "full"]).default("balanced"),
  stopKeys: z.array(z.string().min(1).max(64)).max(20),
});

/** Compute eligibility (radius + timing) for every candidate stop. */
export const computeAddStopEligibility = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => dayInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { regions, stops, rules } = await loadCatalog();
    const region = regions.find((r) => r.key === data.regionKey);
    if (!region) {
      return { eligibility: [], rules: null };
    }
    const eligibility = computeDayEligibility(
      { stopKeys: data.stopKeys },
      data.regionKey,
      { lat: region.lat, lng: region.lng },
      stops,
      rules,
    );
    return {
      eligibility,
      rules: {
        max_km_between_stops: rules.max_km_between_stops,
        max_total_km_per_day: rules.max_total_km_per_day,
        max_experience_hours: rules.max_experience_hours,
        max_driving_hours: rules.max_driving_hours,
      },
    };
  });

/** Build a feasible BuilderRoute from the user-chosen ordered stop keys. */
export const buildDayRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => dayInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { regions, stops, rules } = await loadCatalog();
    const route = buildRouteFromStopKeys(
      data.stopKeys,
      data.regionKey,
      data.pace,
      regions,
      stops,
      rules,
    );
    return { route };
  });

/** Return all active stops in a region — used by the live add-stop picker. */
export const listRegionStops = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ regionKey: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { stops, regions } = await loadCatalog();
    const region = regions.find((r) => r.key === data.regionKey);
    const filtered = stops
      .filter((s) => s.region_key === data.regionKey)
      .map((s) => ({
        key: s.key,
        label: s.label,
        blurb: s.blurb,
        tag: s.tag,
        lat: s.lat,
        lng: s.lng,
        duration_minutes: s.duration_minutes,
      }));
    return { stops: filtered, region: region ?? null };
  });
