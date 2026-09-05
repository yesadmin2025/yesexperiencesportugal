/**
 * Reviews — public read server functions.
 *
 * Aggregates real reviews across all sources (Viator / Tripadvisor /
 * GetYourGuide / Google / first-party). Counts come from
 * `tour_external_ratings` (admin-entered, from each platform's dashboard).
 * Display reviews come from `tour_reviews` (first-party + manually entered
 * third-party quotes). Schema is emitted ONLY for first-party rows by the
 * route consumer.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type ReviewSource = "viator" | "tripadvisor" | "getyourguide" | "google" | "first_party";

export type PublicReview = {
  id: string;
  tour_id: string;
  source: ReviewSource;
  rating: number;
  title: string | null;
  body: string;
  reviewer_name: string | null;
  reviewer_country: string | null;
  source_url: string | null;
  is_first_party: boolean;
  verified: boolean;
  published_at: string;
};

export type TourStats = {
  tour_id: string;
  total_reviews: number;
  average_rating: number | null;
  first_party_count: number;
  first_party_avg: number | null;
  per_source: {
    source: ReviewSource;
    rating: number;
    review_count: number;
    source_url: string | null;
  }[];
};

export type GlobalStats = {
  total_reviews: number;
  average_rating: number | null;
  external_count: number;
  external_weighted_avg: number | null;
  first_party_count: number;
  first_party_avg: number | null;
};

/** Global aggregate for homepage trust line. */
export const getGlobalReviewStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<GlobalStats> => {
    const sb = publicClient();
    const { data, error } = await sb.from("global_review_aggregate").select("*").maybeSingle();
    if (error) {
      return {
        total_reviews: 0,
        average_rating: null,
        external_count: 0,
        external_weighted_avg: null,
        first_party_count: 0,
        first_party_avg: null,
      };
    }
    return {
      total_reviews: Number(data?.total_reviews ?? 0),
      average_rating: data?.average_rating != null ? Number(data.average_rating) : null,
      external_count: Number(data?.external_count ?? 0),
      external_weighted_avg:
        data?.external_weighted_avg != null ? Number(data.external_weighted_avg) : null,
      first_party_count: Number(data?.first_party_count ?? 0),
      first_party_avg: data?.first_party_avg != null ? Number(data.first_party_avg) : null,
    };
  },
);

/** Per-tour aggregate combining external ratings + first-party reviews. */
export const getTourReviewStats = createServerFn({ method: "GET" })
  .inputValidator((d: { tourId: string }) => d)
  .handler(async ({ data }): Promise<TourStats> => {
    const sb = publicClient();
    const [ext, fp] = await Promise.all([
      sb
        .from("tour_external_ratings")
        .select("source, rating, review_count, source_url")
        .eq("tour_id", data.tourId),
      sb.from("tour_review_stats").select("*").eq("tour_id", data.tourId).maybeSingle(),
    ]);

    const per_source = (ext.data ?? []).map((r) => ({
      source: r.source as ReviewSource,
      rating: Number(r.rating),
      review_count: Number(r.review_count),
      source_url: r.source_url,
    }));
    const externalCount = per_source.reduce((s, r) => s + r.review_count, 0);
    const externalWeighted =
      externalCount > 0
        ? per_source.reduce((s, r) => s + r.rating * r.review_count, 0) / externalCount
        : null;

    const fpCount = Number(fp.data?.first_party_count ?? 0);
    const fpAvg = fp.data?.first_party_avg != null ? Number(fp.data.first_party_avg) : null;

    const total = externalCount + fpCount;
    const combined =
      total > 0
        ? Number(
            (((externalWeighted ?? 0) * externalCount + (fpAvg ?? 0) * fpCount) / total).toFixed(2),
          )
        : null;

    return {
      tour_id: data.tourId,
      total_reviews: total,
      average_rating: combined,
      first_party_count: fpCount,
      first_party_avg: fpAvg,
      per_source,
    };
  });

/** Reviews to display on a tour page (first-party + admin-entered third-party). */
export const getTourReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { tourId: string; limit?: number }) => d)
  .handler(async ({ data }): Promise<PublicReview[]> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("tour_reviews")
      .select(
        "id, tour_id, source, rating, title, body, reviewer_name, reviewer_country, source_url, is_first_party, verified, published_at",
      )
      .eq("tour_id", data.tourId)
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(Math.min(data.limit ?? 8, 50));
    if (error) return [];
    return (rows ?? []) as PublicReview[];
  });

/** Curated quotes for homepage social proof (across all tours). */
export const getCuratedHomepageReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number }) => d)
  .handler(async ({ data }): Promise<PublicReview[]> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("tour_reviews")
      .select(
        "id, tour_id, source, rating, title, body, reviewer_name, reviewer_country, source_url, is_first_party, verified, published_at",
      )
      .eq("is_published", true)
      .eq("is_featured", true)
      .gte("rating", 5)
      .order("published_at", { ascending: false })
      .limit(Math.min(data.limit ?? 6, 12));
    if (error) return [];
    return (rows ?? []) as PublicReview[];
  });

