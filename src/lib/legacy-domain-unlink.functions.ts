import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUS = ["todo", "in_progress", "done", "blocked"] as const;

async function assertAdmin(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listLegacyUnlinkChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("legacy_domain_unlink_checklist")
      .select("item_id, status, note, updated_at, updated_by");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertLegacyUnlinkChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string().min(1).max(120),
        status: z.enum(STATUS).optional(),
        note: z.string().max(4000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: Record<string, unknown> = {
      item_id: data.itemId,
      updated_by: context.userId,
    };
    if (data.status !== undefined) payload.status = data.status;
    if (data.note !== undefined) payload.note = data.note;

    const { data: row, error } = await context.supabase
      .from("legacy_domain_unlink_checklist")
      .upsert(payload, { onConflict: "item_id" })
      .select("item_id, status, note, updated_at, updated_by")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });
