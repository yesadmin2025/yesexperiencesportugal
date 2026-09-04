/**
 * /admin/bookings — phone-first list of reservations.
 * Read-only; pricing and Stripe logic are untouched here.
 *
 * Default view groups by WHEN the trip runs (today / tomorrow / upcoming /
 * needs attention / past) instead of when it was booked, because the operator
 * reads this on a phone in the morning, not at a desk.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminBookings } from "@/lib/bookingsAdmin.functions";
import { formatGuestComposition } from "@/components/studio-v3/formatGuests";
import { BookingsAvailabilityCalendar } from "@/components/admin/BookingsAvailabilityCalendar";
import { PHONE_DISPLAY, WHATSAPP_NUMBER } from "@/config/business-nap";

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

/** Guest phone lives in the frozen snapshot too — never invented. */
function phoneOf(b: Row): string | null {
  const d = (b.booking_details ?? {}) as Record<string, unknown>;
  const guest = (d["guestDetails"] ?? {}) as Record<string, unknown>;
  const snapshot = (d["snapshot"] ?? {}) as Record<string, unknown>;
  const candidates = [d["customerPhone"], guest["phone"], snapshot["customerPhone"]];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 3);
  return typeof hit === "string" ? hit.trim() : null;
}

/** Start time as captured at checkout, when it exists. */
function startTimeOf(b: Row): string | null {
  const d = (b.booking_details ?? {}) as Record<string, unknown>;
  const snapshot = (d["snapshot"] ?? {}) as Record<string, unknown>;
  const hit = [d["startTime"], snapshot["startTime"]].find(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
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

/** Local Lisbon day key (YYYY-MM-DD) for "today"/"tomorrow" bucketing. */
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

type Bucket = "attention" | "today" | "tomorrow" | "upcoming" | "undated" | "past";

const BUCKET_LABEL: Record<Bucket, string> = {
  attention: "Needs attention",
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  undated: "Date to confirm",
  past: "Past",
};

const BUCKET_ORDER: Bucket[] = ["attention", "today", "tomorrow", "upcoming", "undated", "past"];

function bucketOf(b: Row, today: string, tomorrow: string): Bucket {
  // Anything not paid, and anything paid with no pickup on file, needs a human.
  const unresolved = b.status !== "paid" && b.status !== "cancelled" && b.status !== "refunded";
  const missingPickup = b.status === "paid" && !pickupOf(b) && !!b.preferred_date;
  if (unresolved || missingPickup) return "attention";
  if (!b.preferred_date) return "undated";
  if (b.preferred_date === today) return "today";
  if (b.preferred_date === tomorrow) return "tomorrow";
  return b.preferred_date > today ? "upcoming" : "past";
}

function AdminBookingsPage() {
  const list = useServerFn(listAdminBookings);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
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

  const groups = useMemo(() => {
    const now = new Date();
    const today = dayKey(now);
    const tomorrow = dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const map = new Map<Bucket, Row[]>();
    for (const b of rows) {
      const k = bucketOf(b, today, tomorrow);
      const arr = map.get(k) ?? [];
      arr.push(b);
      map.set(k, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, c) => {
        const da = a.preferred_date ?? "";
        const dc = c.preferred_date ?? "";
        // Past reads newest-first; everything else reads soonest-first.
        return k === "past" ? dc.localeCompare(da) : da.localeCompare(dc);
      });
    }
    return BUCKET_ORDER.map((k) => [k, map.get(k) ?? []] as const).filter(
      ([, arr]) => arr.length > 0,
    );
  }, [rows]);

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
        Grouped by the day the trip runs. Open one to see the frozen purchase snapshot.
      </p>

      <BookingsAvailabilityCalendar />

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search bookings by guest name, email, tour or Stripe session"
        placeholder="Search guest name, email, tour…"
        className="mt-5 w-full rounded-md border border-[color:var(--sand)] bg-white px-4 py-3 text-base"
      />

      <div className="mt-3 flex flex-wrap gap-2">
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

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">No bookings found.</p>
      ) : (
        <>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {rows.length} trip{rows.length === 1 ? "" : "s"} ·{" "}
            {money(totalCents, rows[0]?.currency ?? "eur")}
          </p>

          {groups.map(([bucket, list]) => (
            <section key={bucket} className="mt-8" data-bucket={bucket}>
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
                {BUCKET_LABEL[bucket]}{" "}
                <span className="text-[color:var(--charcoal-soft)]">({list.length})</span>
              </h2>
              <ul className="mt-3 divide-y divide-[color:var(--sand)] border-y border-[color:var(--sand)]">
                {list.map((b) => {
                  const phone = phoneOf(b);
                  const time = startTimeOf(b);
                  return (
                    <li key={b.id} className="py-4">
                      <Link
                        to="/admin/bookings/$id"
                        params={{ id: b.id }}
                        className="flex flex-col gap-1 hover:opacity-80 min-h-11 justify-center"
                      >
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                          {b.preferred_date ?? "date TBC"}
                          {time ? ` · ${time}` : ""} · {b.status}
                        </span>
                        <span className="text-base text-[color:var(--charcoal)]">
                          {b.customer_name || b.customer_email}
                        </span>
                        <span className="text-sm text-[color:var(--charcoal-soft)]">
                          {b.source_tour_id ?? "—"} · {b.booking_type}
                        </span>
                        <span className="text-sm text-[color:var(--charcoal)]">
                          {partyOf(b)} · {money(b.amount_total, b.currency)}
                        </span>
                        <span className="text-sm text-[color:var(--charcoal-soft)]">
                          Pickup: {pickupOf(b) ?? "—"}
                        </span>
                      </Link>

                      {/* One-tap reach on a phone. Guest number when we have it,
                          otherwise our own line — never a fabricated number. */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {phone ? (
                          <>
                            <a
                              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                              className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--sand)] px-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--teal)]"
                            >
                              Call {phone}
                            </a>
                            <a
                              href={`https://wa.me/${phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--sand)] px-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--teal)]"
                            >
                              WhatsApp
                            </a>
                          </>
                        ) : (
                          <span className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                            No guest phone on file
                          </span>
                        )}
                        <a
                          href={`mailto:${b.customer_email}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--sand)] px-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--teal)]"
                        >
                          Email
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Our own line: {PHONE_DISPLAY} ·{" "}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="underline">
              WhatsApp
            </a>
          </p>
        </>
      )}
    </main>
  );
}
