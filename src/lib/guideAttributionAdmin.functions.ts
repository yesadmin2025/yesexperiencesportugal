/**
 * Admin read: which Journal guide drives clicks and bookings.
 *
 * Read-only aggregation. Clicks come from `guide_link_clicks`; bookings are
 * matched by the `guide_slug` written into Stripe metadata at checkout and
 * copied into `bookings.metadata` by the webhook. Nothing here prices or
 * mutates anything.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

const input = z.object({ days: z.number().int().min(1).max(365).default(30) });

export interface GuideAttributionRow {
  guideSlug: string;
  clicks: number;
  clicksBySlot: Record<string, number>;
  bookings: number;
  revenueCents: number;
}

export const getGuideAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [clicksRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("guide_link_clicks")
        .select("guide_slug, slot, destination_kind, created_at")
        .gte("created_at", since)
        .limit(5000),
      supabaseAdmin
        .from("bookings")
        .select("id, status, amount_total, metadata, created_at")
        .eq("status", "paid")
        .gte("created_at", since)
        .limit(1000),
    ]);

    if (clicksRes.error) throw new Error(clicksRes.error.message);
    if (bookingsRes.error) throw new Error(bookingsRes.error.message);

    const rows = new Map<string, GuideAttributionRow>();
    const row = (slug: string) => {
      let r = rows.get(slug);
      if (!r) {
        r = { guideSlug: slug, clicks: 0, clicksBySlot: {}, bookings: 0, revenueCents: 0 };
        rows.set(slug, r);
      }
      return r;
    };

    for (const c of clicksRes.data ?? []) {
      const slug = (c as { guide_slug?: string }).guide_slug;
      if (!slug) continue;
      const r = row(slug);
      r.clicks += 1;
      const slot = (c as { slot?: string }).slot || "unknown";
      r.clicksBySlot[slot] = (r.clicksBySlot[slot] ?? 0) + 1;
    }

    let attributedBookings = 0;
    for (const b of bookingsRes.data ?? []) {
      const meta = ((b as { metadata?: unknown }).metadata ?? {}) as Record<string, unknown>;
      const slug = typeof meta.guide_slug === "string" ? meta.guide_slug : null;
      if (!slug) continue;
      attributedBookings += 1;
      const r = row(slug);
      r.bookings += 1;
      r.revenueCents += Number((b as { amount_total?: number }).amount_total ?? 0);
    }

    const list = [...rows.values()].sort(
      (a, b) => b.bookings - a.bookings || b.clicks - a.clicks,
    );

    return {
      days: data.days,
      totalClicks: list.reduce((n, r) => n + r.clicks, 0),
      attributedBookings,
      totalPaidBookings: (bookingsRes.data ?? []).length,
      rows: list,
    };
  });
