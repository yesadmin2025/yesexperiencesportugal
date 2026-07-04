import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUS = ["todo", "in_progress", "done", "blocked"] as const;

export const listLegacyUnlinkChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

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
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const payload: {
      item_id: string;
      updated_by: string;
      status?: (typeof STATUS)[number];
      note?: string | null;
    } = {
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
