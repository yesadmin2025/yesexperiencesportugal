/**
 * Admin: legacy reference scanner.
 * Scans the source tree (via Vite import.meta.glob raw imports) and a
 * curated set of DB text columns for any remaining references to the
 * legacy domain, legacy booking URLs, GBP Place IDs / CIDs, or legacy
 * GBP / Search Console URLs. Reports exact file/line and table/column.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LEGACY_PATTERNS, isAllowlisted, type LegacyCategory } from "@/lib/legacy-scan-patterns";
import { scanDatabaseLegacy, type DbHit } from "@/lib/legacy-scan.functions";

export const Route = createFileRoute("/admin/legacy-scan")({
  head: () => ({
    meta: [
      { title: "Legacy scan — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LegacyScanPage,
});

type SourceHit = {
  path: string;
  line: number;
  category: LegacyCategory;
  patternLabel: string;
  match: string;
  snippet: string;
  allowlisted: boolean;
};

// Load every project source file as raw text at build time. Cast keeps
// TS happy across Vite versions.
// DEV ONLY: inlining every source file into the production bundle produced a
// ~9.5 MB chunk that crashed the build (out of memory). The source sweep is a
// local maintenance tool, so the raw text is only embedded in dev builds.
const RAW_SOURCES = import.meta.env.DEV
  ? (import.meta.glob(
      ["/src/**/*.{ts,tsx,js,jsx,md,mdx,json,html,css}", "!/src/routeTree.gen.ts", "!/src/**/*.d.ts"],
      { query: "?raw", import: "default", eager: true },
    ) as Record<string, string>)
  : ({} as Record<string, string>);
