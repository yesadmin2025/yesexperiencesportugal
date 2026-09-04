/**
 * /admin/bookings — searchable list of reservations.
 * Read-only; pricing and Stripe logic are untouched here.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminBookings } from "@/lib/bookingsAdmin.functions";
import { formatGuestComposition } from "@/components/studio-v3/formatGuests";
import { BookingsAvailabilityCalendar } from "@/components/admin/BookingsAvailabilityCalendar";

export const Route = createFileRoute("/admin/bookings/")({
  component: AdminBookingsPage,
  head: () => ({
    meta: [{ title: "Bookings · Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Row = {
  id: string;
  created_at: string;
  booking_type: string;
  source_tour_id: string | null;
  customer_name: string | null;
  customer_email: string;
  guests: number;
  preferred_date: string | null;
  amount_total: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  booking_details: Record<string, unknown> | null;
};

/** Pickup is stored inside the frozen booking_details snapshot, not as a column. */
function pickupOf(b: Row): string | null {
  const d = b.booking_details;
  if (!d || typeof d !== "object") return null;
  const guest = (d as { guestDetails?: Record<string, unknown> }).guestDetails;
  const candidates = [
    (d as Record<string, unknown>)["pickupAddress"],
    (d as Record<string, unknown>)["pickupLabel"],
    guest?.["pickupAddress"],
  ];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit : null;
}

/** Party split comes from the frozen composition; never guessed. */
function partyOf(b: Row): string {
  const d = (b.booking_details ?? {}) as Record<string, unknown>;
  const comp = (d["composition"] ?? {}) as Record<string, unknown>;
  const adults = typeof comp["adults"] === "number" ? (comp["adults"] as number) : null;
  const minorAges = Array.isArray(comp["minorAges"]) ? (comp["minorAges"] as number[]) : null;
  return formatGuestComposition(adults, minorAges, b.guests) ?? `${b.guests} guests`;
}

const STATUSES = ["paid", "pending", "cancelled", "refunded", "all"] as const;
type StatusFilter = (typeof STATUSES)[number];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format((cents || 0) / 100);
}

function AdminBookingsPage() {
  const list = useServerFn(listAdminBookings);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("paid");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      list({ data: { search: search || undefined, status, limit: 100 } })
        .then((r) => {
          if (!active) return;
          setRows((r.bookings ?? []) as Row[]);
          setError(null);
        })
        .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, status, list]);

  const totalCents = rows.reduce((sum, b) => sum + (b.amount_total || 0), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        to="/admin"
        className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]"
      >
        ← Admin
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-editorial)] text-3xl text-[color:var(--charcoal)]">
        Guest trips
      </h1>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Paid reservations first, newest at the top. Open one to see the frozen purchase snapshot.
      </p>

      <BookingsAvailabilityCalendar />

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`min-h-11 rounded-full border px-4 text-[11px] uppercase tracking-[0.16em] transition-colors ${
              status === s
                ? "border-[color:var(--charcoal)] bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                : "border-[color:var(--sand)] text-[color:var(--charcoal-soft)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email, tour or Stripe session"
        className="mt-4 w-full rounded-md border border-[color:var(--sand)] bg-white px-4 py-3 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">No bookings found.</p>
      ) : (
        <>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {rows.length} trip{rows.length === 1 ? "" : "s"} · {money(totalCents, rows[0]?.currency ?? "eur")}
          </p>
          <ul className="mt-3 divide-y divide-[color:var(--sand)] border-y border-[color:var(--sand)]">
            {rows.map((b) => (
              <li key={b.id} className="py-4">
                <Link
                  to="/admin/bookings/$id"
                  params={{ id: b.id }}
                  className="flex flex-col gap-1 hover:opacity-80 min-h-11 justify-center"
                >
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                    {b.booking_type} · {b.status} · booked{" "}
                    {new Date(b.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-base text-[color:var(--charcoal)]">
                    {b.customer_name || b.customer_email}
                  </span>
                  <span className="text-sm text-[color:var(--charcoal-soft)]">
                    {b.source_tour_id ?? "—"}
                  </span>
                  <span className="text-sm text-[color:var(--charcoal)]">
                    {b.preferred_date ?? "date TBC"} · {partyOf(b)} ·{" "}
                    {money(b.amount_total, b.currency)}
                  </span>
                  <span className="text-sm text-[color:var(--charcoal-soft)]">
                    Pickup: {pickupOf(b) ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
