import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { signatureTours } from "@/data/signatureTours";

export default defineTool({
  name: "list_signature_tours",
  title: "List Signature tours",
  description:
    "List the published Signature tour catalog (id, title, region, duration, theme, from-price in EUR, and short blurb). Public catalog data — safe to read without side effects.",
  inputSchema: {
    region: z
      .string()
      .optional()
      .describe(
        "Optional case-insensitive substring to filter by region (e.g. 'Sintra', 'Alentejo', 'Arrábida').",
      ),
    theme: z
      .string()
      .optional()
      .describe(
        "Optional case-insensitive substring to filter by theme (e.g. 'Wine', 'Culture').",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ region, theme }) => {
    const r = region?.trim().toLowerCase();
    const th = theme?.trim().toLowerCase();
    const items = signatureTours
      .filter((t) => (r ? t.region.toLowerCase().includes(r) : true))
      .filter((t) => (th ? t.theme.toLowerCase().includes(th) : true))
      .map((t) => ({
        id: t.id,
        title: t.title,
        region: t.region,
        duration: t.duration,
        durationHours: t.durationHours,
        theme: t.theme,
        priceFromEUR: t.priceFrom,
        blurb: t.blurb,
      }));
    return {
      content: [
        {
          type: "text",
          text: items.length
            ? `Found ${items.length} Signature tour(s).`
            : "No Signature tours match those filters.",
        },
      ],
      structuredContent: { count: items.length, tours: items },
    };
  },
});
