/**
 * Studio v2 — itinerary composition server function.
 *
 * Thin wrapper: loads real `builder_stops` rows + routing caps from Supabase,
 * delegates to pure scoring/composition helpers in `itinerary.server.ts`,
 * returns a serialisation-safe DTO that matches the existing
 * `JourneyPreview` shape consumed by the BuilderMap.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  composeItinerary,
  dbRegionsFor,
  scoreStop,
  DEFAULT_CAPS,
  type DbStop,
  type RoutingCaps,
} from "./itinerary.server";
import { resolveLegs, type Leg } from "./routing.server";

// Loose profile schema — same shape as session save; we only read fields we need.
const profileSchema = z
  .object({
    intent: z.string().max(40).optional(),
    pace: z.string().max(20).optional(),
    socialEnergy: z.number().min(0).max(100).optional(),
    cultureInterest: z.number().min(0).max(100).optional(),
    foodInterest: z.number().min(0).max(100).optional(),
    coastalAffinity: z.number().min(0).max(100).optional(),
    wellnessAffinity: z.number().min(0).max(100).optional(),
    driveToleranceMin: z.number().min(0).max(240).optional(),
    stopDensityTarget: z.number().min(1).max(10).optional(),
    group: z.record(z.string(), z.any()).optional(),
    priorityWeights: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();

// Engine region keys (must match REGION_MAP in itinerary.server.ts).
const ENGINE_REGIONS = ["arrabida", "lisbon-coast", "alentejo", "centro"] as const;

const inputSchema = z.object({
  profile: profileSchema,
  region: z.enum(ENGINE_REGIONS).optional(),
  targetStops: z.number().int().min(2).max(8).optional(),
  /** When provided, restricts the pool to `builder_stops` whose
   *  `source_tour_keys` overlaps any of these keys — i.e. anchors the
   *  day to ONE real Signature tour (Tailored rule). */
  blueprintFilter: z.array(z.string().min(1).max(64)).max(8).optional(),
});

