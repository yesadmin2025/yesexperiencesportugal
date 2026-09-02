/**
 * Server-side scan of database text columns for lingering legacy
 * references (old domain, legacy booking URLs, GBP Place IDs / CIDs,
 * legacy GBP/GSC URLs). The source-code side is scanned client-side in
 * /admin/legacy-scan via Vite's import.meta.glob so we don't need to
 * ship the whole repo to the worker.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEGACY_PATTERNS, categorizeMatch, type LegacyCategory } from "./legacy-scan-patterns";

/** Admin-only gate, identical to the pattern used by other admin server fns. */
async function assertAdmin(context: { userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roleRow, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !roleRow) throw new Error("Forbidden");
}

export type DbHit = {
  table: string;
  column: string;
  rowId: string;
  category: LegacyCategory;
  match: string;
  snippet: string;
};

type Probe = { table: string; idCol: string; cols: string[] };

// Narrow, deliberate list — tables/columns that plausibly hold URLs or
// free-text pasted by staff or scrapers.
const PROBES: Probe[] = [
  {
    table: "journal_posts",
    idCol: "id",
    cols: ["body", "excerpt", "hero_image_url", "cover_image_url"],
  },
  { table: "contact_messages", idCol: "id", cols: ["message"] },
  { table: "tour_reviews", idCol: "id", cols: ["body", "author_name", "source_url"] },
  { table: "imported_tours", idCol: "id", cols: ["source_url", "description", "raw_json"] },
  { table: "tour_gallery_photos", idCol: "id", cols: ["storage_path", "credit"] },
  { table: "editorial_image_overrides", idCol: "id", cols: ["image_url", "credit"] },
  { table: "experience_images", idCol: "id", cols: ["url", "alt"] },
  { table: "builder_reference_uploads", idCol: "id", cols: ["storage_path", "notes"] },
  { table: "studio_v3_leads", idCol: "id", cols: ["notes", "referrer"] },
  { table: "lead_captures", idCol: "id", cols: ["message", "referrer"] },
  { table: "booking_quotes", idCol: "id", cols: ["notes"] },
];

export const scanDatabaseLegacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ hits: DbHit[]; skipped: string[]; scanned: number }> => {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hits: DbHit[] = [];
    const skipped: string[] = [];
    let scanned = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    for (const probe of PROBES) {
      try {
        const { data, error } = (await admin
          .from(probe.table)
          .select([probe.idCol, ...probe.cols].join(","))) as {
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        };
        if (error) {
          skipped.push(`${probe.table}: ${error.message}`);
          continue;
        }
        if (!data) continue;
        for (const row of data) {
          scanned++;
          const rowId = String(row[probe.idCol] ?? "");
          for (const col of probe.cols) {
            const val = row[col];
            if (val == null) continue;
            const text = typeof val === "string" ? val : JSON.stringify(val);
            for (const pat of LEGACY_PATTERNS) {
              const re = new RegExp(pat.regex, pat.flags);
              let m: RegExpExecArray | null;
              while ((m = re.exec(text))) {
                const start = Math.max(0, m.index - 40);
                const end = Math.min(text.length, m.index + m[0].length + 40);
                hits.push({
                  table: probe.table,
                  column: col,
                  rowId,
                  category: categorizeMatch(pat.id),
                  match: m[0],
                  snippet: text.slice(start, end).replace(/\s+/g, " "),
                });
                if (!pat.flags.includes("g")) break;
              }
            }
          }
        }
      } catch (e) {
        skipped.push(`${probe.table}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { hits, skipped, scanned };
  },
);
