/**
 * Reviews — public first-party submission. No auth required; the one-time
 * token in the URL authenticates the guest.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

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

    const sb = publicClient();
    const { data: rev, error } = await sb.rpc("submit_first_party_review", {
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
