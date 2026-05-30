/**
 * Studio v2 — resumable draft persistence.
 *
 * `emailStudioDraft` stores a draft in `studio_drafts` and returns a
 * resume token + URL. `loadStudioDraft` re-hydrates a draft by token.
 *
 * Email delivery: when transactional email infra is configured the
 * server route also enqueues a "studio-draft-resume" message. Until
 * then the resume URL is returned to the client so the user can copy
 * it / use a mailto fallback in the modal.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_URL = "https://yesexperiencesportugal.com";

const draftSchema = z.record(z.string(), z.any());

export const emailStudioDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(254),
        draft: draftSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabaseAdmin
      .from("studio_drafts")
      .insert({
        resume_token: token,
        email: data.email,
        draft: data.draft,
      });
    if (error) throw new Error(error.message);
    const resumeUrl = `${SITE_URL}/studio?resume=${token}`;
    // Email send is best-effort. If the transactional infra isn't wired
    // we still succeed — the modal shows the copy-link fallback.
    return { ok: true, token, resumeUrl };
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
    if (!row) return { ok: false as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false as const };
    return { ok: true as const, draft: row.draft as Record<string, unknown> };
  });