export const composeRealItinerary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const region = data.region ?? "arrabida"; // safe default — most coverage
    const dbRegions = dbRegionsFor(region);

    // Load active stops in the relevant DB regions.
    const { data: stopRows, error: stopErr } = await supabaseAdmin
      .from("builder_stops")
      .select(
        "key, canonical_key, region_key, label, blurb, tag, lat, lng, duration_minutes, mood_tags, pace_tags, intention_tags, who_tags, weight, source_tour_keys",
      )
      .eq("is_active", true)
      .in("region_key", dbRegions);
    if (stopErr) throw new Error(stopErr.message);

    // Load active routing caps (single active row).
    const { data: rules } = await supabaseAdmin
      .from("builder_routing_rules")
      .select(
        "min_stops, max_stops, max_km_between_stops, max_total_km_per_day, max_driving_hours, max_experience_hours",
      )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const caps: RoutingCaps = rules
      ? {
          minStops: rules.min_stops,
          maxStops: rules.max_stops,
          maxKmBetweenStops: Number(rules.max_km_between_stops),
          maxTotalKmPerDay: Number(rules.max_total_km_per_day),
          maxDrivingHours: Number(rules.max_driving_hours),
          maxExperienceHours: Number(rules.max_experience_hours),
        }
      : DEFAULT_CAPS;

    // Dedupe: many builder_stops rows are duration variants (--short / --deep)
    // or different tour-pulls of the SAME physical place. The composer must
    // never place two of them on the same day. Collapse by canonical_key (or
    // label + coarse coords as fallback), keep the highest-weighted variant.
    const rawPool = (stopRows ?? []).map((r) => ({
      key: r.key as string,
      canonical_key: (r.canonical_key as string | null) ?? null,
      region_key: r.region_key as string,
      label: r.label as string,
      blurb: (r.blurb as string | null) ?? null,
      tag: (r.tag as string | null) ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      duration_minutes: r.duration_minutes ?? 60,
      mood_tags: (r.mood_tags as string[] | null) ?? [],
      pace_tags: (r.pace_tags as string[] | null) ?? [],
      intention_tags: (r.intention_tags as string[] | null) ?? [],
      who_tags: (r.who_tags as string[] | null) ?? [],
      weight: (r.weight as number | null) ?? 50,
      source_tour_keys: (r.source_tour_keys as string[] | null) ?? [],
    }));
    const dedupeMap = new Map<string, (typeof rawPool)[number]>();
    for (const s of rawPool) {
      const identity =
        s.canonical_key ??
        `${s.label.toLowerCase().trim()}@${s.lat.toFixed(3)},${s.lng.toFixed(3)}`;
      const prev = dedupeMap.get(identity);
      if (!prev || s.weight > prev.weight) dedupeMap.set(identity, s);
    }
    const fullPool: DbStop[] = Array.from(dedupeMap.values()).map(
      ({ canonical_key, ...rest }) => rest,
    );

    // Blueprint anchoring — bias the day toward ONE real Signature tour,
    // but ALLOW stops from other tours in the same region when they fit
    // the profile and make geographic sense. We keep the full regional
    // pool and apply a weight bonus to anchored stops so they tend to
    // seed and dominate the itinerary, while leaving room for sensible
    // cross-tour additions.
    let pool: DbStop[] = fullPool;
    let anchored = false;
    if (data.blueprintFilter && data.blueprintFilter.length > 0) {
      const filterSet = new Set(data.blueprintFilter);
      pool = fullPool.map((s) => {
        const isAnchor = s.source_tour_keys.some((k) => filterSet.has(k));
        return isAnchor ? { ...s, weight: (s.weight ?? 50) + 40 } : s;
      });
      anchored = pool.some((s) => s.source_tour_keys.some((k) => filterSet.has(k)));
    }

    const target = data.targetStops ?? data.profile.stopDensityTarget ?? 4;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itinerary = composeItinerary(pool, data.profile as any, target, caps);

    // --- Real driving legs (OSRM-backed, cached). Replaces haversine totals.
    let legs: Leg[] = [];
    let realDriveMin = itinerary.totalDriveMin;
    let realTotalKm = itinerary.totalKm;
    if (itinerary.stops.length >= 2) {
      try {
        legs = await resolveLegs(
          itinerary.stops.map((s) => ({ key: s.key, lat: s.lat, lng: s.lng })),
        );
        if (legs.length > 0) {
          realDriveMin = legs.reduce((a, l) => a + l.drive_minutes, 0);
          realTotalKm = legs.reduce((a, l) => a + l.distance_km, 0);
        }
      } catch {
        // Stay with haversine estimate — never break the response.
      }
    }

    // Attach real driveMinutesFromPrev per stop where we have a leg.
    const stopsWithRealDrive = itinerary.stops.map((s, i) => {
      if (i === 0 || legs[i - 1]?.to_key !== s.key) return s;
      return { ...s, driveMinutesFromPrev: legs[i - 1].drive_minutes };
    });

    // Re-evaluate feasibility against the truthful totals.
    const realWarnings: string[] = [];
    let realFeasible = true;
    if (realTotalKm > caps.maxTotalKmPerDay) {
      realFeasible = false;
      realWarnings.push(
        `Total ${Math.round(realTotalKm)} km exceeds daily cap (${caps.maxTotalKmPerDay} km).`,
      );
    }
    if (realDriveMin / 60 > caps.maxDrivingHours) {
      realFeasible = false;
      realWarnings.push(
        `Driving time ${Math.round(realDriveMin / 60)} h exceeds cap (${caps.maxDrivingHours} h).`,
      );
    }

    // Pre-compute alternates: top-scored stops not currently chosen, so the
    // client-side Refine stage can offer "Swap" without an extra round trip.
    const chosenKeys = new Set(itinerary.stops.map((s) => s.key));
    const alternates = pool
      .filter((s) => !chosenKeys.has(s.key))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s) => ({ stop: s, score: scoreStop(s, data.profile as any) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((c) => ({
        key: c.stop.key,
        region_key: c.stop.region_key,
        label: c.stop.label,
        blurb: c.stop.blurb,
        tag: c.stop.tag,
        lat: c.stop.lat,
        lng: c.stop.lng,
        duration_minutes: c.stop.duration_minutes ?? 60,
        source_tour_keys: c.stop.source_tour_keys ?? [],
        score: Math.round(c.score),
      }));

    // Region centre for the map default zoom (average of chosen stops, fallback to region origin).
    const center =
      itinerary.stops.length > 0
        ? {
            lat: itinerary.stops.reduce((a, s) => a + s.lat, 0) / itinerary.stops.length,
            lng: itinerary.stops.reduce((a, s) => a + s.lng, 0) / itinerary.stops.length,
          }
        : { lat: 38.5, lng: -9.0 };

    return {
      region,
      regionCenter: center,
      stops: stopsWithRealDrive,
      legs, // real driving geometry per leg (encoded polyline + km + minutes)
      alternates,
      density: itinerary.stops.length,
      driveBudgetMin: realDriveMin,
      totalKm: Math.round(realTotalKm),
      totalExperienceMin: itinerary.totalExperienceMin,
      feasible: realFeasible,
      warnings: realWarnings.length > 0 ? realWarnings : itinerary.warnings,
      caps,
      routingProvider: legs[0]?.provider ?? "haversine",
      /** True when the day was composed from a Signature-anchored subset
       *  of the pool (Tailored rule applied). False when we fell back to
       *  the full region pool. Internal — never rendered as a label. */
      anchored,
    };
  });
