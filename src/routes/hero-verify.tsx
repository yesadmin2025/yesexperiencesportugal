import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HERO_COPY, HERO_COPY_VERSION } from "@/content/hero-copy";
import {
  buildFilename,
  isMulti,
  toCsv,
  triggerDownload,
  type CheckResult,
  type MultiResponse,
  type SingleResponse,
  type VerifyResponse,
} from "@/lib/hero-verify-download";
import { clearHistory, loadHistory, saveRun, type HistoryEntry } from "@/lib/hero-verify-history";
import { diffReports, type FieldChange } from "@/lib/hero-verify-diff";

export const Route = createFileRoute("/hero-verify")({
  head: () => ({
    meta: [
      { title: "Verify Live Hero Copy — Internal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HeroVerifyPage,
});

function HeroVerifyPage() {
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetOverride, setTargetOverride] = useState("");
  const [checkAllPages, setCheckAllPages] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  // Hydrate history from localStorage after mount (SSR-safe).
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (targetOverride.trim()) params.set("url", targetOverride.trim());
      if (checkAllPages) params.set("all", "1");
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`/api/verify-hero${qs}`, { cache: "no-store" });
      const json = (await res.json()) as VerifyResponse;
      setResult(json);
      setHistory(saveRun(json));
    } catch (err) {
      setResult({
        ok: false,
        target: targetOverride || "(default)",
        httpStatus: 0,
        sourceVersion: HERO_COPY_VERSION,
        liveVersion: null,
        versionMatch: null,
        checks: [],
        missing: [],
        checkedAt: new Date().toISOString(),
        error: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [targetOverride, checkAllPages]);

  const downloadJson = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, buildFilename(result, "json"));
  }, [result]);

  const downloadCsv = useCallback(() => {
    if (!result) return;
    const csv = toCsv(result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, buildFilename(result, "csv"));
  }, [result]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
    setCompareMode(false);
  }, []);

  // The two most recent runs, oldest first.
  const compareEntries = useMemo<[HistoryEntry, HistoryEntry] | null>(() => {
    if (history.length < 2) return null;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    return [prev, last];
  }, [history]);

  const diff = useMemo<FieldChange[] | null>(() => {
    if (!compareMode || !compareEntries) return null;
    return diffReports(compareEntries[0].result, compareEntries[1].result);
  }, [compareMode, compareEntries]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Verify Live Hero Copy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        After clicking <strong>Publish → Update</strong>, run this check to confirm the live
        deployment matches the current source strings.
      </p>

      <div className="mt-6 space-y-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Target URL (optional — defaults to published site)
        </label>
        <input
          type="url"
          value={targetOverride}
          onChange={(e) => setTargetOverride(e.target.value)}
          placeholder="https://your-site.lovable.app"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checkAllPages}
            onChange={(e) => setCheckAllPages(e.target.checked)}
            className="size-4"
          />
          Check all builder-generated pages (every route must contain all 7 hero strings)
        </label>

        <button
          onClick={runCheck}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:opacity-50"
        >
          {loading ? "Checking…" : checkAllPages ? "Run check on all pages" : "Run check now"}
        </button>

        {result && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={downloadJson}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Download JSON
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Download CSV
            </button>
            <span className="self-center text-xs text-muted-foreground">
              Use these in CI logs or to share results.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              disabled={!compareEntries}
              className="size-4"
            />
            Compare last two runs
          </label>
          <span className="text-xs text-muted-foreground">
            History: {history.length} run(s)
            {!compareEntries && " — need at least 2 to compare"}
          </span>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear history
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Source version: <code>{HERO_COPY_VERSION}</code>
        </p>
      </div>

      {compareMode && compareEntries && diff && (
        <DiffView before={compareEntries[0]} after={compareEntries[1]} changes={diff} />
      )}

      {result?.specDrift && !result.specDrift.ok && (
        <section className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <strong className="text-sm">Source HERO_COPY drifted from frozen spec</strong>
          <p className="mt-1 text-xs text-muted-foreground">
            The strings in <code>src/content/hero-copy.ts</code> no longer match the approved spec
            in <code>src/content/hero-copy.spec.ts</code>. Live-page checks below use the spec, not
            the source.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {result.specDrift.drifted.map((d) => (
              <li key={d.key} className="rounded border border-border p-2">
                <div className="font-medium">{d.key}</div>
                <div className="mt-1 text-green-700">
                  spec: <span className="text-foreground">{d.expected}</span>
                </div>
                <div className="text-red-700">
                  source: <span className="text-foreground">{d.actual}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result && !isMulti(result) && <SinglePageReport result={result} />}

      {result && isMulti(result) && <MultiPageReport result={result} />}
    </main>
  );
}

function StatusBanner({
  ok,
  title,
  children,
}: {
  ok: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block size-2.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
        />
        <strong className="text-sm">{title}</strong>
      </div>
      {children}
    </div>
  );
}

function SinglePageReport({ result }: { result: SingleResponse }) {
  return (
    <section className="mt-8 space-y-4">
      <StatusBanner
        ok={result.ok}
        title={result.ok ? "All strings match live" : "Mismatch detected"}
      >
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">HTTP status</dt>
          <dd>{result.httpStatus || "—"}</dd>
          <dt className="text-muted-foreground">Source version</dt>
          <dd>
            <code>{result.sourceVersion}</code>
          </dd>
          <dt className="text-muted-foreground">Live version</dt>
          <dd>
            <code>{result.liveVersion ?? "(not exposed)"}</code>
            {result.versionMatch === false && <span className="ml-2 text-red-600">stale</span>}
            {result.versionMatch === true && <span className="ml-2 text-green-600">match</span>}
          </dd>
          <dt className="text-muted-foreground">Target</dt>
          <dd className="truncate">{result.target}</dd>
          <dt className="text-muted-foreground">Checked at</dt>
          <dd>{new Date(result.checkedAt).toLocaleTimeString()}</dd>
        </dl>
        {result.error && <p className="mt-3 text-xs text-red-600">{result.error}</p>}
      </StatusBanner>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {result.checks.map((c) => (
          <CheckRow key={c.key} check={c} />
        ))}
      </ul>
    </section>
  );
}

function MultiPageReport({ result }: { result: MultiResponse }) {
  return (
    <section className="mt-8 space-y-4">
      <StatusBanner
        ok={result.ok}
        title={
          result.ok
            ? `All ${result.totalPages} pages contain every hero string`
            : `${result.failedCount} of ${result.totalPages} pages failed`
        }
      >
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Source version</dt>
          <dd>
            <code>{result.sourceVersion}</code>
          </dd>
          <dt className="text-muted-foreground">Base URL</dt>
          <dd className="truncate">{result.base}</dd>
          <dt className="text-muted-foreground">Checked at</dt>
          <dd>{new Date(result.checkedAt).toLocaleTimeString()}</dd>
        </dl>
      </StatusBanner>

      <ul className="space-y-2">
        {result.pages.map((page) => (
          <li
            key={page.path}
            className={`rounded-lg border p-3 ${
              page.ok ? "border-border bg-background" : "border-red-500/40 bg-red-500/5"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2 shrink-0 rounded-full ${page.ok ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <code className="text-sm">{page.path}</code>
                  <span className="text-xs text-muted-foreground">
                    HTTP {page.httpStatus || "—"}
                  </span>
                </div>
                {page.error && <p className="mt-1 text-xs text-red-600">{page.error}</p>}
              </div>
              <span
                className={`text-xs font-medium ${page.ok ? "text-green-600" : "text-red-600"}`}
              >
                {page.ok ? "OK" : `${page.missing.length}/${page.checks.length || 7} missing`}
              </span>
            </div>
            {!page.ok && page.missing.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-border pt-2">
                {page.missing.map((m) => (
                  <li key={m.key} className="text-xs">
                    <span className="font-medium text-red-600">{m.key}</span>
                    <span className="ml-2 text-muted-foreground">
                      {HERO_COPY[m.key as keyof typeof HERO_COPY]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <span
        className={`mt-1 inline-block size-2 shrink-0 rounded-full ${check.found ? "bg-green-500" : "bg-red-500"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{check.key}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {HERO_COPY[check.key as keyof typeof HERO_COPY]}
        </div>
      </div>
      <span className={`text-xs font-medium ${check.found ? "text-green-600" : "text-red-600"}`}>
        {check.found ? "found" : "MISSING"}
      </span>
    </li>
  );
}

function DiffView({
  before,
  after,
  changes,
}: {
  before: HistoryEntry;
  after: HistoryEntry;
  changes: FieldChange[];
}) {
  const grouped = useMemo(() => {
    const g: Record<string, FieldChange[]> = {
      report: [],
      spec_drift: [],
      page: [],
    };
    for (const c of changes) g[c.scope].push(c);
    return g;
  }, [changes]);

  return (
    <section className="mt-6 space-y-4">
      <header className="rounded-lg border border-border bg-muted/30 p-4">
        <strong className="text-sm">
          Comparing last two runs
          {changes.length === 0 && " — no differences"}
        </strong>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Before</dt>
          <dd>{new Date(before.savedAt).toLocaleString()}</dd>
          <dt className="text-muted-foreground">After</dt>
          <dd>{new Date(after.savedAt).toLocaleString()}</dd>
          <dt className="text-muted-foreground">Total changes</dt>
          <dd>{changes.length}</dd>
        </dl>
      </header>

      {(["report", "spec_drift", "page"] as const).map((scope) =>
        grouped[scope].length === 0 ? null : (
          <div key={scope} className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {scope === "report"
                ? "Report-level"
                : scope === "spec_drift"
                  ? "Spec drift"
                  : "Per-page"}
            </div>
            <ul className="divide-y divide-border">
              {grouped[scope].map((c, i) => (
                <DiffRow key={`${scope}-${i}`} change={c} />
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}

function DiffRow({ change }: { change: FieldChange }) {
  const tone =
    change.kind === "added"
      ? "bg-green-500/5 border-l-green-500"
      : change.kind === "removed"
        ? "bg-red-500/5 border-l-red-500"
        : "bg-amber-500/5 border-l-amber-500";

  return (
    <li className={`border-l-4 px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <code className="font-medium">{change.path}</code>
        <span className="rounded bg-background px-1.5 py-0.5 text-[11px] font-medium uppercase">
          {change.kind}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <span className="text-muted-foreground">before</span>
        <span className="break-words text-red-700">{change.before}</span>
        <span className="text-muted-foreground">after</span>
        <span className="break-words text-green-700">{change.after}</span>
      </div>
    </li>
  );
}
