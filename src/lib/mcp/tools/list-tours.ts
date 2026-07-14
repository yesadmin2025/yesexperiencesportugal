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
  title: "List imported tours",
  description: "List YES Experiences tours (title, region, duration, starting price).",
  inputSchema: {
    region: z.string().trim().min(1).optional().describe("Optional region filter (e.g. 'Lisbon', 'Alentejo')."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ region, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const client = supabaseForUser(ctx);
    let query = client
      .from("imported_tours")
      .select("id, title, region, region_label, duration_label, duration_hours, price_from, tier, theme, source_url")
      .order("title", { ascending: true })
      .limit(limit ?? 50);
    if (region) query = query.or(`region.ilike.%${region}%,region_label.ilike.%${region}%`);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tours: data ?? [] },
    };
  },
});
