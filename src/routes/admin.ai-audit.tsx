import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsageRow {
  id: string;
  created_at: string;
  provider: string;
  model: string | null;
  feature: string;
  status: string;
  latency_ms: number | null;
  error_code: string | null;
  error_message: string | null;
}

interface Stats {
  total: number;
  success: number;
  failures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  avgLatency: number | null;
  byProvider: Record<string, number>;
}

const PAGE_SIZE = 50;
const STATUS_OPTIONS = ["all", "success", "failure", "rate_limited", "fallback"] as const;
const PROVIDER_OPTIONS = ["all", "openai", "lovable_ai", "none"] as const;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1).max(9999), 1).default(1),
  status: fallback(z.enum(STATUS_OPTIONS), "all").default("all"),
  provider: fallback(z.enum(PROVIDER_OPTIONS), "all").default("all"),
});

function statusColor(s: string) {
  if (s === "success") return "text-emerald-700 bg-emerald-50";
  if (s === "rate_limited") return "text-amber-800 bg-amber-50";
  if (s === "fallback") return "text-stone-700 bg-stone-100";
  return "text-rose-700 bg-rose-50";
}

function AuditPage() {
  const { page, status, provider } = Route.useSearch();

  const [allRows, setAllRows] = useState<UsageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setAllowed(false);
        return;
      }
      const { data, error } = await supabase
        .from("ai_usage_logs")
        .select("id,created_at,provider,model,feature,status,latency_ms,error_code,error_message")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!active) return;
      if (error) {
        setAllowed(false);
        setError(error.message);
        return;
      }
      setAllowed(true);
      setAllRows((data ?? []) as UsageRow[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!allRows) return null;
    return allRows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (provider !== "all" && r.provider !== provider) return false;
      return true;
    });
  }, [allRows, status, provider]);

  const stats: Stats | null = useMemo(() => {
    if (!filtered) return null;
    const success = filtered.filter((r) => r.status === "success");
    const failures = filtered.filter((r) => r.status === "failure" || r.status === "rate_limited");
    const byProvider = filtered.reduce<Record<string, number>>((acc, r) => {
      acc[r.provider] = (acc[r.provider] ?? 0) + 1;
      return acc;
    }, {});
    const latencies = filtered.map((r) => r.latency_ms).filter((n): n is number => n !== null);
    return {
      total: filtered.length,
      success: success.length,
      failures: failures.length,
      lastSuccessAt: success[0]?.created_at ?? null,
      lastFailureAt: failures[0]?.created_at ?? null,
      avgLatency: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null,
      byProvider,
    };
  }, [filtered]);

  const totalPages = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered
    ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : null;

  if (allowed === false) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[color:var(--charcoal)]">Admins only</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal)]/70">
          {error ?? "You need an admin account to view this page."}
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
          <h1 className="font-serif text-3xl text-[color:var(--charcoal)]">AI usage audit</h1>
          <Link
            to="/"
            className="text-sm text-[color:var(--charcoal)]/70 underline underline-offset-4"
          >
            Home
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal)]/70">
          Every narrative generation call is logged here. The API key value is never stored.
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} paramKey="status" />
          <FilterSelect
            label="Provider"
            value={provider}
            options={PROVIDER_OPTIONS}
            paramKey="provider"
          />
          {(status !== "all" || provider !== "all") && (
            <Link
              from="/admin/ai-audit"
              search={(prev: z.infer<typeof searchSchema>) => ({
                ...prev,
                status: "all" as const,
                provider: "all" as const,
                page: 1,
              })}
              className="text-xs text-[color:var(--charcoal)]/60 underline underline-offset-4"
            >
              Clear filters
            </Link>
          )}
        </div>

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total calls" value={String(stats.total)} />
            <Stat label="Successful" value={String(stats.success)} />
            <Stat label="Failures" value={String(stats.failures)} />
            <Stat
              label="Avg latency"
              value={stats.avgLatency !== null ? `${stats.avgLatency} ms` : "—"}
            />
            <Stat
              label="Last success"
              value={stats.lastSuccessAt ? new Date(stats.lastSuccessAt).toLocaleString() : "—"}
            />
            <Stat
              label="Last failure"
              value={stats.lastFailureAt ? new Date(stats.lastFailureAt).toLocaleString() : "—"}
            />
            <Stat
              label="By provider"
              value={
                Object.entries(stats.byProvider)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" · ") || "—"
              }
            />
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[color:var(--charcoal)]/10 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[color:var(--ivory)] text-xs uppercase tracking-wider text-[color:var(--charcoal)]/60">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {pageRows === null ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--charcoal)]/50">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[color:var(--charcoal)]/50">
                    No calls match these filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--charcoal)]/5">
                    <td className="px-4 py-3 text-[color:var(--charcoal)]/80">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{r.provider}</td>
                    <td className="px-4 py-3 text-[color:var(--charcoal)]/70">{r.model ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--charcoal)]/70">
                      {r.latency_ms !== null ? `${r.latency_ms} ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--charcoal)]/60">
                      {r.error_code
                        ? `${r.error_code}${r.error_message ? ` · ${r.error_message}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered && filtered.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[color:var(--charcoal)]/60">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <PageLink page={safePage - 1} disabled={safePage <= 1}>
                ← Prev
              </PageLink>
              <span className="text-xs text-[color:var(--charcoal)]/70">
                Page {safePage} of {totalPages}
              </span>
              <PageLink page={safePage + 1} disabled={safePage >= totalPages}>
                Next →
              </PageLink>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  paramKey,
}: {
  label: string;
  value: string;
  options: readonly string[];
  paramKey: "status" | "provider";
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[color:var(--charcoal)]/70">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          // Use location to navigate without TS friction on union types
          const url = new URL(window.location.href);
          url.searchParams.set(paramKey, v);
          url.searchParams.set("page", "1");
          window.history.pushState({}, "", url.toString());
          // Force route to re-read search via reload of search state
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
        className="rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 py-1 text-xs text-[color:var(--charcoal)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-[color:var(--charcoal)]/10 px-3 py-1 text-xs text-[color:var(--charcoal)]/30">
        {children}
      </span>
    );
  }
  return (
    <Link
      from="/admin/ai-audit"
      search={(prev: z.infer<typeof searchSchema>) => ({ ...prev, page })}
      className="rounded-md border border-[color:var(--charcoal)]/15 bg-white px-3 py-1 text-xs text-[color:var(--charcoal)] hover:bg-[color:var(--ivory)]"
    >
      {children}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--charcoal)]/10 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--charcoal)]/50">
        {label}
      </div>
      <div className="mt-1 font-serif text-base text-[color:var(--charcoal)]">{value}</div>
    </div>
  );
}

export const Route = createFileRoute("/admin/ai-audit")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "AI usage audit · YesExperiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuditPage,
});
