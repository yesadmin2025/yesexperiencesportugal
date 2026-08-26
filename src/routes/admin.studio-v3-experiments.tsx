import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeStudioFunnelStats,
  type StudioFunnelMetricRow,
} from "@/lib/studio-v3/funnelMetrics";
import {
  P14_YOUR_DAY_CTA_EXPERIMENT,
  P14_YOUR_DAY_CTA_VARIANTS,
} from "@/lib/studio-v3/experiments";

export const Route = createFileRoute("/admin/studio-v3-experiments")({
  head: () => ({
    meta: [
      { title: "Studio experiments — YES internal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: StudioV3ExperimentsPage,
});

interface FunnelRow extends StudioFunnelMetricRow {
  id: string;
}

function StudioV3ExperimentsPage() {
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date.toISOString().slice(0, 10);
  });
  const [until, setUntil] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    setError(null);
    setRows(null);
    const sinceIso = new Date(`${since}T00:00:00Z`).toISOString();
    const untilIso = new Date(`${until}T23:59:59Z`).toISOString();
    const { data, error: queryError } = await supabase
      .from("studio_v3_funnel_events")
      .select("*")
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso)
      .order("created_at", { ascending: false })
      .limit(20000);

    if (queryError) {
      setError(queryError.message);
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
  const experimentRows = useMemo(() => {
    if (!stats) return [];
    const arms = new Set<string>(Object.values(P14_YOUR_DAY_CTA_VARIANTS));
    return stats.variants.filter((variant) => arms.has(variant.variant));
  }, [stats]);

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-5 py-8 text-[color:var(--charcoal)]">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[720px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[color:var(--gold)]">
              Internal · Studio V3 · P14
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Experiment readout
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--charcoal)]/70">
              {P14_YOUR_DAY_CTA_EXPERIMENT}: control versus story-led copy on the final Your Day
              handoff. Primary conversion is the specific handoff click divided by sessions that
              actually reached Your Day.
            </p>
            <Link
              to="/admin/studio-v3-funnel"
              className="mt-2 inline-block text-xs font-semibold text-[color:var(--teal)] underline underline-offset-4"
            >
              Full funnel →
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-[color:var(--charcoal)]/70">
              From
              <input
                type="date"
                value={since}
                onChange={(event) => setSince(event.target.value)}
                className="rounded border border-[color:var(--charcoal)]/20 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[color:var(--charcoal)]/70">
              To
              <input
                type="date"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
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

        {error ? (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!rows && !error ? <p className="text-sm text-[color:var(--charcoal)]/60">Loading…</p> : null}

        {stats ? (
          <section className="overflow-hidden rounded-lg border border-[color:var(--charcoal)]/10 bg-white">
            <div className="border-b border-[color:var(--charcoal)]/10 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Your Day CTA v1</h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--charcoal)]/55">
                Do not declare a winner from tiny samples. Handoff rate is the clean copy metric;
                Guest details, checkout and confirmed are downstream guardrails.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[color:var(--sand)]/40 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--charcoal)]/60">
                  <tr>
                    <th className="px-3 py-2">Variant</th>
                    <th className="px-3 py-2 text-right">Sessions</th>
                    <th className="px-3 py-2 text-right">Your Day</th>
                    <th className="px-3 py-2 text-right">CTA click</th>
                    <th className="px-3 py-2 text-right">Your Day → CTA</th>
                    <th className="px-3 py-2 text-right">Guest details</th>
                    <th className="px-3 py-2 text-right">Checkout</th>
                    <th className="px-3 py-2 text-right">Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {experimentRows.length ? (
                    experimentRows.map((variant) => (
                      <tr key={variant.variant} className="border-t border-[color:var(--charcoal)]/5">
                        <td className="px-3 py-2 font-medium">{variant.variant}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{variant.sessions}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{variant.yourDayReached}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{variant.handoffClicked}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-[color:var(--teal)]">
                          {variant.handoffRate}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {variant.guestDetailsReached} · {variant.guestDetailsRate}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{variant.checkoutReached}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {variant.confirmed}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[color:var(--charcoal)]/55">
                        No P14 experiment sessions in this date range yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
