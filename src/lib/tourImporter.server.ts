/**
 * Server-only logic for the Tour Importer.
 * - Scrapes the YES experiences catalog page
 * - Calls Lovable AI Gateway to map each tour to builder ids
 * - Snaps stops to curated coordinates
 * - Upserts into public.imported_tours
 *
 * Never import this file from client code.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { REGION_CENTROIDS } from "@/data/stopCoords";
import { applyRules } from "@/server/applyMappingRules.server";
import { DEFAULT_MAPPING_RULES, safeParseRules, type MappingRules } from "@/data/defaultMappingRules";

const CATALOG_URL = "https://yesexperiences.pt/our-experiences/";
const AI_MODEL = "google/gemini-3-flash-preview";

const VALID_REGIONS = ["lisbon", "porto", "alentejo", "algarve"] as const;
const VALID_DURATIONS = ["halfday", "fullday", "twoday", "threeday", "week"] as const;
const VALID_STYLES = ["wine", "gastronomy", "nature", "heritage", "coastal"] as const;
const VALID_HIGHLIGHTS = [
  "livramento", "boat", "jeep", "tiles", "cheese", "tasting",
  "portinho", "sesimbra", "viewpoint", "dinosaur", "ginjinha",
] as const;
const VALID_PACE = ["slow", "balanced", "rich"] as const;
const VALID_TIERS = ["signature", "atelier", "couture"] as const;

export type ScrapedTour = {
  id: string;
  title: string;
  url: string;
  durationText: string;
  priceFrom: number;
  imageUrl: string | null;
};

export type ImportedTour = {
  id: string;
  title: string;
  source_url: string;
  region: string;
  region_label: string;
  duration: string;
  duration_label: string;
  duration_hours: string;
  price_from: number;
  theme: string;
  styles: string[];
  highlights: string[];
  pace: string;
  tier: string;
  fits_best: string;
  pace_cues: string[];
  blurb: string;
  image_url: string | null;
  stops: { label: string; tag: string; x: number; y: number }[];
  ai_model: string;
};

export type ImportResult = {
  status: "success" | "partial" | "failed";
  toursImported: number;
  toursFailed: number;
  errors: string[];
  tours: ImportedTour[];
};

/* -------------------- Scrape -------------------- */

function slugFromUrl(url: string): string {
  const m = url.match(/\/tour\/([^/?#]+)/);
  return (m?.[1] ?? url).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function scrapeCatalog(): Promise<ScrapedTour[]> {
  const res = await fetch(CATALOG_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YesExperiencesImporter/1.0; +https://yesexperiences.pt)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const html = await res.text();

  // Each tour card contains a heading link to /tour/<slug>/
  // Pattern: <h3 ...><a href="https://yesexperiences.pt/tour/<slug>/">Title</a></h3>
  // Also capture nearby image + duration + price by walking forward in the HTML.
  const tours = new Map<string, ScrapedTour>();
  const cardRe =
    /<a[^>]+href="(https:\/\/yesexperiences\.pt\/tour\/[^"]+)"[^>]*>\s*<\/a>\s*<h3[^>]*>\s*<a[^>]+href="\1"[^>]*>([^<]+)<\/a>\s*<\/h3>([\s\S]{0,1200}?)(?=<a[^>]+href="https:\/\/yesexperiences\.pt\/tour\/|$)/g;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null) {
    const url = m[1];
    const title = decode(m[2]).trim();
    const block = m[3];
    const id = slugFromUrl(url);
    if (tours.has(id)) continue;

    const durationText =
      block.match(/(\d{1,2}\s*(?:to|-|–|-)\s*\d{1,2}\s*hours?[^<]*)/i)?.[1] ??
      block.match(/(\d{1,2}\s*hours?[^<]*)/i)?.[1] ??
      block.match(/(\d+\s*days?)/i)?.[1] ??
      "";
    const price =
      Number(block.match(/From\s*€\s*([\d.,]+)/i)?.[1]?.replace(/[.,]/g, "")) || 0;
    // Look in a wider window before AND after the heading; cards put the image
    // either above the title (preview thumb) or in the link wrapper.
    const window = html.substring(
      Math.max(0, m.index - 2000),
      Math.min(html.length, m.index + (m[0]?.length ?? 0) + 1500),
    );
    const imgRe = /(?:data-lazy-src|data-src|src)="(https:\/\/yesexperiences\.pt\/wp-content\/uploads\/[^"]+\.(?:avif|jpg|jpeg|png|webp))"/gi;
    let imageUrl: string | null = null;
    let im: RegExpExecArray | null;
    while ((im = imgRe.exec(window)) !== null) {
      const candidate = im[1];
      // Skip tiny placeholder/spacer images
      if (/[-_](?:1x1|placeholder|spacer)\./i.test(candidate)) continue;
      imageUrl = candidate;
      break;
    }
    // Fallback: try srcset (take the largest entry)
    if (!imageUrl) {
      const srcset = window.match(/srcset="([^"]+yesexperiences\.pt\/wp-content\/uploads\/[^"]+)"/i)?.[1];
      if (srcset) {
        const entries = srcset.split(",").map((s) => s.trim().split(/\s+/));
        const best = entries.sort((a, b) => (parseInt(b[1] ?? "0") || 0) - (parseInt(a[1] ?? "0") || 0))[0];
        imageUrl = best?.[0] ?? null;
      }
    }

    tours.set(id, {
      id,
      title,
      url,
      durationText: decode(durationText).trim(),
      priceFrom: price,
      imageUrl,
    });
  }
  return Array.from(tours.values());
}

