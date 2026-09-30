/**
 * /admin/payments — Vouchers & Payments, built on the `payment_records`
 * ledger: one card per real Stripe payment or partner voucher. Links are made
 * only by a person (or by the database when the booking already carries the
 * exact reference). Every action is audited server-side.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listPaymentRecords,
  matchPayment,
  runPaymentMatcher,
  searchBookingsForPayment,
  unmatchPayment,
  type BookingSummary,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments · YES Admin" },
      { name: "description", content: "Match payments and partner vouchers to bookings." },
      { property: "og:title", content: "Payments · YES Admin" },
      { property: "og:description", content: "Match payments and partner vouchers to bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Could not load payments: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Status = "unmatched" | "suggested" | "matched" | "needs_review";
type Tab = Status | "all";
type Candidate = { booking_id: string; score: number; reasons: string[]; label: string | null };
type Payment = {
  id: string;
  provider: string;
  kind: string;
  environment: string;
  provider_payment_id: string | null;
  external_reference: string | null;
  payer_name: string | null;
  payer_email: string | null;
  amount: number | null;
  currency: string | null;
  event_at: string | null;
  booking_id: string | null;
  suggested_booking_id: string | null;
  match_status: Status;
  match_confidence: number | null;
  match_reason: string | null;
  match_candidates: Candidate[] | string[];
  provider_event_ids: string[];
};

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "unmatched", label: "Unmatched", hint: "No booking linked and no strong candidate." },
  { id: "suggested", label: "Suggested", hint: "One clear candidate. Confirm before it is linked." },
  { id: "needs_review", label: "Needs review", hint: "Several bookings fit equally. Pick the right one." },
  { id: "matched", label: "Matched", hint: "Linked to a booking." },
  { id: "all", label: "All", hint: "Every payment and voucher on record." },
];

const STATUS_LABEL: Record<Status, string> = { unmatched: "Unmatched", suggested: "Suggested", matched: "Matched", needs_review: "Needs review" };
const PROVIDER_LABEL: Record<string, string> = { stripe: "Stripe", viator: "Viator voucher", getyourguide: "GetYourGuide voucher", bokun: "Bókun voucher", voucher_email: "Email voucher", manual: "Manual", other: "Other" };

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date";
const tripDay = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No trip date";
const fmtMoney = (cents: number | null, currency: string | null) =>
  cents == null ? "Amount not on record" : new Intl.NumberFormat("en-GB", { style: "currency", currency: (currency ?? "eur").toUpperCase() }).format(cents / 100);

function PaymentsPage() {
  const load = useServerFn(listPaymentRecords);
  const runMatcher = useServerFn(runPaymentMatcher);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [bookings, setBookings] = useState<Record<string, BookingSummary>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("unmatched");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setPayments(res.payments as Payment[]);
      setBookings(res.bookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Open on the first tab that needs a person, else Matched.
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (picked || !payments) return;
    setPicked(true);
    const first = (["unmatched", "needs_review", "suggested"] as const).find((s) => payments.some((p) => p.match_status === s));
    setTab(first ?? "matched");
  }, [payments, picked]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { unmatched: 0, suggested: 0, matched: 0, needs_review: 0, all: 0 };
    for (const p of payments ?? []) {
      c[p.match_status]++;
      c.all++;
    }
    return c;
  }, [payments]);

  const term = q.trim().toLowerCase();
  const visible = (payments ?? [])
    .filter((p) => tab === "all" || p.match_status === tab)
    .filter((p) => {
      if (!term) return true;
      const b = p.booking_id ? bookings[p.booking_id] : undefined;
      return [p.payer_name, p.payer_email, p.external_reference, p.provider_payment_id, b?.customer_name, b?.tour_title].some((v) => v?.toLowerCase().includes(term));
    });
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <AdminShell eyebrow="Reconciliation" title="Payments">
      <div role="tablist" aria-label="Match status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-full border px-4 text-[13px] ${tab === t.id ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]" : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]"}`}
          >
            {t.label} <span className="ml-1 tabular-nums opacity-80">{payments ? counts[t.id] : "…"}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">{current.hint}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search payments"
          placeholder="Search payer, email, voucher or payment reference"
          className="h-11 w-full min-w-0 rounded-md border border-[color:var(--charcoal)]/15 bg-background px-3 text-[14px]"
        />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNotice(null);
            try {
              const r = await runMatcher();
              setNotice(`Checked ${r.checked} open payments: ${r.suggested} suggested, ${r.needs_review} need review, ${r.unmatched} unmatched. Nothing was linked.`);
              await refresh();
            } catch (e) {
              setNotice(e instanceof Error ? e.message : "Could not check matches.");
            } finally {
              setBusy(false);
            }
          }}
          className="min-h-11 shrink-0 rounded-md border border-[color:var(--teal)] px-4 text-[12px] uppercase tracking-[0.16em] text-[color:var(--teal)] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Find matches"}
        </button>
      </div>
      {notice ? <p role="status" className="mt-3 text-[13px] text-[color:var(--charcoal)]">{notice}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
      {payments && visible.length === 0 ? <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)]">Nothing here.</p> : null}

      <ul className="mt-4 space-y-3">
        {visible.map((p) => (
          <PaymentCard key={p.id} payment={p} bookings={bookings} onChanged={refresh} />
        ))}
      </ul>
    </AdminShell>
  );
}

function BookingLine({ b, extra }: { b: BookingSummary; extra?: string | null }) {
  return (
    <span className="block min-w-0">
      <span className="block break-words text-[13.5px] text-[color:var(--charcoal)]">
        {b.customer_name ?? b.customer_email ?? "Guest to confirm"}
        {b.closed || extra ? <span className="ml-2 text-[11.5px] uppercase tracking-[0.12em] text-[#8A6B23]">{extra ?? b.payment_label}</span> : null}
      </span>
      <span className="block break-words text-[12.5px] text-[color:var(--charcoal-soft)]">
        {tripDay(b.preferred_date)} · {b.tour_title ?? "Tour to confirm"}
        {b.external_booking_ref ? ` · Ref ${b.external_booking_ref}` : ""}
      </span>
      <span className="block text-[12px] text-[color:var(--charcoal-soft)]">Payment · {b.payment_label} · Details · {b.completeness_label}</span>
    </span>
  );
}

function PaymentCard({ payment: p, bookings, onChanged }: { payment: Payment; bookings: Record<string, BookingSummary>; onChanged: () => Promise<void> }) {
  const match = useServerFn(matchPayment);
  const unmatch = useServerFn(unmatchPayment);
  const search = useServerFn(searchBookingsForPayment);
  const [picking, setPicking] = useState(false);
  const [sq, setSq] = useState(p.payer_email ?? p.payer_name ?? "");
  const [results, setResults] = useState<BookingSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const linked = p.booking_id ? bookings[p.booking_id] : undefined;
  const suggested = p.suggested_booking_id ? bookings[p.suggested_booking_id] : undefined;
  const candidates = (p.match_candidates ?? [])
    .map((c) => (typeof c === "string" ? { booking_id: c, score: 0, reasons: [], label: null } : c))
    .filter((c) => c.booking_id !== p.suggested_booking_id && bookings[c.booking_id]);
  const ref = p.external_reference ?? p.provider_payment_id;

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(done);
      setPicking(false);
      await onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  const doMatch = (bookingId: string, reason: string) => act(() => match({ data: { paymentId: p.id, bookingId, reason } }), "Linked.");

  return (
    <li className="rounded-lg border border-[color:var(--charcoal)]/10 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
            {fmtDate(p.event_at)} · {PROVIDER_LABEL[p.provider] ?? p.provider}
            {p.environment === "sandbox" ? " · Test" : ""}
          </p>
          <p className="mt-1 break-words text-[14.5px] text-[color:var(--charcoal)]">{p.payer_name ?? "Payer name not on record"}</p>
          {p.payer_email ? <p className="break-all text-[12.5px] text-[color:var(--charcoal-soft)]">{p.payer_email}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-[14px] text-[color:var(--teal)]">{fmtMoney(p.amount, p.currency)}</p>
          <p className="mt-1 text-[11.5px] text-[color:var(--charcoal)]">{STATUS_LABEL[p.match_status]}</p>
        </div>
      </div>
      {ref ? <p className="mt-2 break-all text-[12px] text-[color:var(--charcoal-soft)]">Ref {ref}</p> : null}
      {p.provider_event_ids.length > 1 ? <p className="text-[12px] text-[color:var(--charcoal-soft)]">{p.provider_event_ids.length} Stripe notices, counted once</p> : null}
      {p.match_reason ? <p className="mt-1 text-[12px] text-[color:var(--charcoal-soft)]">{p.match_reason}</p> : null}

      {linked ? (
        <div className="mt-3 border-t border-[color:var(--charcoal)]/[0.07] pt-3">
          <BookingLine b={linked} />
        </div>
      ) : null}
      {!linked && suggested ? (
        <div className="mt-3 border-t border-[color:var(--charcoal)]/[0.07] pt-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A6B23]">Possible match — check before linking</p>
          <BookingLine b={suggested} />
        </div>
      ) : null}
      {!linked && candidates.length ? (
        <div className="mt-3 border-t border-[color:var(--charcoal)]/[0.07] pt-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">Possible bookings</p>
          <ul className="mt-1 space-y-2">
            {candidates.map((c) => (
              <li key={c.booking_id} className="flex items-start justify-between gap-3">
                <BookingLine b={bookings[c.booking_id]!} extra={c.label} />
                <button type="button" disabled={busy} onClick={() => doMatch(c.booking_id, `Chosen from candidates: ${c.reasons.join(", ")}`)} className="min-h-11 shrink-0 rounded-md border border-[color:var(--teal)] px-3 text-[12px] text-[color:var(--teal)]">
                  Link
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!linked && suggested ? (
          <button type="button" disabled={busy} onClick={() => doMatch(suggested.id, `Confirmed suggestion: ${p.match_reason ?? ""}`)} className="min-h-11 rounded-md bg-[color:var(--teal)] px-4 text-[12px] uppercase tracking-[0.14em] text-[color:var(--ivory)]">
            Match to suggested
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={() => setPicking((v) => !v)} aria-expanded={picking} className="min-h-11 rounded-md border border-[color:var(--charcoal)]/20 px-4 text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal)]">
          {linked ? "Link another booking" : "Choose a booking"}
        </button>
        {linked ? (
          <>
            <button type="button" disabled={busy} onClick={() => { if (window.confirm("Undo this match? The payment goes back to Unmatched.")) void act(() => unmatch({ data: { paymentId: p.id } }), "Match undone."); }} className="min-h-11 rounded-md border border-[color:var(--charcoal)]/20 px-4 text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal)]">
              Undo match
            </button>
            <Link to="/admin/bookings/$id" params={{ id: linked.id }} className="inline-flex min-h-11 items-center rounded-md px-2 text-[12px] uppercase tracking-[0.14em] text-[color:var(--teal)]">
              Open booking →
            </Link>
          </>
        ) : null}
      </div>

      {picking ? (
        <form
          className="mt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (sq.trim().length < 2) return;
            try {
              const r = await search({ data: { q: sq } });
              setResults(r.bookings);
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Search failed.");
            }
          }}
        >
          <div className="flex gap-2">
            <input value={sq} onChange={(e) => setSq(e.target.value)} aria-label="Search bookings" placeholder="Name, email, phone, ref, tour or 2026-10-02" className="h-11 w-full min-w-0 rounded-md border border-[color:var(--charcoal)]/15 bg-background px-3 text-[14px]" />
            <button type="submit" className="min-h-11 shrink-0 rounded-md border border-[color:var(--teal)] px-3 text-[12px] text-[color:var(--teal)]">Search</button>
          </div>
          {results && results.length === 0 ? <p className="mt-2 text-[12.5px] text-[color:var(--charcoal-soft)]">No bookings found.</p> : null}
          <ul className="mt-2 space-y-2">
            {(results ?? []).map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3">
                <BookingLine b={b} />
                <button type="button" disabled={busy || b.id === p.booking_id} onClick={() => doMatch(b.id, "Chosen by admin from search")} className="min-h-11 shrink-0 rounded-md border border-[color:var(--teal)] px-3 text-[12px] text-[color:var(--teal)] disabled:opacity-40">
                  Link
                </button>
              </li>
            ))}
          </ul>
        </form>
      ) : null}
      {msg ? <p role="status" className="mt-2 text-[12.5px] text-[color:var(--charcoal)]">{msg}</p> : null}
    </li>
  );
}
