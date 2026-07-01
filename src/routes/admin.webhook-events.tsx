// Admin dashboard listing recent Stripe webhook events and their
// verification status (checkout.session.completed + friends).
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle, Filter } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string;
  received_at: string;
  event_id: string | null;
  event_type: string | null;
  stripe_env: string | null;
  verified: boolean;
  status_code: number | null;
  error_message: string | null;
  session_id: string | null;
  payment_status: string | null;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  booking_type: string | null;
};

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Webhook events failed</h1>
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

export const Route = createFileRoute("/admin/webhook-events")({
  head: () => ({
    meta: [
      { title: "Stripe webhook events — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminWebhookEventsPage,
  errorComponent: ErrorView,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

const FILTERS = [
  { id: "all", label: "All events" },
  { id: "checkout", label: "checkout.session.completed" },
  { id: "verified", label: "Verified only" },
  { id: "failed", label: "Failed verification" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function fmtMoney(cents: number | null, currency: string | null) {
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

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AdminWebhookEventsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    let cancelled = false;
    async function check(s: { user: { id: string } } | null) {
      if (!s) {
        if (!cancelled) {
          setIsAdmin(false);
          setAuthChecked(true);
        }
        return;
      }
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
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("stripe_webhook_events")
      .select(
        "id, received_at, event_id, event_type, stripe_env, verified, status_code, error_message, session_id, payment_status, amount_total, currency, customer_email, booking_type",
      )
      .order("received_at", { ascending: false })
      .limit(200);
    if (filter === "checkout") q = q.eq("event_type", "checkout.session.completed");
    else if (filter === "verified") q = q.eq("verified", true);
    else if (filter === "failed") q = q.eq("verified", false);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error(`Failed to load events: ${error.message}`);
      return;
    }
    setRows((data ?? []) as EventRow[]);
  }, [filter]);

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin, fetchRows]);

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x">Checking access…</section>
      </SiteLayout>
    );
  }
  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x max-w-2xl">
          <h1 className="text-2xl">Admin access required</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Sign in with an admin account to view Stripe webhook events.
          </p>
        </section>
      </SiteLayout>
    );
  }

  const verifiedCount = rows?.filter((r) => r.verified).length ?? 0;
  const failedCount = rows?.filter((r) => !r.verified).length ?? 0;

  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--border)] pb-6">
          <div>
            <h1 className="text-3xl">Stripe webhook events</h1>
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
              Last 200 events received at <code>stripe-webhook</code>. Verification failures
              indicate the signing secret doesn&apos;t match the Stripe endpoint.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRows}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-[color:var(--charcoal-soft)]">
            <Filter size={12} /> Filter
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`border px-3 py-1 text-xs ${
                filter === f.id
                  ? "border-[color:var(--gold)] text-[color:var(--charcoal)]"
                  : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--gold)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[color:var(--charcoal-soft)]">
            {verifiedCount} verified · {failedCount} failed
          </span>
        </div>

        <div className="mt-6 overflow-x-auto border border-[color:var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--sand)] text-left text-[11px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
              <tr>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Event type</th>
                <th className="px-3 py-2">Env</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows == null ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[color:var(--charcoal-soft)]">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[color:var(--charcoal-soft)]">
                    No events yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--border)] align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.received_at)}</td>
                    <td className="px-3 py-2">
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 size={12} /> {r.status_code ?? 200}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-800">
                          <XCircle size={12} /> {r.status_code ?? 400}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.event_type ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.stripe_env ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {r.session_id ? r.session_id.slice(0, 20) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmtMoney(r.amount_total, r.currency)}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.customer_email ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-[color:var(--charcoal-soft)]">
                      {r.error_message ?? (r.booking_type ? `booking: ${r.booking_type}` : "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SiteLayout>
  );
}
