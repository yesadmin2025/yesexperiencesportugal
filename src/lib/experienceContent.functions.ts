/**
 * Experience editorial copy — public read + admin write.
 *
 * Overrides ONLY the three editorial fields an owner should be able to edit
 * from a phone: the card teaser (`blurb`), the opening paragraph (`intro`)
 * and "who it fits" (`fits_best`). Stops, inclusions, itinerary, prices and
 * availability are deliberately NOT editable here — they stay source of truth.
 *
 * Public pages fall back to the code copy whenever there is no published
 * override, so a page can never render empty.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface ExperienceContentOverride {
  tourId: string;
  blurb: string | null;
  intro: string | null;
  fitsBest: string | null;
  highlights: string[] | null;
  isPublished: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Publishable-key client — public reads only, no session, RLS as anon. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SELECT = "tour_id, blurb, intro, fits_best, highlights, is_published, updated_at, updated_by";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOverride(row: any): ExperienceContentOverride {
  return {
    tourId: row.tour_id as string,
    blurb: (row.blurb as string | null) ?? null,
    intro: (row.intro as string | null) ?? null,
    fitsBest: (row.fits_best as string | null) ?? null,
    highlights: (row.highlights as string[] | null) ?? null,
    isPublished: row.is_published !== false,
    updatedAt: (row.updated_at as string | null) ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
  };
}

/** Published copy for one experience. Public; never throws on the page. */
export const getPublishedExperienceContent = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ tourId: z.string().max(120) }).parse(input))
  .handler(async ({ data }): Promise<ExperienceContentOverride | null> => {
    try {
      const { data: row } = await publicClient()
        .from("experience_content_overrides")
        .select(SELECT)
        .eq("tour_id", data.tourId)
        .eq("is_published", true)
        .maybeSingle();
      return row ? toOverride(row) : null;
    } catch {
      return null;
    }
  });

/** Every override, published or not — admin console. */
export const listExperienceContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExperienceContentOverride[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("experience_content_overrides")
      .select(SELECT);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toOverride);
  });

const saveInput = z.object({
  tourId: z.string().min(1).max(120),
  blurb: z.string().max(400).nullable(),
  intro: z.string().max(2000).nullable(),
  fitsBest: z.string().max(240).nullable(),
  highlights: z.array(z.string()).nullable(),
  isPublished: z.boolean().default(true),
});

function clean(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Upsert the override and keep a revision so a change can be undone. */
export const saveExperienceContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }): Promise<ExperienceContentOverride> => {
    await assertAdmin(context);
    const payload = {
      tour_id: data.tourId,
      blurb: clean(data.blurb),
      intro: clean(data.intro),
      fits_best: clean(data.fitsBest),
      highlights: data.highlights,
      is_published: data.isPublished,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await context.supabase
      .from("experience_content_overrides")
      .upsert(payload, { onConflict: "tour_id" })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);

    // History is best-effort: a failed audit row must not lose the edit.
    await context.supabase.from("experience_content_revisions").insert({
      tour_id: payload.tour_id,
      blurb: payload.blurb,
      intro: payload.intro,
      fits_best: payload.fits_best,
      highlights: payload.highlights,
      is_published: payload.is_published,
      updated_by: context.userId,
    });

    return toOverride(row);
  });

export interface ExperienceContentRevision extends ExperienceContentOverride {
  id: string;
  createdAt: string;
}

/** Edit history for one experience, newest first. */
export const listExperienceContentHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tourId: z.string().max(120) }).parse(input))
  .handler(async ({ data, context }): Promise<ExperienceContentRevision[]> => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("experience_content_revisions")
      .select("id, tour_id, blurb, intro, fits_best, highlights, is_published, updated_by, created_at")
      .eq("tour_id", data.tourId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows ?? []).map((r: any) => ({
      ...toOverride(r),
      id: r.id as string,
      createdAt: r.created_at as string,
    }));
  });
