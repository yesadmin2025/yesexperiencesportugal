import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const input = z.object({
  tourId: z.string().min(1).max(120),
  pageTitle: z.string().trim().max(120),
  metaDescription: z.string().trim().max(320),
  h1: z.string().trim().max(160),
});

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

export const listExperienceSeoDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("experience_seo_drafts")
      .select("tour_id, page_title, meta_description, h1, updated_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveExperienceSeoDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("experience_seo_drafts").upsert({
      tour_id: data.tourId,
      page_title: data.pageTitle,
      meta_description: data.metaDescription,
      h1: data.h1,
      updated_by: context.userId,
    }, { onConflict: "tour_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });