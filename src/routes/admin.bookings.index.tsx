/**
 * /admin/bookings — searchable list of reservations.
 * Read-only; pricing and Stripe logic are untouched here.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminBookings } from "@/lib/bookingsAdmin.functions";

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

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format((cents || 0) / 100);
}

function AdminBookingsPage() {
  const list = useServerFn(listAdminBookings);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      list({ data: { search: search || undefined, limit: 100 } })
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
  }, [search, list]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-editorial)] text-3xl text-[color:var(--charcoal)]">
        Bookings
      </h1>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Every reservation, newest first. Open one to see the frozen purchase snapshot.
      </p>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email, tour or Stripe session"
        className="mt-6 w-full rounded-md border border-[color:var(--sand)] bg-white px-4 py-3 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">No bookings found.</p>
      ) : (
        <ul className="mt-6 divide-y divide-[color:var(--sand)] border-y border-[color:var(--sand)]">
          {rows.map((b) => (
            <li key={b.id} className="py-4">
              <Link
                to="/admin/bookings/$id"
                params={{ id: b.id }}
                className="flex flex-col gap-1 hover:opacity-80 min-h-11 justify-center"
              >
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  {new Date(b.created_at).toLocaleDateString()} · {b.booking_type} · {b.status}
                </span>
                <span className="text-base text-[color:var(--charcoal)]">
                  {b.customer_name || b.customer_email} — {b.source_tour_id ?? "—"}
                </span>
                <span className="text-sm text-[color:var(--charcoal-soft)]">
                  {b.preferred_date ?? "date TBC"} · {b.guests} guest{b.guests === 1 ? "" : "s"} ·{" "}
                  {money(b.amount_total, b.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
