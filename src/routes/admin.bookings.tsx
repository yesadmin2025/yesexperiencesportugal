// Admin bookings review panel.
//
// Lists paid bookings that need human attention on the Bokun side:
// bokun_status = 'needs_review' or 'failed'. Each row shows the customer,
// tour, date, amount, Bokun status/error and a deep link into the Bokun
// extranet so the operator can reconcile the reservation manually.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Filter, Beaker } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type BookingRow = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  guests: number | null;
  preferred_date: string | null;
  source_tour_id: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string | null;
  stripe_session_id: string | null;
  bokun_booking_id: string | null;
  bokun_confirmation_code: string | null;
  bokun_status: string | null;
  bokun_error: string | null;
  bokun_last_attempt_at: string | null;
};

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Bookings panel failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings review — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBookingsPage,
  errorComponent: ErrorView,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

const STATUS_FILTERS = [
  { id: "review", label: "Needs review", values: ["needs_review", "failed"] },
  { id: "needs_review", label: "Needs review only", values: ["needs_review"] },
  { id: "failed", label: "Failed only", values: ["failed"] },
  { id: "all", label: "All bookings", values: null as string[] | null },
] as const;

type FilterId = (typeof STATUS_FILTERS)[number]["id"];

function bokunBookingUrl(bookingId: string): string {
  // Bokun extranet deep link to the booking detail page.
  return `https://app.bokun.io/sales/bookings/${encodeURIComponent(bookingId)}`;
}

function formatMoney(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const tone =
    s === "confirmed"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : s === "needs_review"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : s === "failed"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-[color:var(--sand)] text-[color:var(--charcoal)] border-[color:var(--border)]";
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] uppercase tracking-wider ${tone}`}>
      {s === "confirmed" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {status ?? "—"}
    </span>
  );
}

function AdminBookingsPage() {
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterId>("review");

  useEffect(() => {
    let cancelled = false;
    async function loadSession(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const activeFilter = useMemo(
    () => STATUS_FILTERS.find((f) => f.id === filter) ?? STATUS_FILTERS[0],
    [filter],
  );

  async function fetchRows() {
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select(
        "id, created_at, customer_name, customer_email, customer_phone, guests, preferred_date, source_tour_id, amount_total, currency, status, stripe_session_id, bokun_booking_id, bokun_confirmation_code, bokun_status, bokun_error, bokun_last_attempt_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (activeFilter.values) {
      q = q.in("bokun_status", activeFilter.values);
    }
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error(`Failed to load bookings: ${error.message}`);
      return;
    }
    setRows((data ?? []) as BookingRow[]);
  }

  useEffect(() => {
    if (isAdmin) fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filter]);

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-5xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Bookings review</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Sign in to review bookings.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-5 py-2.5 text-sm hover:bg-black"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Not authorized</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Your account ({session.email ?? session.id}) does not have the
            <code className="mx-1 px-1 bg-[color:var(--sand)]">admin</code>
            role.
          </p>
        </section>
      </SiteLayout>
    );
  }

  const reviewCount = (rows ?? []).filter(
    (r) => r.bokun_status === "needs_review" || r.bokun_status === "failed",
  ).length;

  return (
    <SiteLayout>
      <section className="pt-28 pb-20 container-x max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
            <h1 className="mt-1 text-3xl">Bookings review</h1>
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-2xl">
              Paid Stripe bookings whose automatic Bokun push needs human attention. Open the Bokun
              extranet link to finish the reservation manually, then update the status in Bokun.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TestWebhookButton onDone={fetchRows} />
            <button
              type="button"
              onClick={fetchRows}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[color:var(--border)] px-3 py-2 text-sm hover:border-[color:var(--gold)] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-[color:var(--charcoal-soft)]" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                filter === f.id
                  ? "border-[color:var(--gold)] bg-[color:var(--gold-soft)] text-[color:var(--charcoal)]"
                  : "border-[color:var(--border)] hover:border-[color:var(--gold)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          {rows && (
            <span className="ml-auto text-xs text-[color:var(--charcoal-soft)]">
              Showing {rows.length} · {reviewCount} needing attention
            </span>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border border-[color:var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--sand)] text-[11px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
              <tr>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Tour</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Guests</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Bokun</th>
                <th className="text-left px-3 py-2">Reason</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!rows && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-[color:var(--charcoal-soft)]">
                    Loading…
                  </td>
                </tr>
              )}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[color:var(--charcoal-soft)]">
                    <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={20} />
                    No bookings match this filter. Everything is clean.
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--border)] align-top">
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-[color:var(--charcoal-soft)]">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.customer_name ?? "—"}</div>
                    <div className="text-xs text-[color:var(--charcoal-soft)]">{r.customer_email ?? "—"}</div>
                    {r.customer_phone && (
                      <div className="text-xs text-[color:var(--charcoal-soft)]">{r.customer_phone}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">{r.source_tour_id ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">{r.preferred_date ?? "—"}</td>
                  <td className="px-3 py-3 text-xs">{r.guests ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">
                    {formatMoney(r.amount_total, r.currency)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusPill status={r.bokun_status} />
                    {r.bokun_confirmation_code && (
                      <div className="mt-1 text-[11px] text-[color:var(--charcoal-soft)]">
                        Conf: {r.bokun_confirmation_code}
                      </div>
                    )}
                    {r.bokun_last_attempt_at && (
                      <div className="mt-0.5 text-[11px] text-[color:var(--charcoal-soft)]">
                        Last: {formatDateTime(r.bokun_last_attempt_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-[280px]">
                    <div className="text-xs text-[color:var(--charcoal)] break-words">
                      {r.bokun_error ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      {r.bokun_booking_id ? (
                        <a
                          href={bokunBookingUrl(r.bokun_booking_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[color:var(--teal)] hover:underline"
                        >
                          Open in Bokun <ExternalLink size={11} />
                        </a>
                      ) : (
                        <a
                          href="https://app.bokun.io/sales/bookings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[color:var(--teal)] hover:underline"
                        >
                          Bokun extranet <ExternalLink size={11} />
                        </a>
                      )}
                      {r.stripe_session_id && (
                        <a
                          href={`https://dashboard.stripe.com/payments/${encodeURIComponent(r.stripe_session_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
                        >
                          Stripe <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-[color:var(--charcoal-soft)]">
          Bokun deep links open the extranet booking page. If a booking has no Bokun ID yet, the
          link goes to the general bookings list — search by the customer email or the date.
        </p>
      </section>
    </SiteLayout>
  );
}

