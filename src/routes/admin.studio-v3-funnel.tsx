// Studio V3 — admin-only funnel analytics dashboard.
// P11 aligns the dashboard with the real P5-P10 traveller path and surfaces
// semantic milestones written by `trackStudio` without collecting PII.

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
  variant: string | null;
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}min`;
}

function rate(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
}

function StudioV3FunnelPage() {
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [since, setSince] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
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
    <main className="min-h-screen bg-[color:var(--ivory)] px-5 py-8">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[color:var(--gold)]">
              Internal · Studio V3
            </p>
            <h1
              className="mt-1 text-3xl font-bold text-[color:var(--charcoal)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Funnel & drop-off
            </h1>
            <p className="mt-1 max-w-[72ch] text-sm text-[color:var(--charcoal)]/70">
              The current P5–P10 traveller path, from Feeling to Checkout. Optional Refinement is
              measured only when it is actually shown.
              <Link to="/admin/studio-v3-audit" className="ml-2 underline text-[color:var(--teal)]">
                Audit buffer →
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-[color:var(--charcoal)]/70">
              From
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="rounded border border-[color:var(--charcoal)]/20 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[color:var(--charcoal)]/70">
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
              className="rounded bg-[color:var(--teal)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Sessions" value={stats.totalSessions.toString()} />
              <KpiCard
                label="Your Day reached"
                value={`${stats.yourDayReached} · ${rate(stats.yourDayReached, stats.totalSessions)}`}
              />
              <KpiCard
                label="Guest details"
                value={`${stats.guestDetailsReached} · ${rate(stats.guestDetailsReached, stats.totalSessions)}`}
              />
              <KpiCard
                label="Checkout reached"
                value={`${stats.checkoutReached} · ${rate(stats.checkoutReached, stats.totalSessions)}`}
              />
            </section>

            <section className="mb-8 rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <div className="border-b border-[color:var(--charcoal)]/10 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal)]/80">
                  Intelligence & intent milestones
                </h2>
                <p className="mt-1 text-xs text-[color:var(--charcoal)]/55">
                  Unique sessions. These signals are semantic milestones, not extra funnel steps.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[color:var(--charcoal)]/10 md:grid-cols-3 lg:grid-cols-6">
                <MilestoneCard
                  label="Director’s Read"
                  value={stats.milestones.directorsRead}
                  total={stats.totalSessions}
                />
                <MilestoneCard
                  label="Delegated to YES"
                  value={stats.milestones.delegated}
                  total={stats.totalSessions}
                />
                <MilestoneCard
                  label="Logistics complete"
                  value={stats.milestones.logisticsCompleted}
                  total={stats.totalSessions}
                />
                <MilestoneCard
                  label="Map viewed"
                  value={stats.milestones.mapViewed}
                  total={stats.totalSessions}
                />
                <MilestoneCard
                  label="Refined day"
                  value={stats.milestones.refined}
                  total={stats.yourDayReached}
                />
                <MilestoneCard
                  label="Price opened"
                  value={stats.milestones.priceExpanded}
                  total={stats.yourDayReached}
                />
              </div>
            </section>

            <section className="mb-8 rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <div className="border-b border-[color:var(--charcoal)]/10 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal)]/80">
                  Current Studio journey
                </h2>
                <p className="mt-1 text-xs text-[color:var(--charcoal)]/55">
                  Drop-off is based on sessions that reached a step but did not continue from it.
                  Checkout is terminal here, so its drop-off is intentionally not inferred.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                    <tr>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2 text-right">Reached</th>
                      <th className="px-3 py-2 text-right">Continued</th>
                      <th className="px-3 py-2 text-right">Drop-off</th>
                      <th className="px-3 py-2 text-right">% sessions</th>
                      <th className="px-3 py-2 text-right">Median</th>
                      <th className="px-3 py-2">Reach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perStep.map((step) => {
                      const danger =
                        step.dropPct != null && step.dropPct > 25 && step.reached >= 5;
                      return (
                        <tr key={step.key} className="border-t border-[color:var(--charcoal)]/5">
                          <td className="px-3 py-2 font-medium">
                            {step.label}
                            {step.optional ? (
                              <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--charcoal)]/40">
                                optional
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{step.reached}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {step.completed == null ? "—" : step.completed}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold tabular-nums ${
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
                          <td className="w-[160px] px-3 py-2">
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

            <section className="mb-8 rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <h2 className="border-b border-[color:var(--charcoal)]/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal)]/80">
                Investment tier → checkout
              </h2>
              {stats.tiers.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[color:var(--charcoal)]/50">
                  No tier picks recorded in this range.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                    <tr>
                      <th className="px-3 py-2">Tier</th>
                      <th className="px-3 py-2 text-right">Sessions</th>
                      <th className="px-3 py-2 text-right">Reached checkout</th>
                      <th className="px-3 py-2 text-right">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tiers.map((tier) => (
                      <tr key={tier.tier} className="border-t border-[color:var(--charcoal)]/5">
                        <td className="px-3 py-2 font-medium capitalize">{tier.tier}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{tier.picks}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {tier.checkoutReached}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-[color:var(--teal)]">
                          {tier.rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <p className="text-xs text-[color:var(--charcoal)]/50">
              Showing up to 20 000 events. Data is session-scoped and contains no guest contact
              details. SELECT remains admin-only through Supabase RLS. Confirmed-payment count is
              kept in the aggregator for legacy <code>secure_confirm</code> rows, but this dashboard
              does not pretend a checkout reach is a purchase.
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--charcoal)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}

function MilestoneCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[color:var(--charcoal)]">
        {value}
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-[color:var(--charcoal)]/45">
        {rate(value, total)}
      </p>
    </div>
  );
}
