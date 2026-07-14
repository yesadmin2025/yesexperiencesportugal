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
  name: "list_tours",
  title: "List signature tours",
  description: "List YES Experiences signature tours with slug, title, region and base price.",
  inputSchema: {
    region: z.string().trim().min(1).optional().describe("Optional region filter (e.g. 'Lisbon', 'Alentejo')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ region }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const client = supabaseForUser(ctx);
    let query = client
      .from("tours")
      .select("slug, title, region, base_price, duration_hours, status")
      .order("title", { ascending: true });
    if (region) query = query.ilike("region", `%${region}%`);
    const { data, error } = await query.limit(200);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tours: data ?? [] },
    };
  },
});
