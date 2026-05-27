import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_MAPPING_RULES, safeParseRules, type MappingRules } from "@/data/defaultMappingRules";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listMappingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("import_mapping_rules")
      .select("id,name,notes,rules,is_active,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      rules: (data ?? []) as Array<{
        id: string;
        name: string;
        notes: string | null;
        rules: MappingRules;
        is_active: boolean;
        updated_at: string;
      }>,
      defaults: DEFAULT_MAPPING_RULES,
    };
  });

export const saveMappingRules = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      notes: z.string().max(2000).optional().nullable(),
      // We trust the shape minimally; safeParseRules normalizes at runtime.
      rules: z.unknown(),
      isActive: z.boolean().default(false),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const normalized = safeParseRules(data.rules);

    // If activating, deactivate everything else first to satisfy the unique index.
    if (data.isActive) {
      const { error: deactErr } = await supabase
        .from("import_mapping_rules")
        .update({ is_active: false })
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
      if (deactErr) throw new Error(`Deactivate failed: ${deactErr.message}`);
    }

    if (data.id) {
      const { data: row, error } = await supabase
        .from("import_mapping_rules")
        .update({
          name: data.name,
          notes: data.notes ?? null,
          rules: normalized,
          is_active: data.isActive,
        })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { row };
    }

    const { data: row, error } = await supabase
      .from("import_mapping_rules")
      .insert({
        name: data.name,
        notes: data.notes ?? null,
        rules: normalized,
        is_active: data.isActive,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteMappingRules = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("import_mapping_rules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