const RAW_PUBLIC = import.meta.env.DEV
  ? (import.meta.glob("/public/**/*.{html,xml,txt,json,md}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>)
  : ({} as Record<string, string>);

function scanSource(): SourceHit[] {
  const files = { ...RAW_SOURCES, ...RAW_PUBLIC };

  const hits: SourceHit[] = [];
  for (const [absPath, contents] of Object.entries(files)) {
    // Normalise to project-relative
    const path = absPath.replace(/^\//, "");
    if (path.includes("routeTree.gen")) continue;
    const allowlisted = isAllowlisted(path);
    const lines = contents.split(/\r?\n/);
    for (const pat of LEGACY_PATTERNS) {
      const re = new RegExp(pat.regex, pat.flags);
      lines.forEach((ln, i) => {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(ln))) {
          hits.push({
            path,
            line: i + 1,
            category: pat.category,
            patternLabel: pat.label,
            match: m[0],
            snippet: ln.trim().slice(0, 200),
            allowlisted,
          });
          if (!pat.flags.includes("g")) break;
        }
      });
    }
  }
  return hits;
}

const CATEGORY_LABELS: Record<LegacyCategory, string> = {
  "legacy-domain": "Legacy domain",
  "legacy-booking": "Legacy booking URL",
  "gbp-place-id": "GBP Place ID / CID",
  "gbp-url": "GBP URL",
  "gsc-url": "Legacy Search Console URL",
};

function LegacyScanPage() {
  const [showAllowlisted, setShowAllowlisted] = useState(false);
  const sourceHits = useMemo(() => scanSource(), []);
  const scanDb = useServerFn(scanDatabaseLegacy);
  const dbMutation = useMutation({ mutationFn: () => scanDb() });

  const visibleSource = showAllowlisted ? sourceHits : sourceHits.filter((h) => !h.allowlisted);

  const grouped = groupByCategory(visibleSource);
  const dbHits = dbMutation.data?.hits ?? [];
  const dbGrouped = groupByCategory<DbHit>(dbHits);

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] px-5 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-[color:var(--charcoal)] md:text-4xl">
          Legacy reference{" "}
          <span className="font-serif italic font-normal text-[color:var(--teal)]">scan</span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
          Full sweep of source code and key database text columns for any lingering references to
          the legacy domain <code>yesexperiences.pt</code>, legacy booking URLs, GBP Place IDs /
          CIDs, and legacy GBP / Search Console URLs. Source scan runs on load; database scan is
          on-demand.
        </p>

        {/* SOURCE ---------------------------------------------------- */}
        <section className="mt-8 rounded-lg border border-[color:var(--sand)] bg-white p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">Source tree</h2>
              <p className="text-xs text-[color:var(--charcoal-soft)]">
                {sourceHits.length} raw matches · {sourceHits.filter((h) => !h.allowlisted).length}{" "}
                outside the intentional-legacy allowlist
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-[color:var(--charcoal-soft)]">
              <input
                type="checkbox"
                checked={showAllowlisted}
                onChange={(e) => setShowAllowlisted(e.target.checked)}
              />
              Include allowlisted files
            </label>
          </header>

          {visibleSource.length === 0 ? (
            <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Clean — no unexpected legacy references in the source tree.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {(Object.keys(grouped) as LegacyCategory[]).map((cat) => (
                <CategoryBlock
                  key={cat}
                  title={CATEGORY_LABELS[cat]}
                  hits={grouped[cat]!}
                  renderKey={(h) => `${h.path}:${h.line}:${h.match}`}
                  renderMeta={(h) => (
                    <>
                      <code className="text-[color:var(--charcoal)]">{h.path}</code>
                      <span className="text-[color:var(--charcoal-soft)]">:{h.line}</span>
                      {h.allowlisted ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">
                          allowlisted
                        </span>
                      ) : null}
                    </>
                  )}
                  renderBody={(h) => (
                    <>
                      <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                        {h.patternLabel}
                      </div>
                      <pre className="mt-1 overflow-x-auto rounded bg-[color:var(--ivory)]/60 p-2 text-[11px] text-[color:var(--charcoal)]">
                        {h.snippet}
                      </pre>
                    </>
                  )}
                />
              ))}
            </div>
          )}
        </section>

        {/* DATABASE -------------------------------------------------- */}
        <section className="mt-8 rounded-lg border border-[color:var(--sand)] bg-white p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
                Database (curated text columns)
              </h2>
              <p className="text-xs text-[color:var(--charcoal-soft)]">
                Scans journal posts, contact messages, reviews, imported tours, uploads, leads and
                related URL / notes fields. Uses service-role read via server function.
              </p>
            </div>
            <button
              onClick={() => dbMutation.mutate()}
              disabled={dbMutation.isPending}
              className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)] disabled:opacity-60"
            >
              {dbMutation.isPending ? "scanning…" : "Run database scan"}
            </button>
          </header>

          {dbMutation.error ? (
            <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {dbMutation.error instanceof Error
                ? dbMutation.error.message
                : String(dbMutation.error)}
            </p>
          ) : null}

          {dbMutation.data ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-[color:var(--charcoal-soft)]">
                Scanned {dbMutation.data.scanned} rows · {dbHits.length} matches
                {dbMutation.data.skipped.length ? (
                  <>
                    {" · "}
                    <span className="text-amber-700">
                      skipped {dbMutation.data.skipped.length}: {dbMutation.data.skipped.join("; ")}
                    </span>
                  </>
                ) : null}
              </p>

              {dbHits.length === 0 ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Clean — no legacy references in scanned columns.
                </p>
              ) : (
                (Object.keys(dbGrouped) as LegacyCategory[]).map((cat) => (
                  <CategoryBlock
                    key={cat}
                    title={CATEGORY_LABELS[cat]}
                    hits={dbGrouped[cat]!}
                    renderKey={(h) => `${h.table}:${h.column}:${h.rowId}:${h.match}`}
                    renderMeta={(h) => (
                      <>
                        <code className="text-[color:var(--charcoal)]">
                          {h.table}.{h.column}
                        </code>
                        <span className="text-[color:var(--charcoal-soft)]"> · id={h.rowId}</span>
                      </>
                    )}
                    renderBody={(h) => (
                      <pre className="mt-1 overflow-x-auto rounded bg-[color:var(--ivory)]/60 p-2 text-[11px] text-[color:var(--charcoal)]">
                        {h.snippet}
                      </pre>
                    )}
                  />
                ))
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">Not scanned yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function groupByCategory<T extends { category: LegacyCategory }>(hits: T[]) {
  const out: Partial<Record<LegacyCategory, T[]>> = {};
  for (const h of hits) {
    (out[h.category] ||= []).push(h);
  }
  return out;
}

function CategoryBlock<T>({
  title,
  hits,
  renderKey,
  renderMeta,
  renderBody,
}: {
  title: string;
  hits: T[];
  renderKey: (h: T) => string;
  renderMeta: (h: T) => React.ReactNode;
  renderBody: (h: T) => React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
        {title} · {hits.length}
      </h3>
      <ul className="mt-2 space-y-2 text-xs">
        {hits.map((h) => (
          <li
            key={renderKey(h)}
            className="rounded border border-[color:var(--sand)] bg-[color:var(--ivory)]/40 p-2"
          >
            <div className="flex flex-wrap items-baseline gap-1">{renderMeta(h)}</div>
            {renderBody(h)}
          </li>
        ))}
      </ul>
    </div>
  );
}
