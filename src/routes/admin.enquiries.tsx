/**
 * /admin/enquiries — every booking enquiry received through the booking page.
 *
 * Reads public.booking_requests with the signed-in session. The admin-only
 * RLS policy is the access control; the admin layout hides this page until
 * the account's admin role is confirmed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Loader2, Mail, RefreshCw, Users } from "lucide-react";

import { AdminSectionTitle, AdminShell } from "@/components/admin/AdminShell";
import { findTour } from "@/data/signatureTours";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/enquiries")({
  head: () => ({
    meta: [
      { title: "Guest Enquiries | YES Operations" },
      { name: "description", content: "Private guest enquiries for the YES Experiences Portugal team." },
      { property: "og:title", content: "Guest Enquiries | YES Operations" },
      { property: "og:description", content: "Private guest enquiries for the YES Experiences Portugal team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminEnquiriesPage,
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface EnquiryRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  tour_id: string | null;
  preferred_date: string | null;
  adults: number;
  children: number;
  preferences: string | null;
  source: string | null;
  status: string;
}

const STATUSES = ["new", "replied", "closed"] as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminEnquiriesPage() {
  const [rows, setRows] = useState<EnquiryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_requests")
      .select(
        "id, created_at, name, email, tour_id, preferred_date, adults, children, preferences, source, status",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Could not load enquiries.");
    setRows((data ?? []) as EnquiryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-enquiries")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_requests" }, () =>
        load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("booking_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update this enquiry.");
      return;
    }
    setRows((prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const visible = useMemo(
    () => (rows ?? []).filter((r) => filter === "all" || r.status === filter),
    [rows, filter],
  );

  return (
    <AdminShell
      title="Enquiries"
      eyebrow="Guest Requests"
      actions={
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3 font-sans text-[12px] uppercase tracking-[0.12em] font-semibold text-[color:var(--charcoal-soft)] transition-colors hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)]"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={13} aria-hidden />
          )}
          Refresh
        </button>
      }
    >
      <div className="space-y-10">
        <div>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Every day someone asked us to design. Requests arrive here the moment they are sent,
            alongside the notification email. Newest first.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`min-h-11 rounded-md border px-4 font-sans text-[12px] uppercase tracking-[0.12em] font-semibold transition-all ${
                  filter === s
                    ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                    : "border-[color:var(--charcoal)]/10 bg-[color:var(--sand)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--charcoal)]/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <AdminSectionTitle count={visible.length}>
            {filter === "all" ? "All requests" : `${filter} requests`}
          </AdminSectionTitle>

          {visible.length === 0 ? (
            <p className="py-8 text-[14px] text-[color:var(--charcoal-soft)]">
              {loading ? "Loading…" : "No enquiries here yet."}
            </p>
          ) : (
            <ul className="grid gap-5" data-testid="admin-enquiries-list">
              {visible.map((row) => {
                const tour = row.tour_id ? findTour(row.tour_id) : undefined;
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-[color:var(--charcoal)]/[0.08] bg-[color:var(--ivory)] p-5 transition-shadow hover:shadow-sm"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <h3 className="font-display text-[17px] font-medium text-[color:var(--charcoal)]">
                        {row.name}
                      </h3>
                      <span className="font-sans text-[12px] leading-relaxed uppercase tracking-[0.1em] font-semibold text-[color:var(--charcoal-soft)]">
                        {formatDate(row.created_at)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 text-[14px] text-[color:var(--charcoal-soft)] sm:grid-cols-2 lg:grid-cols-3">
                      <p className="flex items-center gap-2">
                        <Mail size={14} className="text-[color:var(--gold-deep)]" aria-hidden />
                        <a href={`mailto:${row.email}`} className="underline underline-offset-4 hover:text-[color:var(--teal)]">
                          {row.email}
                        </a>
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays
                          size={14}
                          className="text-[color:var(--gold-deep)]"
                          aria-hidden
                        />
                        {row.preferred_date ?? "Flexible date"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Users size={14} className="text-[color:var(--gold-deep)]" aria-hidden />
                        {row.adults} adult{row.adults === 1 ? "" : "s"}
                        {row.children > 0
                          ? ` · ${row.children} child${row.children === 1 ? "" : "ren"}`
                          : ""}
                      </p>
                    </div>

                    <p className="mt-3 text-[13.5px] text-[color:var(--charcoal-soft)]">
                      <span className="font-medium text-[color:var(--charcoal)]">Request:</span>{" "}
                      {tour ? tour.title : "Day to be suggested"}
                    </p>

                    {row.preferences ? (
                      <div className="mt-4 rounded-md bg-[color:var(--sand)]/50 p-4 text-[13.5px] leading-relaxed text-[color:var(--charcoal)]">
                        {row.preferences}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--charcoal)]/[0.05] pt-4">
                       <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] ${
                         row.status === 'new' ? 'bg-blue-100 text-blue-700' :
                         row.status === 'replied' ? 'bg-green-100 text-green-700' :
                         'bg-gray-100 text-gray-600'
                       }`}>
                        {row.status}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(row.id, s)}
                            disabled={row.status === s}
                            className="min-h-11 rounded-md border border-[color:var(--charcoal)]/10 px-3 font-sans text-[12px] uppercase tracking-[0.12em] font-semibold text-[color:var(--charcoal)] transition-colors disabled:opacity-30 hover:bg-[color:var(--sand)]"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
