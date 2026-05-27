/**
 * Server functions for the Experience Builder image library.
 *
 * Two surfaces:
 *  - admin: scrape Viator photos into experience_images
 *  - public: pick the right images for a route, mood, or stop list
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scrapeViatorImagesForStop } from "./builderImages.server";

async function assertAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin role required");
}

/* ─────────────────────────────  ADMIN  ───────────────────────────── */

const ScrapeOneSchema = z.object({
  viatorUrl: z
    .string()
    .url()
    .refine((u) => /^https?:\/\/(www\.)?viator\.com\//i.test(u), {
      message: "Must be a viator.com URL",
    }),
  stopKey: z.string().min(1).max(80),
  regionKey: z.string().min(1).max(40).optional(),
  imageType: z.string().min(1).max(40).optional(),
  usageRole: z.string().min(1).max(40).optional(),
  moodTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  occasionTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  maxImages: z.number().int().min(1).max(20).optional(),
});

export const scrapeViatorImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ScrapeOneSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return scrapeViatorImagesForStop(data);
  });

const BulkScrapeSchema = z.object({
  items: z.array(ScrapeOneSchema).min(1).max(40),
});

export const bulkScrapeViatorImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => BulkScrapeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const results: Array<
      Awaited<ReturnType<typeof scrapeViatorImagesForStop>> & {
        stopKey: string;
        ok: boolean;
        error?: string;
      }
    > = [];
    for (const item of data.items) {
      try {
        const r = await scrapeViatorImagesForStop(item);
        results.push({ ...r, stopKey: item.stopKey, ok: true });
      } catch (e) {
        results.push({
          scrapedFrom: item.viatorUrl,
          found: 0,
          inserted: 0,
          skipped: 0,
          errors: [],
          rows: [],
          stopKey: item.stopKey,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
    return {
      total: results.length,
      succeeded: results.filter((r) => r.ok).length,
      totalInserted: results.reduce((n, r) => n + r.inserted, 0),
      results,
    };
  });

const ToggleSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const setExperienceImageActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ToggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("experience_images")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateAltSchema = z.object({
  id: z.string().uuid(),
  altText: z.string().min(1).max(300),
});

export const updateExperienceImageAlt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateAltSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("experience_images")
      .update({ alt_text: data.altText })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RescrapeStopSchema = z.object({
  stopKey: z.string().min(1).max(80),
  viatorUrl: z
    .string()
    .url()
    .refine((u) => /^https?:\/\/(www\.)?viator\.com\//i.test(u), {
      message: "Must be a viator.com URL",
    }),
  moodTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  occasionTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  deactivateExisting: z.boolean().optional(),
});

/**
 * Re-scrape Viator photos for a single stop. Optionally deactivates existing
 * rows for that stop first so a clean set replaces the old one. Use this from
 * the QA view to fix bad matches per stop without touching other stops.
 */
export const rescrapeStopImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RescrapeStopSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.deactivateExisting) {
      const { error: deactErr } = await supabaseAdmin
        .from("experience_images")
        .update({ is_active: false })
        .eq("related_stop_key", data.stopKey);
      if (deactErr) throw new Error(deactErr.message);
    }
    const result = await scrapeViatorImagesForStop({
      viatorUrl: data.viatorUrl,
      stopKey: data.stopKey,
      moodTags: data.moodTags,
      occasionTags: data.occasionTags,
    });
    return result;
  });

export const listExperienceImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("experience_images")
      .select(
        "id,image_url,alt_text,region_key,related_stop_key,image_type,usage_role,mood_tags,occasion_tags,priority_score,is_active,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { images: data ?? [] };
  });

/* ─────────────────────────────  PUBLIC  ───────────────────────────── */

export interface BuilderImage {
  id: string;
  image_url: string;
  alt_text: string;
  region_key: string | null;
  related_stop_key: string | null;
  image_type: string;
  usage_role: string;
  mood_tags: string[];
  occasion_tags: string[];
  priority_score: number;
}

const PickRouteSchema = z.object({
  regionKey: z.string().min(1).max(40),
  stopKeys: z.array(z.string().min(1).max(80)).min(1).max(12),
  mood: z.string().min(1).max(40).optional(),
  occasion: z.string().min(1).max(40).optional(),
});

