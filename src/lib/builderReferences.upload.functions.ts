import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Anonymous upload of a builder reference file.
 *
 * Why this is a server function (not a direct client upload):
 *   The previous flow relied on a permissive storage.objects INSERT
 *   policy that only checked a generic folder-name pattern — any
 *   anonymous caller could write into another guest's `<sessionId>/`
 *   folder by matching that pattern. The security scanner flagged
 *   this ("STORAGE_MISSING_OWNERSHIP_CHECK") because the policy did
 *   not tie the upload path to the actual requesting client.
 *
 *   The anon INSERT policies on both `storage.objects` (for the
 *   builder-references bucket) and `public.builder_reference_uploads`
 *   have been dropped. All writes now flow through this server
 *   function, which uses the RLS-bypassing `supabaseAdmin` client
 *   AFTER validating that the caller's `sessionId` matches what
 *   the file path claims.
 *
 * Ownership proof (server-issued upload pass):
 *   Knowing a sessionId alone is not enough to write into it. The
 *   first upload for a session "claims" it: the server mints a
 *   random pass, stores it in `builder_session_passes` (service-role
 *   only, no client access) and returns it to the caller, who keeps
 *   it in localStorage. Every later upload must present that pass;
 *   a missing or wrong pass is rejected. A stranger who learns a
 *   sessionId (e.g. via a shared link) cannot upload into a session
 *   that has already been claimed.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_FILES_PER_SESSION = 5;

const Input = z.object({
  sessionId: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  fileSizeBytes: z.number().int().positive().max(MAX_BYTES),
  // base64-encoded file bytes (no data: prefix)
  base64: z
    .string()
    .min(4)
    .max(Math.ceil((MAX_BYTES * 4) / 3) + 64),
  // Server-issued ownership pass for this session. Absent only on the
  // very first upload, which claims the session and receives the pass.
  pass: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

function newPass(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64url, 32 chars, ~144 bits of entropy
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const uploadBuilderReference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { sessionId, fileName, mimeType, fileSizeBytes, base64, pass } = data;

    if (!ALLOWED_MIME.has(mimeType)) {
      return { ok: false as const, reason: "unsupported_type" };
    }

    // Ownership check: the session must either be unclaimed (first
    // upload — we mint and return a pass) or the caller must present
    // the pass issued when the session was claimed.
    const { data: passRow, error: passErr } = await supabaseAdmin
      .from("builder_session_passes")
      .select("pass")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (passErr) {
      return { ok: false as const, reason: "ownership_check_failed" };
    }

    let issuedPass: string | null = null;
    if (passRow) {
      if (!pass || pass !== passRow.pass) {
        return { ok: false as const, reason: "forbidden" };
      }
    } else {
      // Claim the session. If two callers race, the loser's insert
      // violates the primary key and is rejected — only the winner's
      // pass is ever returned.
      issuedPass = newPass();
      const { error: claimErr } = await supabaseAdmin
        .from("builder_session_passes")
        .insert({ session_id: sessionId, pass: issuedPass });
      if (claimErr) {
        return { ok: false as const, reason: "forbidden" };
      }
    }

    // Enforce per-session cap server-side (defence-in-depth; the UI
    // already blocks at 5 but a direct API caller could bypass it).
    const { count, error: countErr } = await supabaseAdmin
      .from("builder_reference_uploads")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    if (countErr) {
      return { ok: false as const, reason: "count_failed" };
    }
    if ((count ?? 0) >= MAX_FILES_PER_SESSION) {
      return { ok: false as const, reason: "limit_reached" };
    }

    // Decode base64 → bytes and cross-check size.
    let bytes: Uint8Array;
    try {
      const bin = atob(base64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { ok: false as const, reason: "bad_encoding" };
    }
    if (bytes.byteLength !== fileSizeBytes) {
      return { ok: false as const, reason: "size_mismatch" };
    }
    if (bytes.byteLength > MAX_BYTES) {
      return { ok: false as const, reason: "too_large" };
    }

    // Path is *constructed here* — the client can never influence
    // which folder the file lands in. This is the ownership binding
    // the storage policy previously lacked.
    const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(0, 80);
    const path = `${sessionId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("builder-references")
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (upErr) {
      console.error("[uploadBuilderReference] storage upload failed:", upErr.message);
      return { ok: false as const, reason: "storage_failed" };
    }

    const { data: publicUrl } = supabaseAdmin.storage.from("builder-references").getPublicUrl(path);

    const { data: row, error: insErr } = await supabaseAdmin
      .from("builder_reference_uploads")
      .insert({
        session_id: sessionId,
        file_path: path,
        // file_url column is legacy/NOT NULL — clients now read via
        // short-lived signed URLs served by listBuilderReferences.
        file_url: publicUrl.publicUrl,
        file_name: fileName.slice(0, 200),
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !row) {
      // Roll back the storage object so we don't orphan the file.
      await supabaseAdmin.storage
        .from("builder-references")
        .remove([path])
        .catch(() => {});
      console.error("[uploadBuilderReference] row insert failed:", insErr?.message);
      return { ok: false as const, reason: "insert_failed" };
    }

    return { ok: true as const, rowId: row.id, filePath: path };
  });
