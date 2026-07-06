/**
 * Scheduled Tripadvisor review import.
 *
 * Scrapes the operator's public Tripadvisor page (first two pages of
 * reviews), extracts real 5★ reviews, and inserts new ones into
 * `tour_reviews` as featured + published + approved. Duplicate protection
 * is by `(source='tripadvisor', external_id)`; we skip external_ids
 * already present in the DB.
 *
 * Called by pg_cron once a day. The `/api/public/*` prefix bypasses auth
 * at the edge; we still gate writes by requiring the Supabase publishable
 * `apikey` header so random callers can't trigger a scrape.
 *
 * No invention: only rows with a real reviewer name, real body ≥ 40
 * chars, real rating parsed from Tripadvisor's own bubble label, and a
 * real Tripadvisor review URL are inserted. Anything that doesn't parse
 * cleanly is skipped, not fabricated.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TA_URL_PAGE_1 =
  "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html";
const TA_URL_PAGE_2 =
  "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-or10-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html";

/** Map Tripadvisor product IDs (e.g. `d24072186`) to our signature tour slugs. */
const PRODUCT_TO_TOUR: Record<string, string> = {
  d24072057: "wild-beaches-picnic",
  d24072186: "arrabida-wine-allinclusive",
  d25127181: "tiles-workshop",
  d27139444: "azeitao-cheese",
  d34324410: "troia-comporta",
};
const FALLBACK_TOUR_ID = "arrabida-wine-allinclusive";

type ParsedReview = {
  external_id: string;
  reviewer_name: string;
  reviewer_country: string | null;
  rating: number;
  title: string | null;
  body: string;
  source_url: string;
  tour_id: string;
};

function parseReviews(markdown: string): ParsedReview[] {
  const out: ParsedReview[] = [];
  const anchor = markdown.indexOf("These reviews have been automatically translated");
  const body = anchor > 0 ? markdown.slice(anchor) : markdown;
  // Reviews are separated by lines containing only `* * *`.
  const blocks = body.split(/\n\s*\* \* \*\s*\n/);

  for (const block of blocks) {
    // A review block always contains a `X of 5 bubbles` marker followed
    // by a `### [Title](.../ShowUserReviews-...-r{id}-...html)` heading.
    const ratingMatch = block.match(/(\d)\s+of\s+5\s+bubbles/);
    const titleMatch = block.match(
      /###\s*\[([^\]]+)\]\((https:\/\/www\.tripadvisor\.com\/ShowUserReviews-[^)]+-r(\d+)-[^)]+)\)/,
    );
    if (!ratingMatch || !titleMatch) continue;

    const rating = Number(ratingMatch[1]);
    if (rating < 5) continue; // 5★ only

    const title = titleMatch[1].trim();
    const source_url = titleMatch[2];
    const external_id = `ta_r${titleMatch[3]}`;

    // Reviewer name: the last `[Name](.../Profile/...)` before the title.
    const profileMatches = [
      ...block.matchAll(/\[([^\]]+)\]\(https:\/\/www\.tripadvisor\.com\/Profile\/[^)]+\)/g),
    ];
    const reviewerLink = profileMatches.find((m) => m[1] !== "Yes!experiences Portugal");
    if (!reviewerLink) continue;
    const reviewer_name = reviewerLink[1].trim();

    // Country line follows the reviewer link, format:
    //   "New York, New York22 contributions" or "22 contributions"
    // We only extract when a comma-separated location precedes "N contributions".
    let reviewer_country: string | null = null;
    const nameIdx = block.indexOf(reviewerLink[0]);
    const after = block.slice(
      nameIdx + reviewerLink[0].length,
      nameIdx + reviewerLink[0].length + 400,
    );
    const countryMatch = after.match(
      /\n\s*([A-Z][A-Za-z .'-]+(?:,\s*[A-Za-z .'-]+)?)\d+\s+contributions/,
    );
    if (countryMatch) reviewer_country = countryMatch[1].trim();

    // Body: everything after the title line up to a "Read more" marker,
    // skipping the date/group line ("May 2026 • Couples").
    const titleIdx = block.indexOf(titleMatch[0]);
    const afterTitle = block.slice(titleIdx + titleMatch[0].length);
    const readMoreIdx = afterTitle.indexOf("Read more");
    const raw = readMoreIdx > 0 ? afterTitle.slice(0, readMoreIdx) : afterTitle;
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // drop the date/group line like "Jun 2026 • Couples"
      .filter((l) => !/^[A-Z][a-z]{2}\s+\d{4}(\s+•.*)?$/.test(l));
    const bodyText = lines.join(" ").replace(/\s+/g, " ").trim();
    if (bodyText.length < 40 || bodyText.length > 3900) continue;

    // Tour mapping: pull the `d\d+` from the review URL.
    const productMatch = source_url.match(/-d(\d+)-/);
    const productKey = productMatch ? `d${productMatch[1]}` : "";
    const tour_id = PRODUCT_TO_TOUR[productKey] ?? FALLBACK_TOUR_ID;

    out.push({
      external_id,
      reviewer_name,
      reviewer_country,
      rating,
      title,
      body: bodyText,
      source_url,
      tour_id,
    });
  }
  return out;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`firecrawl ${res.status}`);
  const json = (await res.json()) as { data?: { markdown?: string } };
  return json.data?.markdown ?? "";
}

