/**
 * Booking Details → Payment & Vouchers. Sourced only from `payment_records`.
 * Package children show their parent's payments as "via package" and do not
 * add them to this booking's total, so money is never counted twice.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listBookingPayments } from "@/lib/payments.functions";
import { totalPaid } from "@/lib/ops/payment-matcher";

type P = { id: string; provider: string; kind: string; environment: string; provider_payment_id: string | null; external_reference: string | null; amount: number | null; currency: string | null; event_at: string | null; match_status: string; booking_id: string | null; provider_event_ids: string[] };
type H = { id: string; action: string; reason: string | null; created_at: string };

const PROVIDER: Record<string, string> = { stripe: "Stripe", viator: "Viator voucher", getyourguide: "GetYourGuide voucher", bokun: "Bókun voucher", manual: "Manual", voucher_email: "Email voucher", other: "Other" };
const ACTION: Record<string, string> = { backfill_created: "Recorded", auto_linked: "Linked by exact reference", match: "Linked by admin", undo: "Match undone", suggested: "Suggested", needs_review: "Sent to review", unmatched: "Unmatched", event_folded: "Repeat notice folded" };
const money = (c: number | null, cur: string | null) => (c == null ? "Amount not on record" : new Intl.NumberFormat("en-GB", { style: "currency", currency: (cur ?? "eur").toUpperCase() }).format(c / 100));

export function BookingPaymentsPanel({ bookingId, paymentLabel }: { bookingId: string; paymentLabel?: string | null }) {
  const load = useServerFn(listBookingPayments);
  const [data, setData] = useState<{ own: P[]; viaParent: P[]; history: H[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load({ data: { bookingId } })
      .then((r) => setData(r as never))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load payments."));
  }, [load, bookingId]);

  const own = data?.own ?? [];
  const currency = own[0]?.currency ?? null;
  const row = (p: P, via: boolean) => (
    <li key={`${via ? "v" : "o"}-${p.id}`} className="flex items-start justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[13.5px] text-[color:var(--charcoal)]">
          {PROVIDER[p.provider] ?? p.provider}
          {p.environment === "sandbox" ? " · Test" : ""}
          {via ? " · via package" : ""}
        </span>
        <span className="block break-all text-[12px] text-[color:var(--charcoal-soft)]">
          {p.event_at ? new Date(p.event_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date"}
          {p.external_reference ?? p.provider_payment_id ? ` · Ref ${p.external_reference ?? p.provider_payment_id}` : ""}
        </span>
        {via && p.booking_id ? (
          <Link to="/admin/bookings/$id" params={{ id: p.booking_id }} className="text-[12px] text-[color:var(--teal)]">Open package booking →</Link>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        <span className="block tabular-nums text-[13.5px] text-[color:var(--teal)]">{money(p.amount, p.currency)}</span>
        <span className="block text-[11.5px] capitalize text-[color:var(--charcoal-soft)]">{p.match_status.replace("_", " ")}</span>
      </span>
    </li>
  );

  return (
    <section className="mt-6 rounded-lg border border-[color:var(--sand)] bg-white p-5" aria-labelledby="pay-vouchers">
      <h2 id="pay-vouchers" className="font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">Payment & Vouchers</h2>
      {paymentLabel ? <p className="mt-1 text-[13px] text-[color:var(--charcoal-soft)]">Payment status · {paymentLabel}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
      {data && own.length === 0 && data.viaParent.length === 0 ? (
        <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">No payment or voucher linked yet. Link one from Vouchers & Payments.</p>
      ) : null}
      <ul className="mt-2 divide-y divide-[color:var(--sand)]">
        {own.map((p) => row(p, false))}
        {data?.viaParent.map((p) => row(p, true))}
      </ul>
      {own.length > 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--charcoal)]">
          Recorded on this booking · <span className="tabular-nums">{money(totalPaid(own), currency)}</span>
        </p>
      ) : null}
      {data?.history.length ? (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">Match history</summary>
          <ul className="space-y-1">
            {data.history.map((h) => (
              <li key={h.id} className="text-[12px] text-[color:var(--charcoal-soft)]">
                {new Date(h.created_at).toLocaleString("en-GB")} · {ACTION[h.action] ?? h.action}
                {h.reason ? ` — ${h.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
