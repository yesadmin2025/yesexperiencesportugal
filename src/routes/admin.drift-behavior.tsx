import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin · Drift behavior events export.
 *
 * Lets an admin pull `drift_behavior_events` rows (the predictive-engine
 * telemetry — decision latency, linger, skip, attraction, and
 * `prediction_update` snapshots) and download them as CSV or JSON so
 * real-time adaptation can be analyzed outside the app.
 *
 * RLS already restricts SELECT on this table to admins, so we use the
 * standard browser client. No server function needed.
 */

const SIGNAL_TYPES = [
  "all",
  "decision",
  "linger",
  "skip",
  "attraction",
  "prediction_update",
] as const;

type SignalType = (typeof SIGNAL_TYPES)[number];

interface BehaviorRow {
  id: string;
  occurred_at: string;
  session_id: string;
  signal_type: string;
  chapter_id: string | null;
  decision_latency_ms: number | null;
  linger_ms: number | null;
  attraction_target: string | null;
  predicted_archetype: string | null;
  predicted_tonal_register: string | null;
  predicted_intensity: string | null;
  reveal_confidence: number | null;
  meta: Record<string, unknown> | null;
}

const LIMIT_OPTIONS = [200, 500, 1000, 5000] as const;
const PREVIEW_ROWS = 25;

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: BehaviorRow[]): string {
  const headers = [
    "id",
    "occurred_at",
    "session_id",
    "signal_type",
    "chapter_id",
    "decision_latency_ms",
    "linger_ms",
    "attraction_target",
    "predicted_archetype",
    "predicted_tonal_register",
    "predicted_intensity",
    "reveal_confidence",
    "meta",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.occurred_at,
        r.session_id,
        r.signal_type,
        r.chapter_id,
        r.decision_latency_ms,
        r.linger_ms,
        r.attraction_target,
        r.predicted_archetype,
        r.predicted_tonal_register,
        r.predicted_intensity,
        r.reveal_confidence,
        r.meta,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DriftBehaviorPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BehaviorRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState(todayIso(-7));
  const [to, setTo] = useState(todayIso(1));
  const [signal, setSignal] = useState<SignalType>("all");
  const [sessionId, setSessionId] = useState("");
  const [limit, setLimit] = useState<number>(1000);

  // Initial auth check + first load
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (active) setAllowed(false);
        return;
      }
      if (active) setAllowed(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("drift_behavior_events")
      .select(
        "id,occurred_at,session_id,signal_type,chapter_id,decision_latency_ms,linger_ms,attraction_target,predicted_archetype,predicted_tonal_register,predicted_intensity,reveal_confidence,meta",
      )
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (from) q = q.gte("occurred_at", new Date(from).toISOString());
    if (to) q = q.lte("occurred_at", new Date(`${to}T23:59:59.999Z`).toISOString());
    if (signal !== "all") q = q.eq("signal_type", signal);
    if (sessionId.trim()) q = q.eq("session_id", sessionId.trim());

    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data ?? []) as BehaviorRow[]);
    }
    setLoading(false);
  };

  // Auto-run once allowed
  useEffect(() => {
    if (allowed) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const stamp = useMemo(
    () => new Date().toISOString().replace(/[:.]/g, "-"),
    [rows],
  );

  const onDownloadJson = () => {
    if (!rows) return;
    download(
      `drift-behavior-${stamp}.json`,
      "application/json",
      JSON.stringify(rows, null, 2),
    );
  };
  const onDownloadCsv = () => {
    if (!rows) return;
    download(`drift-behavior-${stamp}.csv`, "text/csv", toCsv(rows));
  };

  if (allowed === false) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[color:var(--charcoal)]">Admins only</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal)]/70">
          You need an admin account to export drift behavior telemetry.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm underline underline-offset-4">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl pb-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl text-[color:var(--charcoal)]">
            Drift behavior export
          </h1>
          <Link to="/" className="text-sm text-[color:var(--charcoal)]/70 underline underline-offset-4">
            Home
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal)]/70">
          Pull raw predictive-engine telemetry (decisions, linger, skip, attractions,
          prediction snapshots) and download as CSV or JSON for offline analysis.
        </p>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="From">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
            />
          </Field>
          <Field label="Signal">
            <select
              value={signal}
              onChange={(e) => setSignal(e.target.value as SignalType)}
              className="w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
            >
              {SIGNAL_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Session id">
            <input
              type="text"
              placeholder="optional"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
            />
          </Field>
          <Field label="Limit">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="rounded-md bg-[color:var(--charcoal)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--ivory)] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Run query"}
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={!rows || rows.length === 0}
            className="rounded-md border border-[color:var(--charcoal)]/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--charcoal)] disabled:opacity-40"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={onDownloadJson}
            disabled={!rows || rows.length === 0}
            className="rounded-md border border-[color:var(--charcoal)]/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--charcoal)] disabled:opacity-40"
          >
            Download JSON
          </button>
          <span className="text-xs text-[color:var(--charcoal)]/60">
            {rows ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Preview */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[color:var(--charcoal)]/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[color:var(--ivory)] uppercase tracking-wider text-[color:var(--charcoal)]/60">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Signal</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Chapter</th>
                <th className="px-3 py-2">Latency</th>
                <th className="px-3 py-2">Linger</th>
                <th className="px-3 py-2">Attraction</th>
                <th className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {!rows ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[color:var(--charcoal)]/50">
                    {loading ? "Loading…" : "Run a query to preview rows."}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[color:var(--charcoal)]/50">
                    No rows for these filters.
                  </td>
                </tr>
              ) : (
                rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--charcoal)]/5">
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/80">
                      {new Date(r.occurred_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.signal_type}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[color:var(--charcoal)]/70">
                      {r.session_id.slice(0, 12)}…
                    </td>
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/70">{r.chapter_id ?? "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/70">
                      {r.decision_latency_ms ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/70">{r.linger_ms ?? "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/70">
                      {r.attraction_target ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--charcoal)]/70">
                      {r.reveal_confidence ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {rows && rows.length > PREVIEW_ROWS && (
            <div className="border-t border-[color:var(--charcoal)]/5 px-3 py-2 text-[10px] uppercase tracking-wider text-[color:var(--charcoal)]/50">
              Preview limited to first {PREVIEW_ROWS} rows · download for full dataset
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[color:var(--charcoal)]/60">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const Route = createFileRoute("/admin/drift-behavior")({
  head: () => ({
    meta: [
      { title: "Drift behavior export · YesExperiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DriftBehaviorPage,
});