export const Route = createFileRoute("/api/public/hooks/import-tripadvisor-reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Simple gate — require the Supabase publishable key so random
        // callers on the internet can't kick off scraping runs.
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlKey) {
          return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Scrape the first two pages of reviews.
        let parsed: ParsedReview[] = [];
        try {
          const [md1, md2] = await Promise.all([
            firecrawlScrape(TA_URL_PAGE_1, firecrawlKey),
            firecrawlScrape(TA_URL_PAGE_2, firecrawlKey),
          ]);
          parsed = [...parseReviews(md1), ...parseReviews(md2)];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error: `scrape_failed: ${msg}` }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (parsed.length === 0) {
          return Response.json({ ok: true, parsed: 0, inserted: 0 });
        }

        // De-dupe against existing external_ids. Use service role (server
        // only) so we can both read and insert reliably regardless of
        // policy scope.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as ReturnType<typeof createClient<Database>>;

        const externalIds = parsed.map((p) => p.external_id);
        const { data: existing, error: existingErr } = await admin
          .from("tour_reviews")
          .select("external_id")
          .eq("source", "tripadvisor")
          .in("external_id", externalIds);
        if (existingErr) {
          return new Response(JSON.stringify({ error: `dedupe_failed: ${existingErr.message}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const seen = new Set((existing ?? []).map((r) => r.external_id));
        const fresh = parsed.filter((p) => !seen.has(p.external_id));

        if (fresh.length === 0) {
          return Response.json({ ok: true, parsed: parsed.length, inserted: 0 });
        }

        const rows = fresh.map((r) => ({
          tour_id: r.tour_id,
          source: "tripadvisor",
          rating: r.rating,
          title: r.title,
          body: r.body,
          reviewer_name: r.reviewer_name,
          reviewer_country: r.reviewer_country,
          source_url: r.source_url,
          is_first_party: false,
          verified: true,
          published_at: new Date().toISOString(),
          is_featured: true,
          is_published: true,
          moderation_status: "approved",
          moderated_at: new Date().toISOString(),
          language: "en",
          external_id: r.external_id,
        }));

        const { data: inserted, error: insertErr } = await admin
          .from("tour_reviews")
          .insert(rows)
          .select("id");
        if (insertErr) {
          return new Response(JSON.stringify({ error: `insert_failed: ${insertErr.message}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Rotate featured flag: keep only the 8 newest 5★ published reviews
        // as featured so the homepage carousel stays fresh and consistent.
        const FEATURED_CAP = 8;
        const { data: topRows } = await admin
          .from("tour_reviews")
          .select("id")
          .eq("is_published", true)
          .gte("rating", 5)
          .order("published_at", { ascending: false })
          .limit(FEATURED_CAP);
        const keepIds = (topRows ?? []).map((r) => r.id);
        if (keepIds.length > 0) {
          await admin
            .from("tour_reviews")
            .update({ is_featured: false })
            .eq("is_featured", true)
            .not("id", "in", `(${keepIds.join(",")})`);
          await admin.from("tour_reviews").update({ is_featured: true }).in("id", keepIds);
        }

        return Response.json({
          ok: true,
          parsed: parsed.length,
          inserted: inserted?.length ?? 0,
          featured: keepIds.length,
        });
      },
    },
  },
});