type BokunPricingCategory = { id: number; title: string };
type BokunSlotPreview = {
  id: number;
  startTime: string;
  date: string;
  availabilityCount: number;
  enough_capacity: boolean;
  pricing_category: string | null;
  pricing_categories?: BokunPricingCategory[];
};

type PreviewResult =
  | { mapped: false }
  | {
      mapped: true;
      bokun_product_id: string;
      slot_count: number;
      usable_count: number;
      slots: BokunSlotPreview[];
    }
  | { error: string };

function TestWebhookButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tourId, setTourId] = useState("arrabida-boat");
  const [dateExact, setDateExact] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [guests, setGuests] = useState(2);
  const [reallyBook, setReallyBook] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  // Invalidate preview when inputs change.
  useEffect(() => {
    setPreview(null);
    setSelectedSlotId(null);
    setSelectedCatId(null);
  }, [tourId, dateExact, guests]);

  async function getToken() {
    const { data: s } = await supabase.auth.getSession();
    return s.session?.access_token ?? null;
  }

  async function checkAvailability() {
    setChecking(true);
    setPreview(null);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Not signed in");
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-webhook-simulate`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tour_id: tourId,
          date_exact: dateExact,
          guests,
          check_only: true,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        mapped?: boolean;
        bokun_product_id?: string;
        slot_count?: number;
        usable_count?: number;
        slots?: BokunSlotPreview[];
        error?: string;
      };
      if (!json.ok) {
        setPreview({ error: json.error ?? "Unknown error" });
        return;
      }
      if (!json.mapped) {
        setPreview({ mapped: false });
        return;
      }
      setPreview({
        mapped: true,
        bokun_product_id: json.bokun_product_id ?? "",
        slot_count: json.slot_count ?? 0,
        usable_count: json.usable_count ?? 0,
        slots: json.slots ?? [],
      });
    } catch (e) {
      setPreview({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setChecking(false);
    }
  }

  async function run() {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Not signed in");
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-webhook-simulate`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tour_id: tourId,
          date_exact: dateExact,
          guests,
          booking_type: "signature",
          really_book_bokun: reallyBook,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        bookingId?: string;
        bokun?: { status: string; error?: string };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        toast.error(`Simulation failed: ${json.error ?? res.statusText}`);
        return;
      }
      toast.success(
        `Simulated booking created · Bokun: ${json.bokun?.status ?? "—"}${
          json.bokun?.error ? ` (${json.bokun.error})` : ""
        }`,
      );
      setOpen(false);
      setPreview(null);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canRun = preview && "mapped" in preview && preview.mapped && preview.usable_count > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-[color:var(--gold)] bg-[color:var(--gold-soft)] px-3 py-2 text-sm hover:bg-[color:var(--gold)] hover:text-[color:var(--ivory)]"
      >
        <Beaker size={14} /> Test webhook
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !busy && !checking && setOpen(false)}
        >
          <div
            className="bg-[color:var(--ivory)] max-w-md w-full p-6 border border-[color:var(--border)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl">Simulate Stripe webhook</h2>
            <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">
              Step 1 — preview Bokun availability. Step 2 — run the simulation (dry run by default).
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-[color:var(--charcoal-soft)]">Tour ID</span>
                <input
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className="mt-1 w-full border border-[color:var(--border)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-[color:var(--charcoal-soft)]">Date</span>
                <input
                  type="date"
                  value={dateExact}
                  onChange={(e) => setDateExact(e.target.value)}
                  className="mt-1 w-full border border-[color:var(--border)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-[color:var(--charcoal-soft)]">Guests</span>
                <input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full border border-[color:var(--border)] px-2 py-1.5 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={checkAvailability}
              disabled={checking || busy}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-[color:var(--teal)] text-[color:var(--teal)] px-3 py-2 text-sm hover:bg-[color:var(--teal)] hover:text-[color:var(--ivory)] disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              {checking ? "Checking Bokun…" : "Check Bokun availability"}
            </button>

            {preview && (
              <div className="mt-3 border border-[color:var(--border)] p-3 text-xs bg-[color:var(--sand)]">
                {"error" in preview ? (
                  <p className="text-red-700">
                    <AlertTriangle size={11} className="inline mr-1" />
                    {preview.error}
                  </p>
                ) : !preview.mapped ? (
                  <p className="text-amber-800">
                    <AlertTriangle size={11} className="inline mr-1" />
                    No Bokun mapping for this tour ID. Booking will be created but Bokun push will
                    be marked needs_review.
                  </p>
                ) : preview.slot_count === 0 ? (
                  <p className="text-amber-800">
                    <AlertTriangle size={11} className="inline mr-1" />
                    No Bokun slots on {dateExact}. Try another date.
                  </p>
                ) : (
                  <>
                    <p className="font-medium text-[color:var(--charcoal)]">
                      {preview.usable_count} of {preview.slot_count} slot
                      {preview.slot_count === 1 ? "" : "s"} can fit {guests} guest
                      {guests === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {preview.slots.map((s) => (
                        <li
                          key={s.id}
                          className={`flex items-center justify-between gap-2 ${
                            s.enough_capacity ? "text-[color:var(--charcoal)]" : "text-[color:var(--charcoal-soft)] line-through"
                          }`}
                        >
                          <span>
                            {s.startTime}
                            {s.pricing_category ? ` · ${s.pricing_category}` : ""}
                          </span>
                          <span>{s.availabilityCount} seats</span>
                        </li>
                      ))}
                    </ul>
                    {preview.usable_count === 1 && (
                      <p className="mt-2 text-emerald-800">
                        <CheckCircle2 size={11} className="inline mr-1" />
                        Single matching slot — webhook would auto-confirm.
                      </p>
                    )}
                    {preview.usable_count > 1 && (
                      <p className="mt-2 text-amber-800">
                        Multiple slots — webhook marks needs_review for manual pick.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <label className="mt-4 flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={reallyBook}
                onChange={(e) => setReallyBook(e.target.checked)}
                disabled={!canRun}
                className="mt-0.5"
              />
              <span className={!canRun ? "text-[color:var(--charcoal-soft)]" : ""}>
                <strong>Actually reserve in Bokun</strong> (creates a real booking — only enabled
                when preview shows exactly one matching slot).
              </span>
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy || checking}
                className="px-3 py-2 text-sm border border-[color:var(--border)] hover:border-[color:var(--gold)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={busy || checking}
                className="px-3 py-2 text-sm bg-[color:var(--charcoal)] text-[color:var(--ivory)] hover:bg-black disabled:opacity-50"
              >
                {busy ? "Simulating…" : preview ? "Run simulation" : "Skip preview & run"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

}

