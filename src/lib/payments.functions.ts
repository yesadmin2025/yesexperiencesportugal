/**
 * Payments & vouchers reconciliation (admin only). Reads `payment_records`;
 * every link/undo/suggestion goes through audited RPCs
 * (ops_payment_match / ops_payment_unmatch / ops_payment_set_suggestion).
 * Money is never changed here.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decideMatch, parentBookingIds, type MatchBooking, type MatchPayment } from "@/lib/ops/payment-matcher";
import { derivePaymentState, deriveCompleteness, PAYMENT_LABEL, completenessLabel } from "@/lib/ops/booking-state";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

const PAYMENT_COLUMNS =
  "id, provider, kind, environment, provider_event_ids, provider_payment_id, payment_intent_id, external_reference, payer_name, payer_email, amount, currency, event_at, booking_id, suggested_booking_id, match_status, match_confidence, match_reason, match_candidates, matched_by, matched_at, created_at";

const BOOKING_COLUMNS =
  "id, created_at, status, payment_status, source_channel, stripe_session_id, stripe_payment_intent_id, external_booking_ref, customer_name, customer_email, customer_phone, amount_total, amount_paid, currency, tour_title, source_tour_id, preferred_date, pickup_location, metadata";

export type BookingSummary = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  tour_title: string | null;
  preferred_date: string | null;
  external_booking_ref: string | null;
  source_channel: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_label: string;
  completeness_label: string;
  closed: boolean;
};

function summarize(b: any): BookingSummary {
  const state = derivePaymentState(b);
  return {
    id: b.id,
    customer_name: b.customer_name,
    customer_email: b.customer_email,
    tour_title: b.tour_title ?? b.source_tour_id,
    preferred_date: b.preferred_date,
    external_booking_ref: b.external_booking_ref,
    source_channel: b.source_channel,
    amount_total: b.amount_total,
    currency: b.currency,
    payment_label: PAYMENT_LABEL[state],
    completeness_label: completenessLabel(deriveCompleteness(b)),
    closed: state === "cancelled" || state === "refunded",
  };
}

async function loadBookingsById(supabase: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: Record<string, BookingSummary> = {};
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase.from("bookings").select(BOOKING_COLUMNS).in("id", unique.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const b of data ?? []) out[b.id] = summarize(b);
  }
  return out;
}

function candidateIds(rows: any[]): string[] {
  return rows.flatMap((r) => [
    r.booking_id,
    r.suggested_booking_id,
    ...(Array.isArray(r.match_candidates) ? r.match_candidates.map((c: any) => (typeof c === "string" ? c : c?.booking_id)) : []),
  ]);
}

export const listPaymentRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("payment_records")
      .select(PAYMENT_COLUMNS)
      .order("event_at", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const bookings = await loadBookingsById(context.supabase, candidateIds(rows));
    return { payments: rows, bookings };
  });

async function loadAllBookings(supabase: any): Promise<MatchBooking[]> {
  const out: MatchBooking[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("bookings").select(BOOKING_COLUMNS).order("created_at").range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Recompute suggestions for every payment that is not already matched. Never links. */
export const runPaymentMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const { data, error } = await sb.from("payment_records").select(PAYMENT_COLUMNS).neq("match_status", "matched");
    if (error) throw new Error(error.message);
    const bookings = await loadAllBookings(sb);
    const counts = { checked: 0, changed: 0, suggested: 0, needs_review: 0, unmatched: 0 };
    for (const p of (data ?? []) as MatchPayment[]) {
      const d = decideMatch(p, bookings);
      counts.checked++;
      counts[d.status]++;
      const { data: changed, error: rpcErr } = await sb.rpc("ops_payment_set_suggestion", {
        _payment_id: p.id,
        _status: d.status,
        _booking_id: d.booking_id,
        _confidence: d.confidence,
        _reason: d.reason,
        _candidates: d.candidates,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      if (changed) counts.changed++;
    }
    return counts;
  });

export const matchPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid(), bookingId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("ops_payment_match", {
      _payment_id: data.paymentId,
      _booking_id: data.bookingId,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unmatchPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("ops_payment_unmatch", { _payment_id: data.paymentId, _reason: data.reason ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Candidate search across canonical bookings: name, email, phone, refs, tour, date. */
export const searchBookingsForPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const q = data.q.replace(/[%,()]/g, " ").trim();
    let query = (context.supabase as any).from("bookings").select(BOOKING_COLUMNS).limit(20).order("preferred_date", { ascending: false, nullsFirst: false });
    if (UUID.test(q)) query = query.eq("id", q);
    else if (/^\d{4}-\d{2}-\d{2}$/.test(q)) query = query.eq("preferred_date", q);
    else {
      const like = `%${q}%`;
      query = query.or(
        ["customer_name", "customer_email", "customer_phone", "external_booking_ref", "tour_title", "source_tour_id", "stripe_session_id"]
          .map((c) => `${c}.ilike.${like}`)
          .join(","),
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { bookings: (rows ?? []).map(summarize) };
  });

/** Booking Details: payments linked to this booking, plus its package parent's payments (shown, not re-counted). */
export const listBookingPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const { data: booking, error: bErr } = await sb.from("bookings").select("id, metadata").eq("id", data.bookingId).maybeSingle();
    if (bErr) throw new Error(bErr.message);
    const parents = booking ? parentBookingIds(booking).filter((id) => UUID.test(id)) : [];
    const { data: own, error } = await sb.from("payment_records").select(PAYMENT_COLUMNS).eq("booking_id", data.bookingId);
    if (error) throw new Error(error.message);
    let viaParent: any[] = [];
    if (parents.length) {
      const res = await sb.from("payment_records").select(PAYMENT_COLUMNS).in("booking_id", parents);
      if (res.error) throw new Error(res.error.message);
      viaParent = res.data ?? [];
    }
    const ids = [...(own ?? []), ...viaParent].map((p: any) => p.id);
    let history: any[] = [];
    if (ids.length) {
      const res = await sb.from("payment_match_log").select("id, payment_id, action, previous_status, new_status, booking_id, previous_booking_id, reason, actor_user_id, created_at").in("payment_id", ids).order("created_at", { ascending: false }).limit(50);
      if (res.error) throw new Error(res.error.message);
      history = res.data ?? [];
    }
    return { own: own ?? [], viaParent, parents, history };
  });
