import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Same auth and role check as the existing operational booking functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorize(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Stripe-confirmed site receipts only; OTA payments cannot be independently verified here. */
export const getReceivedRevenueByExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await authorize(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const totals = new Map<string, { key: string; title: string; currency: string; cents: number; count: number }>();
    let offset = 0;
    const size = 500;
    while (true) {
      const { data, error } = await supabaseAdmin.from("bookings")
        .select("id,source_tour_id,tour_title,booking_type,currency,amount_total,stripe_session_id")
        .eq("status", "paid")
        .not("stripe_session_id", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + size - 1);
      if (error) throw new Error("Could not load received revenue.");
      for (const row of data ?? []) {
        if (typeof row.amount_total !== "number" || row.amount_total <= 0) continue;
        const key = row.booking_type === "builder" ? "Studio" : row.source_tour_id ?? row.tour_title ?? row.booking_type;
        const currency = (row.currency || "eur").toUpperCase();
        const groupKey = `${key}\u0000${currency}`;
        const existing = totals.get(groupKey) ?? {
          key: groupKey, title: key,
          currency, cents: 0, count: 0,
        };
        existing.cents += row.amount_total;
        existing.count += 1;
        totals.set(groupKey, existing);
      }
      if ((data ?? []).length < size) break;
      offset += size;
    }
    return [...totals.values()].sort((a, b) => b.cents - a.cents);
  });

/** Uploaded references remain session-scoped until a verified booking link exists. */
export const getAdminGuestFileHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ page: z.number().int().min(0).max(10000).default(0) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await authorize(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const size = 25;
    const { data: rows, error, count } = await supabaseAdmin.from("builder_reference_uploads")
      .select("id,session_id,file_name,file_path,mime_type,file_size_bytes,created_at,expires_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * size, data.page * size + size - 1);
    if (error) throw new Error("Could not load guest files.");
    const files = await Promise.all((rows ?? []).map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage.from("builder-references").createSignedUrl(row.file_path, 300);
      return {
        id: row.id, sessionId: row.session_id, name: row.file_name,
        mimeType: row.mime_type, bytes: row.file_size_bytes, createdAt: row.created_at,
        expiresAt: row.expires_at, url: signed?.signedUrl ?? null,
      };
    }));
    return { files, total: count ?? 0 };
  });