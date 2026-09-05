/**
 * Reviews — public first-party submission. No auth required; the one-time
 * token in the URL authenticates the guest.
 */
import { createServerFn } from "@tanstack/react-start";

export const submitFirstPartyReview = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      rating: number;
      title?: string | null;
      body: string;
      reviewer_name?: string | null;
      reviewer_country?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!data.token || data.token.length < 16) throw new Error("Invalid token");
    if (data.rating < 1 || data.rating > 5) throw new Error("Rating must be 1–5");
    if (!data.body || data.body.length < 10) throw new Error("Please write at least one sentence");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rev, error } = await supabaseAdmin.rpc("submit_first_party_review", {
      _token: data.token,
      _rating: data.rating,
      _title: data.title ?? "",
      _body: data.body,
      _reviewer_name: data.reviewer_name ?? "",
      _reviewer_country: data.reviewer_country ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true, id: rev as unknown as string };
  });

/**
 * Open guest review submission from /reviews and /pt/reviews.
 *
 * No token: anyone who travelled with us can write in. Nothing goes live
 * automatically — every row lands unpublished with moderation_status
 * 'pending' and verified=false, so the public pages and all schema output
 * stay exactly as trustworthy as before. Admin moderation publishes it.
 */
export const submitPublicReview = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      tourId: string;
      rating: number;
      title?: string | null;
      body: string;
      reviewer_name?: string | null;
      reviewer_country?: string | null;
      language?: string;
      /** Honeypot — must stay empty. */
      website?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    // Silently accept bot submissions without storing them.
    if (data.website && data.website.trim().length > 0) return { ok: true, moderated: true };

    if (!data.tourId || data.tourId.length < 2) throw new Error("Please choose an experience");
    if (!Number.isFinite(data.rating) || data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be 1–5");
    }
    const body = (data.body ?? "").trim();
    if (body.length < 10) throw new Error("Please write at least one sentence");
    if (body.length > 4000) throw new Error("Please keep your review under 4000 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tour_reviews").insert({
      tour_id: data.tourId,
      source: "first_party",
      rating: Math.round(data.rating),
      title: (data.title ?? "").trim().slice(0, 120) || null,
      body,
      reviewer_name: (data.reviewer_name ?? "").trim().slice(0, 120) || null,
      reviewer_country: (data.reviewer_country ?? "").trim().slice(0, 60) || null,
      is_first_party: true,
      verified: false,
      is_published: false,
      moderation_status: "pending",
      language: data.language === "pt" ? "pt" : "en",
    });
    if (error) throw new Error(error.message);
    return { ok: true, moderated: true };
  });
