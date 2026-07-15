/**
 * list_my_signature_journeys — returns Studio V3 Signature journeys saved by
 * the signed-in user, matched by their verified account email.
 *
 * Only reads rows the caller owns (status='saved' + contact_email matches the
 * OAuth-verified email). Never invents journeys; if the user has none saved,
 * returns an empty list with a short note.
 */

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_signature_journeys",
  title: "List my Signature journeys",
  description:
    "List the Studio V3 Signature journeys saved by the signed-in YES Experiences user (their own journeys only).",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of journeys to return. Defaults to 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated." }],
        isError: true,
      };
    }
    const email = ctx.getUserEmail();
    if (!email) {
      return {
        content: [
          {
            type: "text",
            text: "Signed-in account has no verified email — cannot look up saved journeys.",
          },
        ],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("studio_v3_leads")
      .select("id, journey_title, skeleton_tour_key, share_token, saved_at")
      .eq("status", "saved")
      .eq("contact_email", email)
      .order("saved_at", { ascending: false })
      .limit(limit ?? 10);

    if (error) {
      return {
        content: [{ type: "text", text: `Lookup failed: ${error.message}` }],
        isError: true,
      };
    }

    const journeys = (data ?? []).map((row) => ({
      id: row.id as string,
      journeyTitle: (row.journey_title as string | null) ?? null,
      skeletonTourKey: (row.skeleton_tour_key as string | null) ?? null,
      shareToken: (row.share_token as string | null) ?? null,
      savedAt: (row.saved_at as string | null) ?? null,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            journeys.length === 0
              ? "You have no saved Signature journeys yet."
              : JSON.stringify(journeys, null, 2),
        },
      ],
      structuredContent: { journeys, count: journeys.length },
    };
  },
});
