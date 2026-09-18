import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONSOLIDATED_LOCAL_STORY_SLUGS } from "@/content/local-stories-articles";

/**
 * Search performance + conversion reporting for the admin SEO monitor.
 *
 * Three reads, all admin-guarded:
 *   1. `getSearchPerformance` — Search Console `searchAnalytics/query` for
 *      pages AND queries, for the last N days and the N days before, so a
 *      drop is visible as a delta instead of an absolute number.
 *   2. `getRetiredUrlRedirects` — verifies every consolidated wine URL still
 *      answers with a permanent redirect to its surviving guide.
 *   3. `getBookingConversions` — bookings per Signature experience from our
 *      own data (reached guest details vs. paid), so search traffic and real
 *      bookings can be read side by side.
 *
 * Search Console is reached through the Lovable connector gateway, which
 * forwards the workspace OAuth token. No Google SDK, no provider key.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://yesexperiencesportugal.com";
const PROPERTY = `${SITE}/`;

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

function gscHeaders() {
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
    "Content-Type": "application/json",
  };
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function windowFor(days: number, offsetDays: number) {
  // Search Console data lags ~2 days; start the window there so the
  // current and previous periods are equally complete.
  const end = new Date();
  end.setDate(end.getDate() - 2 - offsetDays);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return { startDate: fmt(start), endDate: fmt(end) };
}

export type SearchRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Previous-period values; absent when the row did not exist then. */
  prevClicks?: number;
  prevImpressions?: number;
  prevPosition?: number;
};

export type SearchPerformance = {
  /** Window labels, so the UI never invents its own dates. */
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  pages: SearchRow[];
  queries: SearchRow[];
  totals: {
    clicks: number;
    impressions: number;
    position: number;
    prevClicks: number;
    prevImpressions: number;
    prevPosition: number;
  };
  error?: string;
};

type RawRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

async function queryDimension(
  dimension: "page" | "query",
  range: { startDate: string; endDate: string },
  rowLimit: number,
): Promise<RawRow[]> {
  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: gscHeaders(),
      body: JSON.stringify({ ...range, dimensions: [dimension], rowLimit }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Search Console ${dimension} query failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { rows?: RawRow[] };
  return json.rows ?? [];
}

function merge(current: RawRow[], previous: RawRow[]): SearchRow[] {
  const prev = new Map(previous.map((r) => [r.keys?.[0] ?? "", r]));
  return current
    .map((r) => {
      const key = r.keys?.[0] ?? "";
      const p = prev.get(key);
      return {
        key,
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
        prevClicks: p?.clicks,
        prevImpressions: p?.impressions,
        prevPosition: p?.position,
      };
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function totalsOf(rows: RawRow[]) {
  const clicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const weighted = rows.reduce((s, r) => s + (r.position ?? 0) * (r.impressions ?? 0), 0);
  return { clicks, impressions, position: impressions > 0 ? weighted / impressions : 0 };
}

export const getSearchPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; rowLimit?: number }) => ({
    days: Math.min(Math.max(Number(input?.days ?? 28), 7), 90),
    rowLimit: Math.min(Math.max(Number(input?.rowLimit ?? 25), 5), 100),
  }))
  .handler(async ({ data, context }): Promise<SearchPerformance> => {
    await assertAdmin(context);

    const current = windowFor(data.days, 0);
    const previous = windowFor(data.days, data.days);
    const empty: SearchPerformance = {
      current,
      previous,
      pages: [],
      queries: [],
      totals: {
        clicks: 0,
        impressions: 0,
        position: 0,
        prevClicks: 0,
        prevImpressions: 0,
        prevPosition: 0,
      },
    };

    try {
      const [pagesNow, pagesPrev, queriesNow, queriesPrev] = await Promise.all([
        queryDimension("page", current, data.rowLimit),
        queryDimension("page", previous, data.rowLimit),
        queryDimension("query", current, data.rowLimit),
        queryDimension("query", previous, data.rowLimit),
      ]);
      const now = totalsOf(pagesNow);
      const before = totalsOf(pagesPrev);
      return {
        current,
        previous,
        pages: merge(pagesNow, pagesPrev),
        queries: merge(queriesNow, queriesPrev),
        totals: {
          clicks: now.clicks,
          impressions: now.impressions,
          position: now.position,
          prevClicks: before.clicks,
          prevImpressions: before.impressions,
          prevPosition: before.position,
        },
      };
    } catch (e) {
      return { ...empty, error: e instanceof Error ? e.message : String(e) };
    }
  });

export type RetiredUrlRow = {
  from: string;
  expectedTo: string;
  status?: number;
  location?: string;
  permanent: boolean;
  correctTarget: boolean;
  error?: string;
};

export const getRetiredUrlRedirects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: RetiredUrlRow[] }> => {
    await assertAdmin(context);

    const pairs = Object.entries(CONSOLIDATED_LOCAL_STORY_SLUGS);
    const rows = await Promise.all(
      pairs.map(async ([retired, surviving]) => {
        const from = `${SITE}/local-stories/${retired}`;
        const expectedTo = `${SITE}/local-stories/${surviving}`;
        try {
          const res = await fetch(from, { redirect: "manual" });
          const location = res.headers.get("location") ?? undefined;
          const resolved = location
            ? new URL(location, SITE).toString().replace(/\/$/, "")
            : undefined;
          return {
            from,
            expectedTo,
            status: res.status,
            location: resolved,
            permanent: res.status === 301 || res.status === 308,
            correctTarget: resolved === expectedTo,
          };
        } catch (e) {
          return {
            from,
            expectedTo,
            permanent: false,
            correctTarget: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }),
    );
    return { rows };
  });

export type BookingConversionRow = {
  tourId: string;
  started: number;
  reachedDetails: number;
  paid: number;
};

export const getBookingConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(Math.max(Number(input?.days ?? 28), 7), 180),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ rows: BookingConversionRow[]; days: number; error?: string }> => {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const since = new Date();
      since.setDate(since.getDate() - data.days);

      const { data: bookings, error } = await supabaseAdmin
        .from("bookings")
        .select("source_tour_id, status, booking_details_completed_at, created_at")
        .gte("created_at", since.toISOString());

      if (error) return { rows: [], days: data.days, error: error.message };

      const byTour = new Map<string, BookingConversionRow>();
      for (const b of bookings ?? []) {
        const tourId = b.source_tour_id ?? "(no experience)";
        const row =
          byTour.get(tourId) ?? { tourId, started: 0, reachedDetails: 0, paid: 0 };
        row.started += 1;
        if (b.booking_details_completed_at) row.reachedDetails += 1;
        if (b.status === "paid") row.paid += 1;
        byTour.set(tourId, row);
      }

      const rows = [...byTour.values()].sort((a, b) => b.paid - a.paid || b.started - a.started);
      return { rows, days: data.days };
    },
  );
