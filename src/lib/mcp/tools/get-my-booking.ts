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
  name: "get_my_booking",
  title: "Get one of my bookings",
  description:
    "Get the full details of one of the signed-in user's bookings by id. RLS ensures only the caller's own bookings are returned.",
  inputSchema: {
    bookingId: z.string().uuid().describe("The booking id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bookingId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "No booking with that id is visible to your account." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Booking ${data.id} — status ${data.status}.` }],
      structuredContent: { booking: data },
    };
  },
});
