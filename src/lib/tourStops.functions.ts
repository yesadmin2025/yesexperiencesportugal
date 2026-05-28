import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TourStopRef = {
  label: string;
  region: string;
  tourId: string;
  tourTitle: string;
};

/** Pull every stop from every imported tour, flattened with tour metadata. */
export const getAllImportedStops = createServerFn({ method: "GET" }).handler(
  async (): Promise<TourStopRef[]> => {
    const { data, error } = await supabaseAdmin
      .from("imported_tours")
      .select("id, title, region, stops");

    if (error || !data) return [];

    const out: TourStopRef[] = [];
    for (const row of data) {
      const stops = Array.isArray(row.stops) ? row.stops : [];
      for (const s of stops) {
        // Stops may be plain strings or { label } objects
        const label =
          typeof s === "string"
            ? s
            : s && typeof s === "object" && "label" in s
              ? String((s as { label: unknown }).label)
              : null;
        if (!label) continue;
        out.push({
          label,
          region: row.region ?? "lisbon",
          tourId: row.id,
          tourTitle: row.title ?? "Tour",
        });
      }
    }
    return out;
  },
);
