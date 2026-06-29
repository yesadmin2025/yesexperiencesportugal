/**
 * Reviews — admin write server functions. Admin-only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

export type ReviewSource =
  | "viator"
  | "tripadvisor"
  | "getyourguide"
  | "google"
  | "first_party";

// -------------------- External ratings (per-platform counts) --------------------

export const listExternalRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("tour_external_ratings")
      .select("*")
      .order("tour_id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertExternalRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tour_id: string;
      source: ReviewSource;
      rating: number;
      review_count: number;
      source_url?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.source === "first_party") throw new Error("Use review submission for first-party");
    if (data.rating < 1 || data.rating > 5) throw new Error("Rating must be 1–5");
    if (data.review_count < 0) throw new Error("Count must be ≥ 0");
    const { data: row, error } = await context.supabase
      .from("tour_external_ratings")
      .upsert(
        {
          tour_id: data.tour_id,
          source: data.source,
          rating: data.rating,
          review_count: data.review_count,
          source_url: data.source_url ?? null,
          last_verified_at: new Date().toISOString(),
        },
        { onConflict: "tour_id,source" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExternalRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("tour_external_ratings")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------- Reviews (display + first-party) --------------------

export const listReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tourId?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("tour_reviews")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(500);
    if (data.tourId) q = q.eq("tour_id", data.tourId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      tour_id: string;
      source: ReviewSource;
      rating: number;
      title?: string | null;
      body: string;
      reviewer_name?: string | null;
      reviewer_country?: string | null;
      source_url?: string | null;
      is_featured?: boolean;
      is_published?: boolean;
      verified?: boolean;
      published_at?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.rating < 1 || data.rating > 5) throw new Error("Rating must be 1–5");
    if (!data.body || data.body.length < 10) throw new Error("Body too short");
    const payload = {
      tour_id: data.tour_id,
      source: data.source,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body,
      reviewer_name: data.reviewer_name ?? null,
      reviewer_country: data.reviewer_country ?? null,
      source_url: data.source_url ?? null,
      is_first_party: data.source === "first_party",
      verified: data.verified ?? false,
      is_featured: data.is_featured ?? false,
      is_published: data.is_published ?? true,
      published_at: data.published_at ?? new Date().toISOString(),
    };
    const q = data.id
      ? context.supabase.from("tour_reviews").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("tour_reviews").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("tour_reviews")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------- Submission tokens (first-party) --------------------

export const createReviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { tour_id: string; guest_email: string; guest_name?: string | null; booking_id?: string | null }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const token =
      crypto.randomUUID().replace(/-/g, "") +
      Math.random().toString(36).slice(2, 10);
    const { data: row, error } = await context.supabase
      .from("review_submission_tokens")
      .insert({
        token,
        tour_id: data.tour_id,
        guest_email: data.guest_email,
        guest_name: data.guest_name ?? null,
        booking_id: data.booking_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------------------- Moderation queue (scraped reviews) --------------------

export const listPendingReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { tourId?: string; status?: "pending" | "approved" | "rejected" }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const status = data.status ?? "pending";
    let q = context.supabase
      .from("tour_reviews")
      .select("*")
      .eq("moderation_status", status)
      .eq("is_first_party", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.tourId) q = q.eq("tour_id", data.tourId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; decision: "approve" | "reject"; notes?: string | null }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const approve = data.decision === "approve";
    const patch: Record<string, unknown> = {
      moderation_status: approve ? "approved" : "rejected",
      is_published: approve,
      moderated_at: new Date().toISOString(),
      moderated_by: context.userId,
      moderation_notes: data.notes ?? null,
    };
    if (approve) patch.published_at = new Date().toISOString();
    const { data: row, error } = await (context.supabase as any)
      .from("tour_reviews")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const bulkModerateReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; decision: "approve" | "reject" }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (!data.ids.length) return { count: 0 };
    const approve = data.decision === "approve";
    const patch: Record<string, unknown> = {
      moderation_status: approve ? "approved" : "rejected",
      is_published: approve,
      moderated_at: new Date().toISOString(),
      moderated_by: context.userId,
    };
    if (approve) patch.published_at = new Date().toISOString();
    const { error, count } = await context.supabase
      .from("tour_reviews")
      .update(patch, { count: "exact" })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
