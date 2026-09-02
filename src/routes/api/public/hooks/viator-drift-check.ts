import { createFileRoute } from "@tanstack/react-router";
import { SIGNATURE_SOURCE_OF_TRUTH, canonicalViatorUrl } from "@/data/signatureToursSourceOfTruth";

// Weekly Viator drift detector.
// - Scrapes each canonical Viator URL via Firecrawl (direct API mode).
// - Diffs "What's included" against the SoT `included` list.
// - Persists a report to `viator_drift_reports` (admin-read).
// - Emails an internal alert when any tour drifts.
// - NEVER mutates src/data/signatureToursSourceOfTruth.ts.

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface ScrapeResult {
  markdown: string | null;
  error?: string;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const data = (await res.json().catch(() => null)) as {
      markdown?: string;
      data?: { markdown?: string };
      error?: string;
    } | null;
    if (!res.ok) return { markdown: null, error: data?.error ?? `HTTP ${res.status}` };
    const md = data?.markdown ?? data?.data?.markdown ?? null;
    return { markdown: md };
  } catch (e) {
    return { markdown: null, error: e instanceof Error ? e.message : String(e) };
  }
}

const INCLUDED_HEADERS = [
  /^#{1,6}\s*what[’']?s?\s+included/i,
  /^#{1,6}\s*inclusions?/i,
  /^\*\*\s*what[’']?s?\s+included/i,
];
const STOP_HEADERS = [
  /^#{1,6}\s+/,
  /^\*\*\s*(what[’']?s?\s+not\s+included|not\s+included|meeting|departure|itinerary|additional|cancellation|expect|highlights)/i,
];

/** Extract bullet lines from the "What's included" section of a Viator markdown page. */
function extractIncluded(markdown: string): string[] {
  const lines = markdown.split("\n");
  let inSection = false;
  const bullets: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!inSection) {
      if (INCLUDED_HEADERS.some((r) => r.test(line))) {
        inSection = true;
      }
      continue;
    }
    // Stop at next header/section
    if (line && STOP_HEADERS.some((r) => r.test(line))) break;
    const m = line.match(/^[-*•]\s+(.+?)\s*$/);
    if (m) bullets.push(m[1].replace(/\*+/g, "").trim());
  }
  return dedupe(bullets);
}

function extractPriceFrom(markdown: string): string | null {
  const m = markdown.match(/(?:from|a partir de)\s*(?:us)?\$\s?([\d,.]+)|€\s?([\d,.]+)/i);
  if (!m) return null;
  return m[0];
}

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase().replace(/\s+/g, " ").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:()"'’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function diffIncluded(sot: string[], scraped: string[]) {
  const sotSet = new Set(sot.map(normalizeForCompare));
  const scrapedSet = new Set(scraped.map(normalizeForCompare));
  const addedOnViator = scraped.filter((x) => !sotSet.has(normalizeForCompare(x)));
  const removedOnViator = sot.filter((x) => !scrapedSet.has(normalizeForCompare(x)));
  return { addedOnViator, removedOnViator };
}

export const Route = createFileRoute("/api/public/hooks/viator-drift-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Server-only secret gate. The previous apikey check compared against
        // the Supabase publishable key, which ships in the client bundle and
        // blocks nobody — anyone could trigger paid Firecrawl scrapes. Use the
        // shared internal cron secret instead (same as import-tripadvisor-reviews).
        const secret = process.env.EMAIL_INTERNAL_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "not_configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const auth = request.headers.get("authorization") || "";
        const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const ok = (() => {
          if (!provided || provided.length !== secret.length) return false;
          let mismatch = 0;
          for (let i = 0; i < provided.length; i++) {
            mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
          }
          return mismatch === 0;
        })();
        if (!ok) {
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

        const tourIds = Object.keys(SIGNATURE_SOURCE_OF_TRUTH);
        const perTour: Array<{
          tourId: string;
          title: string;
          url: string;
          scraped: number;
          error?: string;
          addedOnViator: string[];
          removedOnViator: string[];
          priceFromViator: string | null;
        }> = [];
        let scrapeErrors = 0;

        for (const tourId of tourIds) {
          const sot = SIGNATURE_SOURCE_OF_TRUTH[tourId];
          if (!sot) continue;
          const url = sot.viatorUrl ?? canonicalViatorUrl(tourId);
          if (!url) continue;
          const { markdown, error } = await firecrawlScrape(url, firecrawlKey);
          if (!markdown) {
            scrapeErrors += 1;
            perTour.push({
              tourId,
              title: sot.title,
              url,
              scraped: 0,
              error: error ?? "empty markdown",
              addedOnViator: [],
              removedOnViator: [],
              priceFromViator: null,
            });
            continue;
          }
          const scraped = extractIncluded(markdown);
          if (scraped.length === 0) {
            // Firecrawl returned content but our extractor found no inclusions —
            // count as a scrape error rather than false-positive drift.
            scrapeErrors += 1;
            perTour.push({
              tourId,
              title: sot.title,
              url,
              scraped: 0,
              error: "no included section parsed",
              addedOnViator: [],
              removedOnViator: [],
              priceFromViator: extractPriceFrom(markdown),
            });
            continue;
          }
          const { addedOnViator, removedOnViator } = diffIncluded(sot.included, scraped);
          perTour.push({
            tourId,
            title: sot.title,
            url,
            scraped: scraped.length,
            addedOnViator,
            removedOnViator,
            priceFromViator: extractPriceFrom(markdown),
          });
        }

        const drifted = perTour.filter(
          (r) => r.addedOnViator.length > 0 || r.removedOnViator.length > 0,
        );

        const runAt = new Date().toISOString();
        const report = {
          runAt,
          toursChecked: perTour.length,
          toursWithDrift: drifted.length,
          scrapeErrors,
          tours: perTour,
        };

        // Persist (admin-only reads via RLS; write is service_role).
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("viator_drift_reports").insert({
            run_at: runAt,
            tours_checked: perTour.length,
            tours_with_drift: drifted.length,
            scrape_errors: scrapeErrors,
            report,
          });
        } catch (e) {
          console.error("[viator-drift-check] persist failed", e);
        }

        // Email only when there is real drift (avoid weekly noise).
        if (drifted.length > 0) {
          try {
            const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
            await sendTransactionalInternal({
              templateName: "viator-drift-alert",
              recipientEmail: "info@yesexperiencesportugal.com",
              templateData: {
                runAt,
                toursChecked: perTour.length,
                toursWithDrift: drifted.length,
                scrapeErrors,
                items: drifted.map((d) => ({
                  tourId: d.tourId,
                  title: d.title,
                  addedOnViator: d.addedOnViator,
                  removedOnViator: d.removedOnViator,
                  priceFromViator: d.priceFromViator,
                })),
              },
              idempotencyKey: `viator-drift-${runAt.slice(0, 10)}`,
            });
          } catch (e) {
            console.error("[viator-drift-check] email failed", e);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            runAt,
            toursChecked: perTour.length,
            toursWithDrift: drifted.length,
            scrapeErrors,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
