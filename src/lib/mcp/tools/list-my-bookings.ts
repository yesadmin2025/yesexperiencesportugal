import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description:
    "List bookings for the signed-in user (matched by verified email). Returns id, tour, date, guests, status, amount and currency. RLS restricts results to the caller's own bookings.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of bookings to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, created_at, booking_type, source_tour_id, source_journey_id, preferred_date, guests, status, amount_total, currency, bokun_confirmation_code",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [
        {
          type: "text",
          text: data.length
            ? `Found ${data.length} booking(s) for ${ctx.getUserEmail() ?? "your account"}.`
            : "No bookings found for your account.",
        },
      ],
      structuredContent: { count: data.length, bookings: data },
    };
  },
});
