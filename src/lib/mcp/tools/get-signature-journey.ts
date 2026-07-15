/**
 * get_signature_journey — fetches the full saved Studio V3 state for one of
 * the signed-in user's own Signature journeys, looked up by share token.
 *
 * Filters on both the token AND the caller's verified account email so users
 * cannot fetch another traveller's journey even if they guess a share token.
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
  name: "get_signature_journey",
  title: "Get a Signature journey",
  description:
    "Fetch the full saved Studio V3 Signature journey (title, tour, saved state) by its share token. Only returns the journey when it belongs to the signed-in user.",
  inputSchema: {
    shareToken: z
      .string()
      .trim()
      .min(6)
      .max(40)
      .regex(/^[a-z0-9]+$/i)
      .describe("The share token from `list_my_signature_journeys`."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ shareToken }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated." }],
        isError: true,
      };
    }
    const email = ctx.getUserEmail();
    if (!email) {
      return {
        content: [{ type: "text", text: "Signed-in account has no verified email." }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("studio_v3_leads")
      .select("id, journey_title, skeleton_tour_key, share_token, saved_at, state")
      .eq("share_token", shareToken)
      .eq("status", "saved")
      .eq("contact_email", email)
      .maybeSingle();

    if (error) {
      return {
        content: [{ type: "text", text: `Lookup failed: ${error.message}` }],
        isError: true,
      };
    }
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "No Signature journey with that share token is saved under your account.",
          },
        ],
        isError: true,
      };
    }

    const journey = {
      id: data.id as string,
      journeyTitle: (data.journey_title as string | null) ?? null,
      skeletonTourKey: (data.skeleton_tour_key as string | null) ?? null,
      shareToken: (data.share_token as string | null) ?? null,
      savedAt: (data.saved_at as string | null) ?? null,
      state: data.state ?? {},
    };

    return {
      content: [{ type: "text", text: JSON.stringify(journey, null, 2) }],
      structuredContent: { journey },
    };
  },
});
