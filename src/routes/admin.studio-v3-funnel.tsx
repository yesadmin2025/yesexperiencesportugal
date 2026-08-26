// Studio V3 — internal funnel analytics dashboard.
//
// P11 aligns this page with the live P5-P10 traveller journey and the
// session-scoped `studio_v3_funnel_events` table. Calculations live in the
// pure funnelMetrics module so tests and UI always share one truth.

import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeStudioFunnelStats,
  type StudioFunnelMetricRow,
} from "@/lib/studio-v3/funnelMetrics";

export const Route = createFileRoute("/admin/studio-v3-funnel")({
  head: () => ({
    meta: [
      { title: "Studio V3 funnel — YES internal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: StudioV3FunnelPage,
});

interface FunnelRow extends StudioFunnelMetricRow {
  id: string;
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}min`;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function StudioV3FunnelPage() {
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [since, setSince] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [until, setUntil] = useState<string>(() => new Date().toISOString().slice(0, 10));

  async function load() {
    setErr(null);
    setRows(null);
    const sinceIso = new Date(`${since}T00:00:00Z`).toISOString();
    const untilIso = new Date(`${until}T23:59:59Z`).toISOString();
    const { data, error } = await supabase
      .from("studio_v3_funnel_events")
      .select("*")
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso)
      .order("created_at", { ascending: false })
      .limit(20000);

    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as FunnelRow[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => (rows ? computeStudioFunnelStats(rows) : null), [rows]);

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-5 py-8 text-[color:var(--charcoal)]">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[720px]">
            <p className="text-[10px] uppercase tracking-[0.26em] font-semibold text-[color:var(--gold)]">
              Internal · Studio V3 · P11
            </p>
            <h1
              className="mt-1 text-3xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Funnel intelligence
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--charcoal)]/70">
              The live Studio journey from Invitation to confirmed payment. Director&apos;s Read,
              delegation, refine actions and price engagement are measured as semantic milestones,
              not fake form steps.
              <Link
                to="/admin/studio-v3-audit"
                className="ml-2 underline underline-offset-4 text-[color:var(--teal)]"
              >
                Audit buffer →
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs flex flex-col gap-1 text-[color:var(--charcoal)]/70">
              From
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="rounded border border-[color:var(--charcoal)]/20 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs flex flex-col gap-1 text-[color:var(--charcoal)]/70">
              To
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="rounded border border-[color:var(--charcoal)]/20 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-[40px] rounded bg-[color:var(--teal)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </header>

        {err ? (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        {!rows && !err ? (
          <p className="text-sm text-[color:var(--charcoal)]/60">Loading…</p>
        ) : null}

        {stats ? (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Sessions" value={stats.totalSessions.toString()} />
              <KpiCard
                label="Your Day"
                value={`${stats.yourDayReached} · ${pct(stats.yourDayReached, stats.totalSessions)}%`}
              />
              <KpiCard
                label="Guest details"
                value={`${stats.guestDetailsReached} · ${pct(stats.guestDetailsReached, stats.totalSessions)}%`}
              />
              <KpiCard
                label="Checkout"
                value={`${stats.checkoutReached} · ${pct(stats.checkoutReached, stats.totalSessions)}%`}
              />
              <KpiCard
                label="Confirmed"
                value={`${stats.confirmed} · ${pct(stats.confirmed, stats.totalSessions)}%`}
              />
              <KpiCard label="Events" value={stats.totalEvents.toString()} />
            </section>

            <section className="mb-8 overflow-hidden rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <div className="border-b border-[color:var(--charcoal)]/10 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                  Live traveller funnel
                </h2>
                <p className="mt-1 text-xs text-[color:var(--charcoal)]/55">
                  Refinement is adaptive and optional. Checkout completion means a real
                  <code className="mx-1">secure_confirm</code> event.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                    <tr>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2 text-right">Reached</th>
                      <th className="px-3 py-2 text-right">Completed</th>
                      <th className="px-3 py-2 text-right">Drop-off</th>
                      <th className="px-3 py-2 text-right">Reach</th>
                      <th className="px-3 py-2 text-right">Median time</th>
                      <th className="px-3 py-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perStep.map((step) => {
                      const danger =
                        step.dropPct != null && step.dropPct > 25 && step.reached >= 5;
                      return (
                        <tr
                          key={step.key}
                          className="border-t border-[color:var(--charcoal)]/5"
                        >
                          <td className="px-3 py-2 font-medium">
                            {step.label}
                            {step.optional ? (
                              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--charcoal)]/45">
                                adaptive
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{step.reached}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{step.completed}</td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-semibold ${
                              danger ? "text-red-600" : "text-[color:var(--charcoal)]/70"
                            }`}
                          >
                            {step.dropPct == null ? "—" : `${step.dropPct}%`}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[color:var(--charcoal)]/60">
                            {step.reachPct}%
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[color:var(--charcoal)]/60">
                            {fmtMs(step.medianMs)}
                          </td>
                          <td className="w-[170px] px-3 py-2">
                            <div className="h-2 w-full rounded-full bg-[color:var(--charcoal)]/10">
                              <div
                                className="h-full rounded-full bg-[color:var(--gold)]"
                                style={{ width: `${step.reachPct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8 rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                Intelligence & engagement milestones
              </h2>
              <p className="mt-1 text-xs text-[color:var(--charcoal)]/55">
                Unique sessions, not click counts. These describe behaviour without storing answers
                or personal details.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <MiniMetric
                  label="Director’s Read"
                  value={stats.milestones.directorsRead}
                  total={stats.totalSessions}
                />
                <MiniMetric
                  label="YES designs it"
                  value={stats.milestones.delegated}
                  total={stats.totalSessions}
                />
                <MiniMetric
                  label="Logistics done"
                  value={stats.milestones.logisticsCompleted}
                  total={stats.totalSessions}
                />
                <MiniMetric
                  label="Map viewed"
                  value={stats.milestones.mapViewed}
                  total={stats.totalSessions}
                />
                <MiniMetric
                  label="Refined day"
                  value={stats.milestones.refined}
                  total={stats.totalSessions}
                />
                <MiniMetric
                  label="Price expanded"
                  value={stats.milestones.priceExpanded}
                  total={stats.totalSessions}
                />
              </div>
            </section>

            <section className="mb-8 overflow-hidden rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <div className="border-b border-[color:var(--charcoal)]/10 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                  Experiment variants
                </h2>
                <p className="mt-1 text-xs text-[color:var(--charcoal)]/55">
                  P14-ready session conversion. “Unassigned” is the current default until an
                  experiment calls setFunnelVariant().
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                    <tr>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2 text-right">Sessions</th>
                      <th className="px-3 py-2 text-right">Your Day</th>
                      <th className="px-3 py-2 text-right">Checkout</th>
                      <th className="px-3 py-2 text-right">Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.variants.map((variant) => (
                      <tr
                        key={variant.variant}
                        className="border-t border-[color:var(--charcoal)]/5"
                      >
                        <td className="px-3 py-2 font-medium">{variant.variant}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {variant.sessions}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {variant.yourDayReached} · {variant.yourDayRate}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {variant.checkoutReached} · {variant.checkoutRate}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-[color:var(--teal)]">
                          {variant.confirmed} · {variant.confirmedRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs leading-5 text-[color:var(--charcoal)]/50">
              Showing up to 20,000 events. Funnel rows are session-deduped. Drop-off over 25%
              with at least five reached sessions is highlighted. SELECT remains admin-only via
              Supabase RLS. P11 semantic milestones strip PII before insertion.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMetric({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="rounded-md bg-[color:var(--sand)]/35 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/55">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-[color:var(--charcoal)]/50">
          · {pct(value, total)}%
        </span>
      </p>
    </div>
  );
}
