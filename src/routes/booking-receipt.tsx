import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, Loader2, AlertCircle, Download } from "lucide-react";
import { BUSINESS_LEGAL_NAME, EMAIL, LICENSE_LABEL, PHONE_DISPLAY } from "@/config/business-nap";
import { tourReservationLd } from "@/lib/jsonld";

interface Search {
  session_id?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  amountEur: number;
}

interface SessionReceipt {
  status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  customerName: string | null;
  receiptUrl: string | null;
  created: number | null;
  lineItems?: LineItem[];
  metadata?: Record<string, string>;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const Route = createFileRoute("/booking-receipt")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your booking receipt — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Printable receipt for your private Portugal experience: final price, per-person breakdown and selected add-ons.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Your booking receipt — YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Printable summary of your booking: final price, breakdown and add-ons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingReceiptPage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);

function BookingReceiptPage() {
  const { session_id } = useSearch({ from: "/booking-receipt" });
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: SessionReceipt }
    | { kind: "error"; message: string }
  >({ kind: session_id ? "loading" : "idle" });

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/stripe-session-status?session_id=${encodeURIComponent(session_id)}`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
        );
        const body = (await res.json()) as SessionReceipt | { error: string };
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          setState({
            kind: "error",
            message: "error" in body ? body.error : "Could not load this receipt.",
          });
          return;
        }
        setState({ kind: "ok", data: body });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Could not load this receipt.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  // Paid-only: a session that exists but is not paid must not disclose the
  // buyer, the line items, the metadata or the itinerary download.
  const paid = state.kind === "ok" && state.data.paymentStatus === "paid";
  const notPaid = state.kind === "ok" && !paid;
  const data = paid && state.kind === "ok" ? state.data : null;
  const meta = data?.metadata ?? {};
  const addOns: Array<{ label: string; priceEur: number }> = (() => {
    try {
      const parsed = JSON.parse(meta.add_ons ?? "[]");
      return Array.isArray(parsed)
        ? parsed
            .filter((a) => a && typeof a.label === "string")
            .map((a) => ({ label: String(a.label), priceEur: Number(a.priceEur) || 0 }))
        : [];
    } catch {
      return [];
    }
  })();

  const total = data?.amountTotal != null ? data.amountTotal / 100 : null;
  const journeyLines = (data?.lineItems ?? []).filter((l) => !/^Add-on —/.test(l.description));
  const addOnLines = (data?.lineItems ?? []).filter((l) => /^Add-on —/.test(l.description));

  // Machine-readable receipt. Emitted only once a PAID Stripe session has
  // loaded — never for a pending session and never with placeholder values.
  // The page is noindex, so this serves receipt/assistant parsers rather
  // than search snippets.
  const reservationLd =
    data && session_id
      ? tourReservationLd({
          reservationId: session_id,
          name:
            journeyLines[0]?.description ??
            meta.tour_title ??
            "Private Portugal experience — YES Experiences",
          status: "confirmed",
          totalPrice: total,
          currency: data.currency,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          bookingTime: data.created ? new Date(data.created * 1000).toISOString() : null,
        })
      : null;


  return (
    <main className="min-h-screen bg-[color:var(--sand)]/30 py-10 print:bg-white print:py-0">
      {reservationLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reservationLd) }}
        />
      ) : null}
      <div className="container-x max-w-2xl">
        {/* Screen-only actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/booking-confirmed"
            search={session_id ? { session_id } : {}}
            className="inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <ArrowLeft size={14} /> Back to confirmation
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {session_id ? (
              <a
                href={`/api/public/booking-itinerary?session_id=${encodeURIComponent(session_id)}`}
                className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--charcoal)]/25 px-5 text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:border-[color:var(--gold)]"
              >
                <Download size={14} /> Download itinerary
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center gap-2 bg-[color:var(--teal)] px-5 text-[12px] uppercase tracking-[0.2em] text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)]"
            >
              <Printer size={14} /> Print / save PDF
            </button>
          </div>
        </div>


        <article className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-6 sm:p-9 print:border-0 print:p-0">
          <header className="border-b border-[color:var(--border)] pb-5">
            <p className="text-[10.5px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
              Receipt
            </p>
            <h1 className="mt-2 text-[1.6rem] leading-tight text-[color:var(--charcoal)] serif">
              YES Experiences Portugal
            </h1>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
              {BUSINESS_LEGAL_NAME} · {EMAIL} · {PHONE_DISPLAY}
            </p>
          </header>

          {state.kind === "loading" ? (
            <p className="flex items-center gap-2 py-10 text-[14px] text-[color:var(--charcoal-soft)]">
              <Loader2 size={16} className="animate-spin" /> Loading your receipt…
            </p>
          ) : null}

          {state.kind === "idle" ? (
            <p className="py-10 text-[14px] text-[color:var(--charcoal-soft)]">
              No booking reference provided. Open this page from your confirmation link.
            </p>
          ) : null}

          {state.kind === "error" ? (
            <p className="flex items-start gap-2 py-10 text-[14px] text-[color:var(--charcoal-soft)]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {state.message}
            </p>
          ) : null}

          {data ? (
            <>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 border-b border-[color:var(--border)] py-5 sm:grid-cols-2">
                <Meta label="Reference" value={session_id ? session_id.slice(-12) : "—"} />
                <Meta
                  label="Issued"
                  value={
                    data.created
                      ? new Date(data.created * 1000).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : new Date().toLocaleDateString("en-US")
                  }
                />
                <Meta label="Guest" value={data.customerName ?? data.customerEmail ?? "—"} />
                <Meta label="Email" value={data.customerEmail ?? "—"} />
                {meta.journey_title ? <Meta label="Experience" value={meta.journey_title} /> : null}
                {meta.date_exact ? (
                  <Meta
                    label="Experience date"
                    value={`${meta.date_exact}${meta.start_time ? ` · ${meta.start_time}` : ""}`}
                  />
                ) : null}
                {meta.pickup ? <Meta label="Pickup" value={meta.pickup} /> : null}
                {meta.guests ? (
                  <Meta
                    label="Party"
                    value={`${meta.guests} guest${meta.guests === "1" ? "" : "s"}${
                      meta.minor_ages ? ` · ages ${meta.minor_ages.split(",").join(", ")}` : ""
                    }`}
                  />
                ) : null}
                <Meta
                  label="Payment status"
                  value={data.paymentStatus === "paid" ? "Paid in full" : data.paymentStatus}
                />
              </dl>

              <section className="py-5">
                <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                  Breakdown
                </h2>
                <ul className="mt-3 divide-y divide-[color:var(--border)]">
                  {journeyLines.length > 0 ? (
                    journeyLines.map((l, i) => (
                      <LineRow
                        key={`j-${i}`}
                        label={l.description}
                        note={l.quantity > 1 ? `× ${l.quantity}` : undefined}
                        amount={eur(l.amountEur)}
                      />
                    ))
                  ) : meta.per_pax_eur && meta.guests ? (
                    <LineRow
                      label="Experience"
                      note={`${eur(Number(meta.per_pax_eur))} per person × ${meta.guests}`}
                      amount={eur(Number(meta.tour_subtotal_eur ?? 0))}
                    />
                  ) : null}
                </ul>
                {meta.tailor_lunch_removed === "1" ? (
                  <p
                    data-testid="receipt-lunch-removal"
                    className="mt-3 text-[12.5px] leading-relaxed text-[color:var(--teal)]"
                  >
                    Included lunch removed — −{eur(Number(meta.tailor_lunch_removal_eur_pp ?? 15))}{" "}
                    per person, already applied to the per-person price above.
                  </p>
                ) : null}
              </section>

              <section className="border-t border-[color:var(--border)] py-5">
                <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                  Selected add-ons
                </h2>
                {addOnLines.length > 0 || addOns.length > 0 ? (
                  <ul className="mt-3 divide-y divide-[color:var(--border)]">
                    {addOnLines.length > 0
                      ? addOnLines.map((l, i) => (
                          <LineRow
                            key={`a-${i}`}
                            label={l.description.replace(/^Add-on — /, "")}
                            note={l.quantity > 1 ? `× ${l.quantity}` : undefined}
                            amount={eur(l.amountEur)}
                          />
                        ))
                      : addOns.map((a, i) => (
                          <LineRow key={`am-${i}`} label={a.label} amount={eur(a.priceEur)} />
                        ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13.5px] text-[color:var(--charcoal-soft)]">
                    No add-ons selected.
                  </p>
                )}
              </section>

              <section className="border-t-2 border-[color:var(--charcoal)]/25 pt-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                  <span className="min-w-0 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                    Final price
                  </span>
                  <span className="shrink-0 text-[1.5rem] leading-none text-[color:var(--charcoal)] serif">
                    {total != null ? eur(total) : "—"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  Amount charged, taxes included. Paid by card via our secure processor.
                </p>
              </section>

              <footer className="mt-8 border-t border-[color:var(--border)] pt-5 text-[11.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                <p>
                  {BUSINESS_LEGAL_NAME} · {LICENSE_LABEL}
                </p>
                <p className="mt-1">
                  Questions about this booking? Reply to your confirmation email or write to {EMAIL}
                  .
                </p>
              </footer>
            </>
          ) : null}
        </article>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[14px] leading-snug text-[color:var(--charcoal)]">
        {value}
      </dd>
    </div>
  );
}

function LineRow({ label, note, amount }: { label: string; note?: string; amount: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-[14px] leading-snug text-[color:var(--charcoal)]">{label}</p>
        {note ? (
          <p className="mt-0.5 text-[12px] text-[color:var(--charcoal-soft)]">{note}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-[14px] tabular-nums text-[color:var(--charcoal)]">
        {amount}
      </span>
    </li>
  );
}