/* -------------------- AI mapping -------------------- */

const MAPPER_SYSTEM = `You map private tour listings from yesexperiences.pt onto a fixed taxonomy used by a journey builder UI.

Return STRICT JSON only via the tool call. Choose values ONLY from the allowed lists below.

regions: ${VALID_REGIONS.join(", ")}
durations: ${VALID_DURATIONS.join(", ")}   (halfday=≤4h, fullday=8–10h, twoday=2 days, threeday=3 days, week=5–7 days)
styles: ${VALID_STYLES.join(", ")}        (pick 1–3)
highlights: ${VALID_HIGHLIGHTS.join(", ")} (pick 1–5 ingredients actually present in the tour title/blurb)
pace: ${VALID_PACE.join(", ")}
tier: ${VALID_TIERS.join(", ")}            (signature=standard, atelier=premium/multi-day, couture=ultra-bespoke)

Region rules:
- Tours from Lisbon to Arrábida/Sesimbra/Setúbal/Azeitão/Sintra/Cascais → "lisbon"
- Tours to Évora/Alentejo/Tomar/Coimbra/Fátima/Nazaré/Óbidos/Comporta → "alentejo"
- Tours to Douro/Porto/Braga/Guimarães → "porto"
- Tours to Algarve/Benagil/Vicentine coast → "algarve"

Also produce:
- theme: one of Wine, Coastal, Gastronomy, Nature, Heritage
- fitsBest: 4–8 word audience description ("Couples · families · slow travelers")
- paceCues: 3 short noun phrases (≤3 words each) summarising the day arc
- blurb: 1–2 sentence editorial line in calm, refined voice
- stops: 3–6 real Portuguese place names visited on this tour (e.g. "Setúbal", "Azeitão", "Sesimbra", "Portinho da Arrábida"). Use the exact common spelling.`;

const MAPPER_TOOL = {
  type: "function" as const,
  function: {
    name: "map_tour",
    description: "Map a YES experiences tour onto the builder taxonomy.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", enum: [...VALID_REGIONS] },
        duration: { type: "string", enum: [...VALID_DURATIONS] },
        styles: {
          type: "array",
          items: { type: "string", enum: [...VALID_STYLES] },
          minItems: 1,
          maxItems: 3,
        },
        highlights: {
          type: "array",
          items: { type: "string", enum: [...VALID_HIGHLIGHTS] },
          maxItems: 5,
        },
        pace: { type: "string", enum: [...VALID_PACE] },
        tier: { type: "string", enum: [...VALID_TIERS] },
        theme: {
          type: "string",
          enum: ["Wine", "Coastal", "Gastronomy", "Nature", "Heritage"],
        },
        fitsBest: { type: "string" },
        paceCues: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
        blurb: { type: "string" },
        stops: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
        },
      },
      required: [
        "region", "duration", "styles", "highlights", "pace", "tier",
        "theme", "fitsBest", "paceCues", "blurb", "stops",
      ],
      additionalProperties: false,
    },
  },
};

type MapperOutput = {
  region: typeof VALID_REGIONS[number];
  duration: typeof VALID_DURATIONS[number];
  styles: string[];
  highlights: string[];
  pace: typeof VALID_PACE[number];
  tier: typeof VALID_TIERS[number];
  theme: string;
  fitsBest: string;
  paceCues: string[];
  blurb: string;
  stops: string[];
};

async function mapWithAI(tour: ScrapedTour): Promise<MapperOutput> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const userMsg = `Title: ${tour.title}
Duration text from site: ${tour.durationText || "(missing)"}
Price from: €${tour.priceFrom || "?"}
Source URL: ${tour.url}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: MAPPER_SYSTEM },
        { role: "user", content: userMsg },
      ],
      tools: [MAPPER_TOOL],
      tool_choice: { type: "function", function: { name: "map_tour" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded — try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted — top up in workspace settings.");
    throw new Error(`AI mapping failed [${res.status}]: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error("AI returned no tool call arguments");
  return JSON.parse(argsStr) as MapperOutput;
}

/* -------------------- Build + persist -------------------- */

