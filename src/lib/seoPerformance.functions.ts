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

/**
 * A booking reached the guest-details step when the frozen details snapshot
 * exists. `booking_details_completed_at` is not written by the current
 * checkout flow, so relying on it alone reported a permanent zero.
 */
function reachedGuestDetails(b: {
  booking_details_completed_at?: string | null;
  booking_details?: unknown;
}): boolean {
  if (b.booking_details_completed_at) return true;
  const d = b.booking_details;
  if (!d || typeof d !== "object") return false;
  return Object.keys(d as Record<string, unknown>).length > 0;
}

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
        .select("source_tour_id, status, booking_details_completed_at, booking_details, created_at")
        .gte("created_at", since.toISOString());

      if (error) return { rows: [], days: data.days, error: error.message };

      const byTour = new Map<string, BookingConversionRow>();
      for (const b of bookings ?? []) {
        const tourId = b.source_tour_id ?? "(no experience)";
        const row =
          byTour.get(tourId) ?? { tourId, started: 0, reachedDetails: 0, paid: 0 };
        row.started += 1;
        if (reachedGuestDetails(b)) row.reachedDetails += 1;
        if (b.status === "paid") row.paid += 1;
        byTour.set(tourId, row);
      }

      const rows = [...byTour.values()].sort((a, b) => b.paid - a.paid || b.started - a.started);
      return { rows, days: data.days };
    },
  );

export type AcquisitionConversionRow = {
  /** "google", "bing", "chatgpt.com", "direct", … */
  source: string;
  /** "organic" | "referral" | "direct" | "paid" | "social" | "unknown" */
  medium: string;
  /** Checkouts opened from this source. */
  started: number;
  /** Reached the guest-details step. */
  reachedDetails: number;
  /** Real paid bookings. */
  paid: number;
  /** Paid revenue in EUR. */
  paidRevenueEur: number;
  /** Most frequent landing page for this source. */
  topLandingPath: string;
};

/**
 * Which acquisition source produced real payments.
 *
 * First-touch source/medium travels from the browser (see `src/lib/utm.ts`)
 * into Stripe metadata and lands on the `bookings` row, so Google organic —
 * which never carries utm_* — is finally attributable end to end.
 * Rows created before this shipped read as "unknown".
 */
export const getAcquisitionConversions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(Math.max(Number(input?.days ?? 28), 7), 180),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ rows: AcquisitionConversionRow[]; days: number; error?: string }> => {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const since = new Date();
      since.setDate(since.getDate() - data.days);

      const { data: bookings, error } = await supabaseAdmin
        .from("bookings")
        .select("status, metadata, amount_total, booking_details_completed_at, booking_details, created_at")
        .gte("created_at", since.toISOString());

      if (error) return { rows: [], days: data.days, error: error.message };

      type Acc = AcquisitionConversionRow & { landings: Map<string, number> };
      const byKey = new Map<string, Acc>();

      for (const b of bookings ?? []) {
        const meta = (b.metadata ?? {}) as Record<string, unknown>;
        const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : "");
        const source = (str("attr_source") || str("utm_source") || "unknown").slice(0, 80);
        const medium = (
          str("attr_medium") ||
          str("utm_medium") ||
          (str("gclid") ? "paid" : "") ||
          "unknown"
        ).slice(0, 40);
        const landing = str("landing_path");
        const key = `${source}·${medium}`;

        const row =
          byKey.get(key) ??
          ({
            source,
            medium,
            started: 0,
            reachedDetails: 0,
            paid: 0,
            paidRevenueEur: 0,
            topLandingPath: "—",
            landings: new Map<string, number>(),
          } satisfies Acc);

        row.started += 1;
        if (reachedGuestDetails(b)) row.reachedDetails += 1;
        if (b.status === "paid") {
          row.paid += 1;
          row.paidRevenueEur += Math.round((b.amount_total ?? 0) / 100);
        }
        if (landing) row.landings.set(landing, (row.landings.get(landing) ?? 0) + 1);
        byKey.set(key, row);
      }

      const rows: AcquisitionConversionRow[] = [...byKey.values()]
        .map(({ landings, ...r }) => {
          const top = [...landings.entries()].sort((a, b) => b[1] - a[1])[0];
          return { ...r, topLandingPath: top ? top[0] : "—" };
        })
        .sort((a, b) => b.paid - a.paid || b.started - a.started);

      return { rows, days: data.days };
    },
  );

export type ExperienceSeoRow = {
  tourId: string;
  title: string;
  /** Canonical experience page path. */
  path: string;
  /** Guide articles that feed this experience. */
  guidePaths: string[];
  /** Search Console, current window (experience page + its guides combined). */
  clicks: number;
  impressions: number;
  position: number;
  prevClicks: number;
  prevImpressions: number;
  prevPosition: number;
  /** Own data: checkouts opened, reached guest details, paid, revenue in EUR. */
  started: number;
  reachedDetails: number;
  paid: number;
  paidRevenueEur: number;
};

