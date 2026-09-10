/**
 * /admin/enquiries — every booking enquiry received through the booking page.
 *
 * Reads public.booking_requests directly with the signed-in session; the
 * admin-only RLS policy is the real access control, so a non-admin session
 * simply sees nothing. Team members can mark an enquiry as replied or closed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Loader2, Mail, RefreshCw, Users } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { findTour } from "@/data/signatureTours";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/enquiries")({
  head: () => ({
    meta: [{ title: "Enquiries · Admin" }, { name: "robots", content: "noindex, nofollow" }],
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
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<EnquiryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("all");

  useEffect(() => {
    let cancelled = false;
    async function check(session: { user: { id: string } } | null) {
      if (!session) {
        if (!cancelled) {
          setIsAdmin(false);
          setAuthChecked(true);
        }
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!cancelled) {
        setIsAdmin(!error && data === true);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthChecked(false);
      check(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
    if (isAdmin !== true) return;
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
  }, [isAdmin, load]);

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

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="container-x py-24 text-center">
          <Loader2 className="mx-auto animate-spin text-[color:var(--gold)]" aria-hidden />
        </section>
      </SiteLayout>
    );
  }

  if (isAdmin !== true) {
    return (
      <SiteLayout>
        <section className="container-x max-w-xl py-24 text-center">
          <Eyebrow flank>Team only</Eyebrow>
          <SectionTitle as="h1" spacing="tight">
            Sign in to see <SectionTitle.Em>your enquiries</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-4 text-[color:var(--charcoal-soft)]">
            This page lists guest enquiries, so it is visible only to signed-in YES team accounts.
          </p>
          <Link
            to="/auth"
            className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="bg-[color:var(--sand)] pt-10 pb-10">
        <div className="container-x">
          <Eyebrow flank>Enquiries</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="tight">
            Every day someone <SectionTitle.Em>asked us to design</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-4 max-w-2xl text-[color:var(--charcoal-soft)] leading-relaxed">
            Requests arrive here the moment they are sent, alongside the notification email. Date,
            party and preferences, newest first.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="container-x">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`min-h-[40px] rounded-full border px-4 font-sans text-[11px] uppercase tracking-[0.18em] font-semibold ${
                  filter === s
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]"
                    : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal-soft)] hover:border-[color:var(--gold)]"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => load()}
              className="ml-auto inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[color:var(--charcoal)]/15 px-4 font-sans text-[11px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal-soft)] hover:border-[color:var(--gold)]"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw size={13} aria-hidden />
              )}
              Refresh
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="mt-10 text-[color:var(--charcoal-soft)]">
              {loading ? "Loading…" : "No enquiries here yet."}
            </p>
          ) : (
            <ul className="mt-7 grid gap-4" data-testid="admin-enquiries-list">
              {visible.map((row) => {
                const tour = row.tour_id ? findTour(row.tour_id) : undefined;
                return (
                  <li
                    key={row.id}
                    className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-display text-[1.15rem] text-[color:var(--charcoal)]">
                        {row.name}
                      </h2>
                      <span className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal-soft)]">
                        {formatDate(row.created_at)} · {row.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-[14px] text-[color:var(--charcoal-soft)] sm:grid-cols-2">
                      <p>
                        <Mail size={13} className="mr-1.5 inline text-[color:var(--gold)]" aria-hidden />
                        <a href={`mailto:${row.email}`} className="underline underline-offset-4">
                          {row.email}
                        </a>
                      </p>
                      <p>
                        <CalendarDays
                          size={13}
                          className="mr-1.5 inline text-[color:var(--gold)]"
                          aria-hidden
                        />
                        {row.preferred_date ?? "Flexible date"}
                      </p>
                      <p>
                        <Users size={13} className="mr-1.5 inline text-[color:var(--gold)]" aria-hidden />
                        {row.adults} adult{row.adults === 1 ? "" : "s"}
                        {row.children > 0
                          ? ` · ${row.children} child${row.children === 1 ? "" : "ren"}`
                          : ""}
                      </p>
                      <p>{tour ? tour.title : "Day to be suggested"}</p>
                    </div>

                    {row.preferences ? (
                      <p className="mt-3 border-l-2 border-[color:var(--gold)]/50 pl-3 text-[14px] italic leading-relaxed text-[color:var(--charcoal)]">
                        {row.preferences}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(row.id, s)}
                          disabled={row.status === s}
                          className="min-h-[40px] rounded-[4px] border border-[color:var(--charcoal)]/15 px-4 font-sans text-[11px] uppercase tracking-[0.16em] font-semibold text-[color:var(--charcoal)] disabled:opacity-40 hover:border-[color:var(--gold)]"
                        >
                          Mark {s}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
