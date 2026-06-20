import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/error-logs")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: ErrorLogsPage,
});

interface ErrorRow {
  id: string;
  created_at: string;
  message: string;
  stack: string | null;
  source: string | null;
  url: string | null;
  user_agent: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  route: string | null;
  session_id: string | null;
  severity: string;
  metadata: Record<string, unknown>;
}

type SeverityFilter = "all" | "error" | "unhandled_rejection" | "resource" | "warning" | "info";
type DeviceFilter = "all" | "mobile" | "desktop";

function isMobileUA(ua: string | null, w: number | null): boolean {
  if (w && w < 768) return true;
  if (!ua) return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

function ErrorLogsPage() {
  const [rows, setRows] = useState<ErrorRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [device, setDevice] = useState<DeviceFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const { data, error } = await supabase
      .from("client_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as ErrorRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (severity !== "all" && r.severity !== severity) return false;
      if (device === "mobile" && !isMobileUA(r.user_agent, r.viewport_width)) return false;
      if (device === "desktop" && isMobileUA(r.user_agent, r.viewport_width)) return false;
      return true;
    });
  }, [rows, severity, device]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, mobile: 0, last24h: 0 };
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let mobile = 0;
    let last24h = 0;
    for (const r of rows) {
      if (isMobileUA(r.user_agent, r.viewport_width)) mobile += 1;
      if (new Date(r.created_at).getTime() > cutoff) last24h += 1;
    }
    return { total: rows.length, mobile, last24h };
  }, [rows]);

  async function clearAll() {
    if (!confirm("Delete ALL error logs? This cannot be undone.")) return;
    const { error } = await supabase
      .from("client_error_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] text-[color:var(--charcoal)]">
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Error Logs</h1>
            <p className="mt-1 text-sm text-[color:var(--charcoal)]/60">
              Runtime errors captured from real visitor browsers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-[2px] border border-[color:var(--charcoal)]/20 px-3 py-2 text-xs uppercase tracking-[0.18em]"
            >
              Home
            </Link>
            <button
              onClick={load}
              className="rounded-[2px] border border-[color:var(--charcoal)]/20 px-3 py-2 text-xs uppercase tracking-[0.18em]"
            >
              Refresh
            </button>
            <button
              onClick={clearAll}
              className="rounded-[2px] border border-red-500/40 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-600"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Total" value={stats.total} />
          <Stat label="Mobile" value={stats.mobile} />
          <Stat label="Last 24h" value={stats.last24h} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Select
            label="Severity"
            value={severity}
            onChange={(v) => setSeverity(v as SeverityFilter)}
            options={[
              ["all", "All"],
              ["error", "Error"],
              ["unhandled_rejection", "Unhandled rejection"],
              ["resource", "Resource"],
              ["warning", "Warning"],
              ["info", "Info"],
            ]}
          />
          <Select
            label="Device"
            value={device}
            onChange={(v) => setDevice(v as DeviceFilter)}
            options={[
              ["all", "All"],
              ["mobile", "Mobile"],
              ["desktop", "Desktop"],
            ]}
          />
        </div>

        {err && (
          <div className="mb-4 rounded-[2px] border border-red-500/40 bg-red-50 p-3 text-sm text-red-700">
            {err} — you may not have admin role.
          </div>
        )}

        {rows === null ? (
          <p className="text-sm text-[color:var(--charcoal)]/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--charcoal)]/60">
            No errors match the current filters.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[3px] border border-[color:var(--charcoal)]/15 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[color:var(--sand)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/70">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Sev</th>
                  <th className="px-3 py-2">Dev</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const mobile = isMobileUA(r.user_agent, r.viewport_width);
                  const isOpen = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="cursor-pointer border-t border-[color:var(--charcoal)]/10 hover:bg-[color:var(--sand)]/40"
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        <td className="px-3 py-2 align-top whitespace-nowrap text-[color:var(--charcoal)]/70">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                              r.severity === "error" || r.severity === "unhandled_rejection"
                                ? "bg-red-100 text-red-700"
                                : r.severity === "resource"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {mobile ? "📱" : "💻"} {r.viewport_width}×{r.viewport_height}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-[11px]">
                          {r.route ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2 max-w-[480px]">{r.message}</div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-[color:var(--charcoal)]/10 bg-[color:var(--sand)]/30">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="space-y-2 font-mono text-[11px]">
                              <Field label="URL" value={r.url} />
                              <Field label="Source" value={r.source} />
                              <Field label="User agent" value={r.user_agent} />
                              <Field label="Session" value={r.session_id} />
                              {r.stack && (
                                <div>
                                  <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
                                    Stack
                                  </div>
                                  <pre className="overflow-auto rounded-[2px] bg-[color:var(--charcoal)] p-2 text-[11px] text-[color:var(--ivory)]">
                                    {r.stack}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[3px] border border-[color:var(--charcoal)]/15 bg-white p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[2px] border border-[color:var(--charcoal)]/20 bg-white px-2 py-1.5"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
        {label}:{" "}
      </span>
      <span className="break-all">{value}</span>
    </div>
  );
}
