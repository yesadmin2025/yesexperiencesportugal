import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Google Search Console integration for the redirects/404 monitor.
 *
 * Uses the Lovable connector gateway (no provider SDK). The gateway
 * forwards the workspace's OAuth token, so we only need the two env
 * vars `LOVABLE_API_KEY` and `GOOGLE_SEARCH_CONSOLE_API_KEY` (the
 * latter is the gateway connection key, not a Google API key).
 *
 * Note on "Cobertura" and "Remoções": Google does NOT expose a bulk
 * Coverage list or a Removals list via the public API. The real
 * signals we can pull are:
 *   1. URL Inspection (`/v1/urlInspection/index:inspect`) — per-URL
 *      coverageState, indexingState, lastCrawlTime, canonical, etc.
 *      This is what powers "Cobertura" for a single URL.
 *   2. Search Analytics (`/webmasters/v3/sites/.../searchAnalytics/query`)
 *      — top pages with impressions, so we can spot if Google is still
 *      surfacing old URLs.
 * Removals are write-only via the Search Console UI; we link out to
 * the Removals tab and correlate inspected URLs with our local
 * redirect probe.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_URL = "https://yesexperiencesportugal.com/";

type GscHeaders = { Authorization: string; "X-Connection-Api-Key": string };

async function assertAdmin(context: { userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roleRow, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !roleRow) throw new Error("Forbidden");
}

function gscHeaders(): GscHeaders {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) {
    throw new Error(
      "Missing LOVABLE_API_KEY or GOOGLE_SEARCH_CONSOLE_API_KEY — connect Google Search Console in Connectors.",
    );
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
  };
}

export type UrlInspectionResult = {
  url: string;
  ok: boolean;
  error?: string;
  coverageState?: string;
  indexingState?: string;
  verdict?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  crawledAs?: string;
};

async function inspectOne(url: string): Promise<UrlInspectionResult> {
  try {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: { ...gscHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { url, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          indexingState?: string;
          lastCrawlTime?: string;
          googleCanonical?: string;
          userCanonical?: string;
          pageFetchState?: string;
          robotsTxtState?: string;
          crawledAs?: string;
        };
      };
    };
    const r = json.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      ok: true,
      verdict: r.verdict,
      coverageState: r.coverageState,
      indexingState: r.indexingState,
      lastCrawlTime: r.lastCrawlTime,
      googleCanonical: r.googleCanonical,
      userCanonical: r.userCanonical,
      pageFetchState: r.pageFetchState,
      robotsTxtState: r.robotsTxtState,
      crawledAs: r.crawledAs,
    };
  } catch (e) {
    return { url, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const inspectGscUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { urls: string[] }) => {
    if (!input || !Array.isArray(input.urls)) {
      throw new Error("urls must be an array");
    }
    // Cap to keep GSC quota sane.
    const urls = input.urls
      .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, 25);
    return { urls };
  })
  .handler(async ({ data, context }): Promise<{ results: UrlInspectionResult[] }> => {
    await assertAdmin(context);

    // Sequential to be polite to the GSC quota (≈600 inspections/day, 2k/min).
    const results: UrlInspectionResult[] = [];
    for (const u of data.urls) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await inspectOne(u));
    }
    return { results };
  });

export type TopPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export const getGscTopPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; rowLimit?: number }) => ({
    days: Math.min(Math.max(Number(input?.days ?? 28), 1), 90),
    rowLimit: Math.min(Math.max(Number(input?.rowLimit ?? 25), 1), 100),
  }))
  .handler(async ({ data, context }): Promise<{ rows: TopPageRow[]; error?: string }> => {
    await assertAdmin(context);

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - data.days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const encodedSite = encodeURIComponent(SITE_URL);
    try {
      const res = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { ...gscHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: fmt(start),
            endDate: fmt(end),
            dimensions: ["page"],
            rowLimit: data.rowLimit,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        return { rows: [], error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      const json = (await res.json()) as {
        rows?: Array<{
          keys?: string[];
          clicks?: number;
          impressions?: number;
          ctr?: number;
          position?: number;
        }>;
      };
      const rows: TopPageRow[] = (json.rows ?? []).map((r) => ({
        page: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }));
      return { rows };
    } catch (e) {
      return { rows: [], error: e instanceof Error ? e.message : String(e) };
    }
  });
