/**
 * Server-only helpers for the Experience Builder image library.
 *
 * Sources real images from Viator tour pages via Firecrawl, normalizes them,
 * and writes them to public.experience_images with proper alt text and tags.
 *
 * Never used in browser bundles.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

type FirecrawlScrapeResult = {
  success?: boolean;
  data?: {
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      "og:image"?: string;
      sourceURL?: string;
    };
    html?: string;
    links?: string[];
  };
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    "og:image"?: string;
  };
  html?: string;
  links?: string[];
};

const VIATOR_IMG_RE =
  /https?:\/\/[^"'\s]*?(?:viator|tripadvisor|cloudfront)[^"'\s]*?\.(?:jpe?g|png|webp)(?:\?[^"'\s]*)?/gi;

/** Extracts likely tour photo URLs from a Viator page's raw HTML. */
export function extractImageUrlsFromHtml(html: string): string[] {
  const matches = html.match(VIATOR_IMG_RE) ?? [];
  // De-dupe, drop tiny thumbnails (Viator uses /__small/ /__thumb/ paths).
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const url = raw.replace(/&amp;/g, "&");
    if (seen.has(url)) continue;
    if (/(?:small|thumb|icon|logo|sprite|avatar)/i.test(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["html", "links"],
      onlyMainContent: false,
      waitFor: 1500,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Firecrawl scrape failed [${res.status}]: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as FirecrawlScrapeResult;
}

export interface ScrapeViatorImagesArgs {
  viatorUrl: string;
  /** builder_stops.key — required; every image is tied to a real stop. */
  stopKey: string;
  /** builder_regions.key — falls back to stop's region if omitted. */
  regionKey?: string;
  imageType?: string;
  usageRole?: string;
  moodTags?: string[];
  occasionTags?: string[];
  /** Caps how many of the page's photos to keep (sorted by appearance). */
  maxImages?: number;
}

export interface ScrapeViatorImagesResult {
  scrapedFrom: string;
  found: number;
  inserted: number;
  skipped: number;
  errors: string[];
  rows: { image_url: string; alt_text: string }[];
}

/**
 * Scrape a Viator tour page and persist its real photos to experience_images,
 * tagged for a specific builder stop. Idempotent — duplicates by image_url
 * are skipped at the unique constraint, not raised as errors.
 */
export async function scrapeViatorImagesForStop(
  args: ScrapeViatorImagesArgs,
): Promise<ScrapeViatorImagesResult> {
  const max = Math.max(1, Math.min(args.maxImages ?? 8, 20));
  const out: ScrapeViatorImagesResult = {
    scrapedFrom: args.viatorUrl,
    found: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
    rows: [],
  };

  // Resolve region from the stop if not provided.
  let regionKey = args.regionKey ?? null;
  let stopLabel = "";
  {
    const { data, error } = await supabaseAdmin
      .from("builder_stops")
      .select("region_key,label")
      .eq("key", args.stopKey)
      .maybeSingle();
    if (error) throw new Error(`Stop lookup failed: ${error.message}`);
    if (!data) throw new Error(`Unknown stop_key: ${args.stopKey}`);
    regionKey = regionKey ?? (data.region_key as string);
    stopLabel = data.label as string;
  }

  const scraped = await firecrawlScrape(args.viatorUrl);
  const html = scraped.data?.html ?? scraped.html ?? "";
  const ogImage =
    scraped.data?.metadata?.ogImage ??
    scraped.data?.metadata?.["og:image"] ??
    scraped.metadata?.ogImage ??
    scraped.metadata?.["og:image"] ??
    null;

  const urls: string[] = [];
  if (ogImage) urls.push(ogImage);
  for (const u of extractImageUrlsFromHtml(html)) {
    if (urls.includes(u)) continue;
    urls.push(u);
    if (urls.length >= max) break;
  }
  out.found = urls.length;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const alt = `${stopLabel} during a real Portugal experience`;
    const row = {
      image_url: url,
      source_url: args.viatorUrl,
      title: stopLabel,
      alt_text: alt,
      region_key: regionKey,
      related_stop_key: args.stopKey,
      related_tour_id: null as string | null,
      image_type: args.imageType ?? "landscape",
      usage_role: args.usageRole ?? (i === 0 ? "stop_preview" : "gallery"),
      mood_tags: args.moodTags ?? [],
      occasion_tags: args.occasionTags ?? [],
      priority_score: i === 0 ? 90 : Math.max(40, 80 - i * 5),
      is_active: true,
    };

    const { error } = await supabaseAdmin
      .from("experience_images")
      .insert(row);
    if (error) {
      // Unique-violation = already in library; treat as skipped, not failure.
      if (/duplicate key|unique constraint/i.test(error.message)) {
        out.skipped++;
      } else {
        out.errors.push(`${url.slice(0, 60)}…: ${error.message}`);
      }
      continue;
    }
    out.inserted++;
    out.rows.push({ image_url: url, alt_text: alt });
  }

  return out;
}