export type ExperienceSeoPerformance = {
  days: number;
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  rows: ExperienceSeoRow[];
  searchError?: string;
  bookingError?: string;
};

/**
 * Per-experience SEO + conversion view: Search Console demand for each
 * `/tours/<id>` page plus the guide articles that point at it, joined with our
 * own booking funnel for the same experience. Read-only; no invented numbers.
 */
export const getExperienceSeoPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(Math.max(Number(input?.days ?? 28), 7), 90),
  }))
  .handler(async ({ data, context }): Promise<ExperienceSeoPerformance> => {
    await assertAdmin(context);

    const [{ signatureTours }, articles] = await Promise.all([
      import("@/data/signatureTours"),
      import("@/content/local-stories-articles"),
    ]);

    const current = windowFor(data.days, 0);
    const previous = windowFor(data.days, data.days);

    // path -> tourId, for every experience page and every guide that points at it.
    const owner = new Map<string, string>();
    const guidesByTour = new Map<string, string[]>();
    for (const t of signatureTours) {
      owner.set(`/tours/${t.id}`, t.id);
      guidesByTour.set(t.id, []);
    }
    for (const a of articles.PUBLISHED_LOCAL_STORIES_ARTICLES) {
      const tourId =
        a.signatureSlug ?? articles.GUIDE_INLINE_BOOKING[a.slug]?.tourSlug ?? undefined;
      if (!tourId || !guidesByTour.has(tourId)) continue;
      const path = `/local-stories/${a.slug}`;
      owner.set(path, tourId);
      guidesByTour.get(tourId)!.push(path);
    }

    const pathOf = (url: string) => {
      try {
        return new URL(url).pathname.replace(/\/$/, "") || "/";
      } catch {
        return url;
      }
    };

    type Agg = { clicks: number; impressions: number; weighted: number };
    const blank = (): Agg => ({ clicks: 0, impressions: 0, weighted: 0 });
    const nowByTour = new Map<string, Agg>();
    const prevByTour = new Map<string, Agg>();
    let searchError: string | undefined;

    const absorb = (rows: RawRow[], into: Map<string, Agg>) => {
      for (const r of rows) {
        const tourId = owner.get(pathOf(r.keys?.[0] ?? ""));
        if (!tourId) continue;
        const agg = into.get(tourId) ?? blank();
        agg.clicks += r.clicks ?? 0;
        agg.impressions += r.impressions ?? 0;
        agg.weighted += (r.position ?? 0) * (r.impressions ?? 0);
        into.set(tourId, agg);
      }
    };

    try {
      const [nowRows, prevRows] = await Promise.all([
        queryDimension("page", current, 100),
        queryDimension("page", previous, 100),
      ]);
      absorb(nowRows, nowByTour);
      absorb(prevRows, prevByTour);
    } catch (e) {
      searchError = e instanceof Error ? e.message : String(e);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const { data: bookings, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("source_tour_id, status, amount_total, booking_details_completed_at, booking_details")
      .gte("created_at", since.toISOString());

    type Funnel = { started: number; reachedDetails: number; paid: number; revenue: number };
    const funnel = new Map<string, Funnel>();
    for (const b of bookings ?? []) {
      const tourId = b.source_tour_id ?? "";
      if (!tourId) continue;
      const f = funnel.get(tourId) ?? { started: 0, reachedDetails: 0, paid: 0, revenue: 0 };
      f.started += 1;
      if (reachedGuestDetails(b)) f.reachedDetails += 1;
      if (b.status === "paid") {
        f.paid += 1;
        f.revenue += Math.round((b.amount_total ?? 0) / 100);
      }
      funnel.set(tourId, f);
    }

    const rows: ExperienceSeoRow[] = signatureTours
      .map((t) => {
        const now = nowByTour.get(t.id) ?? blank();
        const before = prevByTour.get(t.id) ?? blank();
        const f = funnel.get(t.id) ?? { started: 0, reachedDetails: 0, paid: 0, revenue: 0 };
        return {
          tourId: t.id,
          title: t.title,
          path: `/tours/${t.id}`,
          guidePaths: guidesByTour.get(t.id) ?? [],
          clicks: now.clicks,
          impressions: now.impressions,
          position: now.impressions > 0 ? now.weighted / now.impressions : 0,
          prevClicks: before.clicks,
          prevImpressions: before.impressions,
          prevPosition: before.impressions > 0 ? before.weighted / before.impressions : 0,
          started: f.started,
          reachedDetails: f.reachedDetails,
          paid: f.paid,
          paidRevenueEur: f.revenue,
        };
      })
      .sort(
        (a, b) =>
          b.paid - a.paid || b.clicks - a.clicks || b.impressions - a.impressions,
      );

    return {
      days: data.days,
      current,
      previous,
      rows,
      searchError,
      bookingError: bookingErr?.message,
    };
  });