/**
 * Public selector — returns:
 *   - heroImage: the strongest image for the first stop / region
 *   - stopImages: one image per stop key (best-match by tags + priority)
 *   - storyImage: highest-priority image matching the mood for this region
 *   - reviewThumbs: up to 3 thumbnails (one per stop) for the review screen
 *
 * Falls back gracefully: if no DB image exists for a stop, the field is null
 * and the UI shows the existing brand asset / placeholder.
 */
export const pickImagesForRoute = createServerFn({ method: "POST" })
  .inputValidator((d) => PickRouteSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: imgs, error } = await supabaseAdmin
      .from("experience_images")
      .select(
        "id,image_url,alt_text,region_key,related_stop_key,image_type,usage_role,mood_tags,occasion_tags,priority_score",
      )
      .eq("is_active", true)
      .or(
        `region_key.eq.${data.regionKey},related_stop_key.in.(${data.stopKeys.map((k) => `"${k}"`).join(",")})`,
      )
      .order("priority_score", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    const all = (imgs ?? []) as BuilderImage[];

    // Per-stop best image
    const stopImages: Record<string, BuilderImage | null> = {};
    for (const key of data.stopKeys) {
      const candidates = all.filter((i) => i.related_stop_key === key);
      stopImages[key] = pickBest(candidates, data.mood, data.occasion) ?? null;
    }

    // Hero — prefer first stop image, else region image
    const firstStopKey = data.stopKeys[0];
    const hero =
      stopImages[firstStopKey] ??
      pickBest(
        all.filter((i) => i.region_key === data.regionKey && !i.related_stop_key),
        data.mood,
        data.occasion,
      ) ??
      null;

    // Story image — prefer mood match within region, fall back to any region image
    const storyPool = all.filter(
      (i) =>
        i.region_key === data.regionKey &&
        (data.mood ? i.mood_tags.includes(data.mood) : true),
    );
    const storyImage = pickBest(storyPool, data.mood, data.occasion) ?? hero;

    // Up to 3 review thumbs — one per stop, in route order
    const reviewThumbs = data.stopKeys
      .map((k) => stopImages[k])
      .filter((i): i is BuilderImage => Boolean(i))
      .slice(0, 3);

    return {
      hero,
      stopImages,
      storyImage,
      reviewThumbs,
    };
  });

function pickBest(
  pool: BuilderImage[],
  mood?: string,
  occasion?: string,
): BuilderImage | null {
  if (pool.length === 0) return null;
  const scored = pool.map((img) => {
    let bonus = 0;
    if (mood && img.mood_tags.includes(mood)) bonus += 30;
    if (occasion && img.occasion_tags.includes(occasion)) bonus += 20;
    return { img, score: img.priority_score + bonus };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].img;
}

/* ──────────  Mood card backgrounds (one per mood, region-agnostic)  ────────── */

const MoodImagesSchema = z.object({
  moods: z.array(z.string().min(1).max(40)).min(1).max(12),
});

/**
 * Returns the best `usage_role = 'builder_mood'` image per mood.
 * If no DB row matches a mood, that mood is omitted — the UI falls back
 * to the static brand asset.
 */
export const pickMoodCardImages = createServerFn({ method: "POST" })
  .inputValidator((d) => MoodImagesSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: imgs, error } = await supabaseAdmin
      .from("experience_images")
      .select(
        "image_url,alt_text,mood_tags,priority_score,usage_role,related_stop_key,region_key",
      )
      .eq("is_active", true)
      .overlaps("mood_tags", data.moods)
      .order("priority_score", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);

    const out: Record<string, { image_url: string; alt_text: string } | null> = {};
    for (const mood of data.moods) {
      // Prefer images explicitly marked as builder_mood, else any with the tag.
      const tagged = (imgs ?? []).filter((i) =>
        (i.mood_tags as string[]).includes(mood),
      );
      const best =
        tagged.find((i) => i.usage_role === "builder_mood") ?? tagged[0] ?? null;
      out[mood] = best
        ? { image_url: best.image_url as string, alt_text: best.alt_text as string }
        : null;
    }
    return { moodImages: out };
  });