/** First-party-only stats for safe schema emission. */
export const getFirstPartyTourStats = createServerFn({ method: "GET" })
  .inputValidator((d: { tourId: string }) => d)
  .handler(async ({ data }): Promise<{ count: number; average: number | null }> => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("tour_review_stats")
      .select("first_party_count, first_party_avg")
      .eq("tour_id", data.tourId)
      .maybeSingle();
    if (error || !row) return { count: 0, average: null };
    return {
      count: Number(row.first_party_count ?? 0),
      average: row.first_party_avg != null ? Number(row.first_party_avg) : null,
    };
  });

/* ─────────────────────────────────────────────────────────────────────────
 * /reviews + /pt/reviews page bundle — one server round-trip, resolved in
 * the route loader so every card ships inside the initial HTML (previously
 * the page fetched per tour after hydration and crawlers saw an empty page).
 *
 * Reviews come from the database first; when a tour has no stored quotes we
 * fall back to the same verified platform quotes the tour detail page and
 * the homepage testimonial strip already display. No invented content.
 * ───────────────────────────────────────────────────────────────────────── */

export type ReviewsPageTour = {
  tour_id: string;
  title: string;
  stats: TourStats;
  reviews: PublicReview[];
};

export type ReviewsPageData = {
  global: GlobalStats;
  tours: ReviewsPageTour[];
};

export const getReviewsPageData = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReviewsPageData> => {
    const { VIATOR_META } = await import("@/data/signatureToursViator");
    const { findTour } = await import("@/data/signatureTours");
    const { filterVisibleReviews } = await import("@/lib/tour-reviews-filter");
    const sb = publicClient();

    const ids = Object.keys(VIATOR_META);

    const [globalRow, extRows, statRows, reviewRows] = await Promise.all([
      sb.from("global_review_aggregate").select("*").maybeSingle(),
      sb.from("tour_external_ratings").select("tour_id, source, rating, review_count, source_url"),
      sb.from("tour_review_stats").select("*"),
      sb
        .from("tour_reviews")
        .select(
          "id, tour_id, source, rating, title, body, reviewer_name, reviewer_country, source_url, is_first_party, verified, published_at",
        )
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false }),
    ]);

    const g = globalRow.data;
    const global: GlobalStats = {
      total_reviews: Number(g?.total_reviews ?? 0),
      average_rating: g?.average_rating != null ? Number(g.average_rating) : null,
      external_count: Number(g?.external_count ?? 0),
      external_weighted_avg:
        g?.external_weighted_avg != null ? Number(g.external_weighted_avg) : null,
      first_party_count: Number(g?.first_party_count ?? 0),
      first_party_avg: g?.first_party_avg != null ? Number(g.first_party_avg) : null,
    };

    const tours: ReviewsPageTour[] = [];

    for (const id of ids) {
      const meta = VIATOR_META[id as keyof typeof VIATOR_META];
      const per_source = (extRows.data ?? [])
        .filter((r) => r.tour_id === id)
        .map((r) => ({
          source: r.source as ReviewSource,
          rating: Number(r.rating),
          review_count: Number(r.review_count),
          source_url: r.source_url,
        }));
      const externalCount = per_source.reduce((s, r) => s + r.review_count, 0);
      const externalWeighted =
        externalCount > 0
          ? per_source.reduce((s, r) => s + r.rating * r.review_count, 0) / externalCount
          : null;

      const statRow = (statRows.data ?? []).find((r) => r.tour_id === id);
      const fpCount = Number(statRow?.first_party_count ?? 0);
      const fpAvg = statRow?.first_party_avg != null ? Number(statRow.first_party_avg) : null;

      // Verified platform totals already published on the tour page.
      const platformCount = meta?.reviewCount ?? 0;
      const platformRating = meta?.rating ?? null;

      const dbTotal = externalCount + fpCount;
      const total = dbTotal > 0 ? dbTotal : platformCount;
      const average =
        dbTotal > 0
          ? Number(
              (((externalWeighted ?? 0) * externalCount + (fpAvg ?? 0) * fpCount) / dbTotal).toFixed(
                2,
              ),
            )
          : platformRating;

      const stored = filterVisibleReviews(
        ((reviewRows.data ?? []) as PublicReview[]).filter((r) => r.tour_id === id),
      ).slice(0, 6);

      const reviews: PublicReview[] =
        stored.length > 0
          ? stored
          : (meta?.topReviews ?? [])
              .filter((r) => r.text?.trim())
              .slice(0, 4)
              .map((r, i) => ({
                id: `${id}-platform-${i}`,
                tour_id: id,
                source: (r.source ?? "Viator").toLowerCase() as ReviewSource,
                rating: meta?.rating ?? 5,
                title: r.title || null,
                body: r.text,
                reviewer_name: r.author || null,
                reviewer_country: null,
                source_url: meta?.viatorUrl ?? null,
                is_first_party: false,
                verified: true,
                published_at: r.date ?? "",
              }));

      if (total === 0 && reviews.length === 0) continue;

      tours.push({
        tour_id: id,
        title: findTour(id)?.title ?? id,
        stats: {
          tour_id: id,
          total_reviews: total,
          average_rating: average,
          first_party_count: fpCount,
          first_party_avg: fpAvg,
          per_source,
        },
        reviews,
      });
    }

    return { global, tours };
  },
);
