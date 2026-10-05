import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConversionReport = {
  days: number;
  visitors: number;
  pageViews: number;
  bookingStarts: number;
  leads: number;
  leadsBySource: { source: string; count: number }[];
  paid: number;
  revenueEur: number;
  avgEur: number;
  byPath: { path: string; visitors: number; paid: number }[];
  topPages: { path: string; visitors: number }[];
  ctaClicks: { cta: string; clicks: number; visitors: number }[];
  ctaByPage: { path: string; tailor: number; studio: number; signature: number }[];
  landingPages: { path: string; visitors: number; clickedCta: number; startedBooking: number }[];
  emailIssues: {
    bookingId: string;
    sessionId: string | null;
    customer: string | null;
    email: string | null;
    createdAt: string;
    receipt: string;
    team: string;
  }[];
};

const LEAD_TABLES = [
  ["contact_messages", "Contact"],
  ["booking_requests", "Booking requests"],
  ["studio_v3_leads", "Studio"],
  ["lead_captures", "Lead capture"],
] as const;

function pathOf(type: string | null): string {
  if (type === "builder" || type === "tailored") return "studio";
  if (type === "signature") return "signature";
  if (type === "multi-day") return "travel_designer";
  return "other";
}

export const getConversionReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ days: z.number().int().min(1).max(365) }).parse(i))
  .handler(async ({ data, context }): Promise<ConversionReport> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");
    const sb = context.supabase;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const visits: { visitor_id: string; path: string; product_path: string | null; event: string }[] = [];
    for (let from = 0; from < 200000; from += 1000) {
      const { data: rows, error } = await sb
        .from("site_visits")
        .select("visitor_id,path,product_path,event")
        .gte("created_at", since)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      visits.push(...(rows ?? []));
      if (!rows || rows.length < 1000) break;
    }
    const views = visits.filter((v) => v.event === "view");
    const visitorSet = new Set(views.map((v) => v.visitor_id));
    const startSet = new Set(visits.filter((v) => v.event === "booking_start").map((v) => v.visitor_id));

    const ctaRows = visits.filter((v) => v.event === "cta_click");
    const ctaClicks = ["tailor", "studio", "signature"].map((c) => {
      const rows = ctaRows.filter((r) => r.product_path === c);
      return { cta: c, clicks: rows.length, visitors: new Set(rows.map((r) => r.visitor_id)).size };
    });
    const pageCta = new Map<string, { tailor: number; studio: number; signature: number }>();
    for (const r of ctaRows) {
      const k = r.product_path as "tailor" | "studio" | "signature" | null;
      if (!k) continue;
      const e = pageCta.get(r.path) ?? { tailor: 0, studio: 0, signature: 0 };
      e[k] += 1;
      pageCta.set(r.path, e);
    }
    const ctaVisitors = new Set(ctaRows.map((r) => r.visitor_id));
    const landingMap = new Map<string, Set<string>>();
    for (const v of visits.filter((x) => x.event === "landing")) {
      if (!landingMap.has(v.path)) landingMap.set(v.path, new Set());
      landingMap.get(v.path)!.add(v.visitor_id);
    }
    const landingPages = [...landingMap.entries()]
      .map(([path, s]) => ({
        path,
        visitors: s.size,
        clickedCta: [...s].filter((id) => ctaVisitors.has(id)).length,
        startedBooking: [...s].filter((id) => startSet.has(id)).length,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 15);

    const pathVisitors = new Map<string, Set<string>>();
    const pageVisitors = new Map<string, Set<string>>();
    for (const v of views) {
      const p = v.product_path ?? "other";
      if (!pathVisitors.has(p)) pathVisitors.set(p, new Set());
      pathVisitors.get(p)!.add(v.visitor_id);
      if (!pageVisitors.has(v.path)) pageVisitors.set(v.path, new Set());
      pageVisitors.get(v.path)!.add(v.visitor_id);
    }

    const leadsBySource: { source: string; count: number }[] = [];
    for (const [table, label] of LEAD_TABLES) {
      if (table === "contact_messages") {
        for (const journey of [true, false]) {
          const query = sb.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", since);
          const { count, error } = await (journey
            ? query.eq("request_type", "multi_day")
            : query.or("request_type.neq.multi_day,request_type.is.null"));
          if (error) throw new Error(error.message);
          leadsBySource.push({ source: journey ? "Travel Designer enquiries" : label, count: count ?? 0 });
        }
        continue;
      }
      const { count } = await sb
        .from(table)
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      leadsBySource.push({ source: label, count: count ?? 0 });
    }

    const { data: bookings } = await sb
      .from("bookings")
      .select("id,booking_type,amount_total,amount_paid,final_total_eur,stripe_session_id,customer_name,customer_email,created_at")
      .eq("status", "paid")
      .like("stripe_session_id", "cs_live_%")
      .gte("created_at", since);
    const paidRows = bookings ?? [];
    const revenue = paidRows.reduce(
      (s, b) => s + (b.amount_paid ?? b.amount_total ?? 0) / 100,
      0,
    );
    const paidByPath = new Map<string, number>();
    for (const b of paidRows) {
      const p = pathOf(b.booking_type as string);
      paidByPath.set(p, (paidByPath.get(p) ?? 0) + 1);
    }

    // Email safety: every paid live booking must have a sent receipt + team alert.
    const emailIssues: ConversionReport["emailIssues"] = [];
    const sessionIds = paidRows.map((b) => b.stripe_session_id).filter(Boolean) as string[];
    if (sessionIds.length) {
      const { data: logs } = await sb
        .from("email_send_log")
        .select("message_id,template_name,status,created_at")
        .in("template_name", ["checkout-receipt", "internal-booking"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      const latest = new Map<string, string>();
      for (const l of logs ?? []) {
        if (l.message_id && !latest.has(l.message_id)) latest.set(l.message_id, l.status);
      }
      const statusFor = (prefix: string) => {
        let best = "missing";
        for (const [k, s] of latest) {
          if (k.startsWith(prefix)) {
            if (s === "sent") return "sent";
            best = s;
          }
        }
        return best;
      };
      for (const b of paidRows) {
        const sid = b.stripe_session_id!;
        const receipt = statusFor(`checkout-receipt-${sid}`);
        const team = statusFor(`internal-booking-${sid}`);
        if (receipt !== "sent" || team !== "sent") {
          emailIssues.push({
            bookingId: b.id,
            sessionId: sid,
            customer: b.customer_name,
            email: b.customer_email,
            createdAt: b.created_at,
            receipt,
            team,
          });
        }
      }
    }

    const paths = ["signature", "studio", "travel_designer", "moments", "corporate"];
    return {
      days: data.days,
      visitors: visitorSet.size,
      pageViews: views.length,
      bookingStarts: startSet.size,
      leads: leadsBySource.reduce((s, l) => s + l.count, 0),
      leadsBySource,
      paid: paidRows.length,
      revenueEur: Math.round(revenue),
      avgEur: paidRows.length ? Math.round(revenue / paidRows.length) : 0,
      byPath: paths.map((p) => ({
        path: p,
        visitors: pathVisitors.get(p)?.size ?? 0,
        paid: paidByPath.get(p) ?? 0,
      })),
      topPages: [...pageVisitors.entries()]
        .map(([path, s]) => ({ path, visitors: s.size }))
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, 10),
      ctaClicks,
      ctaByPage: [...pageCta.entries()]
        .map(([path, c]) => ({ path, ...c }))
        .sort((a, b) => b.tailor + b.studio + b.signature - (a.tailor + a.studio + a.signature))
        .slice(0, 15),
      landingPages,
      emailIssues,
    };
  });
