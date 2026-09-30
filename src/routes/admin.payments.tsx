/**
 * /admin/payments — Vouchers & Payments. Every booking sits in exactly one
 * tab (see lib/ops/payment-reconciliation). Read-only; fixes happen on the
 * single Booking Details page.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { listOpsBookings } from "@/lib/bookingsOps.functions";
import { RECON_TABS, groupBookings, missingDetails, paymentEvidence, type ReconBucket, type ReconRow } from "@/lib/ops/payment-reconciliation";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Vouchers & Payments · YES Admin" },
      { name: "description", content: "Match payments and partner vouchers to tours." },
      { property: "og:title", content: "Vouchers & Payments · YES Admin" },
      { property: "og:description", content: "Match payments and partner vouchers to tours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Could not load payments: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Row = ReconRow & { customer_email: string; guests: number; amount_total: number | null; amount_paid: number | null; currency: string | null };

const day = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "No date";

function PaymentsPage() {
  const load = useServerFn(listOpsBookings);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReconBucket>("missing_details");
  const [q, setQ] = useState("");

  useEffect(() => {
    load({ data: { status: "all", limit: 500 } })
      .then((res) => setRows(res.bookings as unknown as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, [load]);

  const groups = useMemo(() => groupBookings(rows ?? []), [rows]);
  const term = q.trim().toLowerCase();
  const visible = groups[tab].filter((r) =>
    !term || [r.customer_name, r.customer_email, r.external_booking_ref, r.stripe_session_id, r.tour_title].some((v) => v?.toLowerCase().includes(term)),
  );
  const current = RECON_TABS.find((t) => t.id === tab)!;

  return (
    <AdminShell eyebrow="Reconciliation" title="Vouchers & Payments">
      <div role="tablist" aria-label="Payment status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {RECON_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-[13px] ${tab === t.id ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]" : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]"}`}
          >
            {t.label} <span className="ml-1 tabular-nums opacity-80">{rows ? groups[t.id].length : "…"}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">{current.hint}</p>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search payments"
        placeholder="Search guest, email, voucher or payment reference"
        className="mt-4 h-11 w-full rounded-md border border-[color:var(--charcoal)]/15 bg-background px-3 text-[14px]"
      />
      {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
      {rows && visible.length === 0 ? <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)]">Nothing here.</p> : null}
      <ul className="mt-4 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
        {visible.map((r) => {
          const missing = missingDetails(r);
          const evidence = paymentEvidence(r);
          const amount = r.amount_paid ?? r.amount_total;
          return (
            <li key={r.id}>
              <Link to="/admin/bookings/$id" params={{ id: r.id }} className="flex min-h-16 items-start gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[color:var(--charcoal)]">{r.customer_name ?? r.customer_email}</span>
                  <span className="block truncate text-[12.5px] text-[color:var(--charcoal-soft)]">{day(r.preferred_date)} · {r.tour_title ?? r.source_tour_id ?? "Tour to confirm"}</span>
                  <span className="block truncate text-[12px] text-[color:var(--charcoal-soft)]">
                    {evidence ?? "No payment on record"}
                    {r.external_booking_ref ? ` · Ref ${r.external_booking_ref}` : ""}
                    {tab === "missing_details" && missing.length ? ` · Missing ${missing.join(", ")}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {amount ? <span className="block tabular-nums text-[13px] text-[color:var(--teal)]">{new Intl.NumberFormat("en-GB", { style: "currency", currency: (r.currency ?? "eur").toUpperCase() }).format(amount / 100)}</span> : null}
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--teal)]">Open →</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
