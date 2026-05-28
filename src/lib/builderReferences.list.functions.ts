import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Session-scoped reference upload helpers.
 *
 * The `builder_reference_uploads` table is no longer publicly readable,
 * and the `builder-references` storage bucket is private. Anonymous
 * builder users access their own uploads via these server functions,
 * which scope everything by the unguessable session_id (the only
 * credential anonymous builder users have — treated as a bearer token).
 *
 * Files are returned with short-lived signed URLs (5 min) instead of
 * public URLs, so leaking a row doesn't leak the file forever.
 */
const Input = z.object({
  sessionId: z.string().min(8).max(64),
});

const SIGNED_URL_TTL_SECONDS = 60 * 5;

export const listBuilderReferences = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("builder_reference_uploads")
      .select(
        "id,file_path,file_name,mime_type,file_size_bytes,tone_summary,tone_keywords,analyzed_at,created_at",
      )
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) {
      return { ok: false as const, reason: "lookup_failed", rows: [] as const };
    }

    const safe = rows ?? [];
    const signed = await Promise.all(
      safe.map(async (r) => {
        const { data: sig } = await supabaseAdmin.storage
          .from("builder-references")
          .createSignedUrl(r.file_path, SIGNED_URL_TTL_SECONDS);
        return {
          id: r.id,
          file_path: r.file_path,
          file_name: r.file_name,
          mime_type: r.mime_type,
          file_size_bytes: r.file_size_bytes,
          tone_summary: r.tone_summary,
          tone_keywords: r.tone_keywords ?? [],
          analyzed_at: r.analyzed_at,
          created_at: r.created_at,
          signed_url: sig?.signedUrl ?? null,
        };
      }),
    );

    return { ok: true as const, rows: signed };
  });
