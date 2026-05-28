import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Anonymous deletion of a builder reference upload.
 *
 * Why this is a server function (not a direct client delete):
 *   The previous client-side flow relied on permissive RLS policies
 *   (`USING (true)` on the table; `IS NOT NULL` on storage.objects)
 *   which the Supabase linter flagged as "RLS Policy Always True".
 *   Those policies have been dropped. Deletes now run server-side
 *   using `supabaseAdmin` (RLS-bypassing) AFTER we verify the caller
 *   actually owns the row by joining `id` + `session_id`. The session
 *   id is the only credential anonymous builder users have — treating
 *   it as an unguessable bearer token mirrors how the rest of the
 *   builder flow already works and keeps the linter happy.
 */
const Input = z.object({
  rowId: z.string().uuid(),
  sessionId: z.string().min(8).max(64),
});

export const deleteBuilderReference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { rowId, sessionId } = data;

    // 1. Look up the row, scoped to the caller's session id. If the
    //    pair doesn't match, we treat it as an unauthorized attempt
    //    and return early — never reveal whether the row exists under
    //    a different session.
    const { data: row, error: lookupErr } = await supabaseAdmin
      .from("builder_reference_uploads")
      .select("id, session_id, file_path")
      .eq("id", rowId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (lookupErr) {
      return { ok: false as const, reason: "lookup_failed" };
    }
    if (!row) {
      return { ok: false as const, reason: "not_found" };
    }

    // 2. Best-effort remove the underlying storage object first so a
    //    table delete never orphans a file. Failures on the object
    //    side are logged but don't block the row delete (the cleanup
    //    cron will sweep it).
    const { error: storageErr } = await supabaseAdmin.storage
      .from("builder-references")
      .remove([row.file_path]);
    if (storageErr) {
      // Non-fatal — surface for observability.
      console.warn(
        `[deleteBuilderReference] storage remove failed for ${row.file_path}:`,
        storageErr.message,
      );
    }

    // 3. Delete the row, double-scoped on session_id for safety.
    const { error: delErr } = await supabaseAdmin
      .from("builder_reference_uploads")
      .delete()
      .eq("id", rowId)
      .eq("session_id", sessionId);
    if (delErr) {
      return { ok: false as const, reason: "delete_failed" };
    }

    return { ok: true as const };
  });