const DURATION_LABELS: Record<string, { label: string; hoursFallback: string }> = {
  halfday: { label: "Half Day", hoursFallback: "4h" },
  fullday: { label: "Full Day", hoursFallback: "8–9h" },
  twoday: { label: "2 Days", hoursFallback: "2 days" },
  threeday: { label: "3 Days", hoursFallback: "3 days" },
  week: { label: "5–7 Days", hoursFallback: "5–7 days" },
};

function durationHoursDisplay(scraped: string, durationId: string): string {
  if (scraped) {
    return scraped
      .replace(/\s*\(approx\.?\)/i, "")
      .replace(/\s*hours?/i, "h")
      .replace(/\s+/g, " ")
      .trim();
  }
  return DURATION_LABELS[durationId]?.hoursFallback ?? "";
}

async function loadActiveRules(): Promise<MappingRules> {
  const { data, error } = await supabaseAdmin
    .from("import_mapping_rules")
    .select("rules")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_MAPPING_RULES;
  return safeParseRules(data.rules);
}

export async function importAllTours(opts: { ranBy: string | null }): Promise<ImportResult> {
  const errors: string[] = [];
  const tours: ImportedTour[] = [];
  let failed = 0;

  const activeRules = await loadActiveRules();

  let scraped: ScrapedTour[];
  try {
    scraped = await scrapeCatalog();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("import_runs").insert({
      ran_by: opts.ranBy,
      status: "failed",
      tours_imported: 0,
      tours_failed: 0,
      error: msg,
    });
    return { status: "failed", toursImported: 0, toursFailed: 0, errors: [msg], tours: [] };
  }

  if (scraped.length === 0) {
    const msg = "Scraper found no tours — site layout may have changed.";
    await supabaseAdmin.from("import_runs").insert({
      ran_by: opts.ranBy,
      status: "failed",
      tours_imported: 0,
      tours_failed: 0,
      error: msg,
    });
    return { status: "failed", toursImported: 0, toursFailed: 0, errors: [msg], tours: [] };
  }

  for (const t of scraped) {
    try {
      const ai = await mapWithAI(t);

      const applied = applyRules(
        activeRules,
        { title: t.title, durationText: t.durationText, url: t.url, priceFrom: t.priceFrom },
        { region: ai.region, duration: ai.duration, highlights: ai.highlights, stops: ai.stops },
      );

      const stops = applied.stops.map((c) => ({
        label: c.label,
        tag: c.tag,
        x: c.x,
        y: c.y,
      }));

      // Prefer the rule-derived durationHours if it parses as something usable;
      // otherwise fall back to the curated display string.
      const durationHours =
        applied.durationHours && applied.durationHours.trim().length > 0
          ? durationHoursDisplay(applied.durationHours, applied.duration)
          : durationHoursDisplay(t.durationText, applied.duration);

      const row: ImportedTour = {
        id: t.id,
        title: t.title,
        source_url: t.url,
        region: applied.region,
        region_label: REGION_CENTROIDS[applied.region]?.label ?? applied.region,
        duration: applied.duration,
        duration_label: DURATION_LABELS[applied.duration]?.label ?? applied.duration,
        duration_hours: durationHours,
        price_from: t.priceFrom,
        theme: ai.theme,
        styles: ai.styles,
        highlights: applied.signatureMoments.length ? applied.signatureMoments : ai.highlights,
        pace: ai.pace,
        tier: ai.tier,
        fits_best: ai.fitsBest,
        pace_cues: ai.paceCues,
        blurb: ai.blurb,
        image_url: t.imageUrl,
        stops,
        ai_model: AI_MODEL,
      };
      tours.push(row);
    } catch (e) {
      failed += 1;
      errors.push(`${t.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Tiny delay to ease rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  if (tours.length > 0) {
    const { error: upsertErr } = await supabaseAdmin
      .from("imported_tours")
      .upsert(tours, { onConflict: "id" });
    if (upsertErr) {
      const msg = `DB upsert failed: ${upsertErr.message}`;
      errors.push(msg);
      await supabaseAdmin.from("import_runs").insert({
        ran_by: opts.ranBy,
        status: "failed",
        tours_imported: 0,
        tours_failed: scraped.length,
        error: msg,
      });
      return {
        status: "failed",
        toursImported: 0,
        toursFailed: scraped.length,
        errors,
        tours: [],
      };
    }
  }

  const status: ImportResult["status"] =
    failed === 0 ? "success" : tours.length === 0 ? "failed" : "partial";

  await supabaseAdmin.from("import_runs").insert({
    ran_by: opts.ranBy,
    status,
    tours_imported: tours.length,
    tours_failed: failed,
    error: errors.length ? errors.slice(0, 5).join(" | ") : null,
  });

  return {
    status,
    toursImported: tours.length,
    toursFailed: failed,
    errors,
    tours,
  };
}
