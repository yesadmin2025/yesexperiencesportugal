/**
 * Studio v2 — resumable draft persistence.
 *
 * `emailStudioDraft` stores a draft in `studio_drafts` and returns a
 * resume token + URL. `loadStudioDraft` re-hydrates a draft by token.
 *
 * Draft payload crosses the RPC boundary as a JSON string to satisfy the
 * TanStack serialisation contract (Record<string, unknown> is rejected).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_URL = "https://yesexperiencesportugal.com";

export const emailStudioDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(254),
        draftJson: z.string().min(2).max(100_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.draftJson);
    } catch {
      throw new Error("Invalid draft payload");
    }
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabaseAdmin.from("studio_drafts").insert({
      resume_token: token,
      email: data.email,
      draft: parsed as never,
    });
    if (error) throw new Error(error.message);
    const resumeUrl = `${SITE_URL}/studio?resume=${token}`;
    return { ok: true as const, token, resumeUrl };
  });

export const loadStudioDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(8).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("studio_drafts")
      .select("draft, expires_at")
      .eq("resume_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, draftJson: "" };
    if (new Date(row.expires_at).getTime() < Date.now())
      return { ok: false as const, draftJson: "" };
    return { ok: true as const, draftJson: JSON.stringify(row.draft ?? {}) };
  });
