// Studio V3 — Funnel analytics dashboard.
//
// Visualises `studio_v3_funnel_events` to measure conversion + drop-off
// per step after the Investment-tier reordering. Gated by Supabase auth;
// RLS policy `admins read funnel` enforces admin-only access at the DB
// level (returns empty set for non-admins).
//
// Features:
//   - Per-step funnel (sessions that reached / completed each step)
//   - Drop-off % per step (highlighted when > 25%)
//   - Median time on step (ms_on_step from continue/back/abandon)
//   - Tier distribution + downstream conversion to `secure_confirm`
//   - Date range filter (compare before/after a deploy)

import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface FunnelRow {
  id: string;
  session_id: string;
  step_number: number;
  step_key: string;
  event: string;
  value: Record<string, unknown> | null;
  variant: string | null;
  created_at: string;
}

const STEP_ORDER: Array<{ n: number; key: string; label: string }> = [
  { n: 1, key: "feeling", label: "Feeling" },
  { n: 2, key: "companions", label: "Companions" },
  { n: 3, key: "rhythm", label: "Rhythm" },
  { n: 4, key: "destination", label: "Destination" },
  { n: 5, key: "investment", label: "Investment" },
  { n: 6, key: "interests", label: "Interests" },
  { n: 7, key: "addons", label: "Add-ons" },
  { n: 8, key: "date", label: "Date" },
  { n: 9, key: "configurator", label: "Configurator" },
  { n: 10, key: "secure", label: "Secure" },
];

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}min`;
}

function StudioV3FunnelPage() {
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [since, setSince] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [until, setUntil] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

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

  const stats = useMemo(() => {
    if (!rows) return null;

    // Sessions per step (any event with that step_key counts as "reached")
    const reached = new Map<string, Set<string>>();
    const completed = new Map<string, Set<string>>();
    const msByStep = new Map<string, number[]>();

    for (const r of rows) {
      if (!reached.has(r.step_key)) reached.set(r.step_key, new Set());
      reached.get(r.step_key)!.add(r.session_id);

      if (r.event === "continue") {
        if (!completed.has(r.step_key)) completed.set(r.step_key, new Set());
        completed.get(r.step_key)!.add(r.session_id);
      }

      if (r.event === "continue" || r.event === "back" || r.event === "abandon") {
        const v = r.value as Record<string, unknown> | null;
        const ms = typeof v?.ms_on_step === "number" ? (v.ms_on_step as number) : null;
        if (ms != null && ms >= 0 && ms < 10 * 60 * 1000) {
          if (!msByStep.has(r.step_key)) msByStep.set(r.step_key, []);
          msByStep.get(r.step_key)!.push(ms);
        }
      }
    }

    const totalSessions = new Set(rows.map((r) => r.session_id)).size;

    const perStep = STEP_ORDER.map((s) => {
      const r = reached.get(s.key)?.size ?? 0;
      const c = completed.get(s.key)?.size ?? 0;
      const dropPct = r > 0 ? Math.round(((r - c) / r) * 100) : 0;
      const reachPct = totalSessions > 0 ? Math.round((r / totalSessions) * 100) : 0;
      const med = median(msByStep.get(s.key) ?? []);
      return { ...s, reached: r, completed: c, dropPct, reachPct, medianMs: med };
    });

    // Tier distribution + conversion
    const tierCounts = new Map<string, number>();
    const tierConverted = new Map<string, Set<string>>();
    const sessionsConfirmed = new Set<string>();

    for (const r of rows) {
      if (r.event === "secure_confirm") sessionsConfirmed.add(r.session_id);
      if (r.event === "tier_chosen" || r.step_key === "investment") {
        const v = r.value as Record<string, unknown> | null;
        const tier =
          (v?.tier as string) || (v?.selection as string) || null;
        if (tier) {
          tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
          if (!tierConverted.has(tier)) tierConverted.set(tier, new Set());
        }
      }
    }
    // Second pass: assign confirmed sessions to their last-chosen tier
    const sessionTier = new Map<string, string>();
    for (const r of rows) {
      if (r.event === "tier_chosen" || r.step_key === "investment") {
        const v = r.value as Record<string, unknown> | null;
        const tier = (v?.tier as string) || (v?.selection as string) || null;
        if (tier) sessionTier.set(r.session_id, tier);
      }
    }
    for (const sid of sessionsConfirmed) {
      const tier = sessionTier.get(sid);
      if (tier) {
        if (!tierConverted.has(tier)) tierConverted.set(tier, new Set());
        tierConverted.get(tier)!.add(sid);
      }
    }

    const tiers = Array.from(tierCounts.entries())
      .map(([tier, n]) => {
        const confirmed = tierConverted.get(tier)?.size ?? 0;
        const rate = n > 0 ? Math.round((confirmed / n) * 100) : 0;
        return { tier, picks: n, confirmed, rate };
      })
      .sort((a, b) => b.picks - a.picks);

    return {
      totalSessions,
      totalEvents: rows.length,
      confirmed: sessionsConfirmed.size,
      perStep,
      tiers,
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-5 py-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] font-semibold text-[color:var(--gold)]">
              Internal · Studio V3
            </p>
            <h1
              className="mt-1 text-3xl font-bold text-[color:var(--charcoal)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Funnel & drop-off
            </h1>
            <p className="mt-1 text-sm text-[color:var(--charcoal)]/70">
              Per-step conversion across the 10-beat Studio V3 sequence.
              <Link
                to="/admin/studio-v3-audit"
                className="ml-2 underline text-[color:var(--teal)]"
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
              className="rounded bg-[color:var(--teal)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </header>

        {err && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        {!rows && !err && (
          <p className="text-sm text-[color:var(--charcoal)]/60">Loading…</p>
        )}

        {stats && (
          <>
            <section className="mb-6 grid grid-cols-3 gap-3">
              <KpiCard label="Sessions" value={stats.totalSessions.toString()} />
              <KpiCard label="Events" value={stats.totalEvents.toString()} />
              <KpiCard
                label="Confirmed"
                value={`${stats.confirmed} (${
                  stats.totalSessions > 0
                    ? Math.round((stats.confirmed / stats.totalSessions) * 100)
                    : 0
                }%)`}
              />
            </section>

            <section className="mb-8 rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
              <h2 className="border-b border-[color:var(--charcoal)]/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal)]/80">
                Per-step funnel
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2 text-right">Reached</th>
                      <th className="px-3 py-2 text-right">Continued</th>
                      <th className="px-3 py-2 text-right">Drop-off</th>
                      <th className="px-3 py-2 text-right">% of sessions</th>
                      <th className="px-3 py-2 text-right">Median time</th>
                      <th className="px-3 py-2">Reach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perStep.map((s) => {
                      const danger = s.dropPct > 25 && s.reached >= 5;
                      return (
                        <tr
                          key={s.key}
                          className="border-t border-[color:var(--charcoal)]/5"
                        >
                          <td className="px-3 py-2 tabular-nums text-[color:var(--charcoal)]/60">
                            {s.n}
                          </td>
                          <td className="px-3 py-2 font-medium">{s.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {s.reached}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {s.completed}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-semibold ${
                              danger ? "text-red-600" : "text-[color:var(--charcoal)]/70"
                            }`}
                          >
                            {s.dropPct}%
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[color:var(--charcoal)]/60">
                            {s.reachPct}%
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[color:var(--charcoal)]/60">
                            {fmtMs(s.medianMs)}
                          </td>
                          <td className="px-3 py-2 w-[160px]">
                            <div className="h-2 w-full rounded-full bg-[color:var(--charcoal)]/10">
                              <div
                                className="h-full rounded-full bg-[color:var(--gold)]"
                                style={{ width: `${s.reachPct}%` }}
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
                Investment tier → confirmation
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
                      <th className="px-3 py-2 text-right">Picks</th>
                      <th className="px-3 py-2 text-right">Confirmed</th>
                      <th className="px-3 py-2 text-right">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tiers.map((t) => (
                      <tr
                        key={t.tier}
                        className="border-t border-[color:var(--charcoal)]/5"
                      >
                        <td className="px-3 py-2 font-medium capitalize">
                          {t.tier}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.picks}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.confirmed}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-[color:var(--teal)]">
                          {t.rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <p className="text-xs text-[color:var(--charcoal)]/50">
              Showing up to 20 000 events. Drop-off &gt; 25% (with ≥5 reached)
              highlighted in red. Non-admin viewers will see empty data — RLS
              restricts SELECT to <code>has_role(admin)</code>.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/55">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold text-[color:var(--charcoal)] tabular-nums"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
