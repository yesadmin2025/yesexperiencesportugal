import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listGscSites,
  inspectGscUrl,
  listGscSitemaps,
  submitGscSitemap,
  deleteGscSitemap,
  type UrlInspectionResult,
  type GscSitemap,
} from "@/lib/gsc.functions";

export const Route = createFileRoute("/admin/gsc")({
  head: () => ({
    meta: [
      { title: "Google Search Console — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: GscPage,
});

const DEFAULT_URL = "https://yesexperiencesportugal.com/";

function verdictTone(v?: string): "ok" | "warn" | "bad" | "idle" {
  if (!v) return "idle";
  if (v === "PASS") return "ok";
  if (v === "PARTIAL" || v === "NEUTRAL") return "warn";
  if (v === "FAIL") return "bad";
  return "idle";
}

function Dot({ tone }: { tone: "ok" | "warn" | "bad" | "idle" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-400"
        : tone === "bad"
          ? "bg-rose-500"
          : "bg-stone-300";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function GscPage() {
  const listSites = useServerFn(listGscSites);
  const inspectFn = useServerFn(inspectGscUrl);
  const listSitemapsFn = useServerFn(listGscSitemaps);
  const submitSitemapFn = useServerFn(submitGscSitemap);
  const deleteSitemapFn = useServerFn(deleteGscSitemap);
  const qc = useQueryClient();

  const sitesQ = useQuery({
    queryKey: ["gsc-sites"],
    queryFn: () => listSites(),
    staleTime: 60_000,
  });

  const [siteUrl, setSiteUrl] = useState<string>("https://yesexperiencesportugal.com/");
  const [inspectUrlValue, setInspectUrlValue] = useState<string>(DEFAULT_URL);
  const [inspection, setInspection] = useState<UrlInspectionResult | null>(null);
  const [newSitemap, setNewSitemap] = useState("https://yesexperiencesportugal.com/sitemap.xml");

  const inspectMut = useMutation({
    mutationFn: () => inspectFn({ data: { url: inspectUrlValue, siteUrl } }),
    onSuccess: (r) => setInspection(r),
  });

  const sitemapsQ = useQuery({
    queryKey: ["gsc-sitemaps", siteUrl],
    queryFn: () => listSitemapsFn({ data: { siteUrl } }),
    enabled: !!siteUrl,
  });

  const submitSitemapMut = useMutation({
    mutationFn: (feedpath: string) => submitSitemapFn({ data: { siteUrl, feedpath } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsc-sitemaps", siteUrl] }),
  });

  const deleteSitemapMut = useMutation({
    mutationFn: (feedpath: string) => deleteSitemapFn({ data: { siteUrl, feedpath } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsc-sitemaps", siteUrl] }),
  });

  const idx = inspection?.indexStatus;

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-5 py-10 md:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Admin · SEO
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[color:var(--charcoal)]">
            Google Search Console
          </h1>
          <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
            URL Inspection ao vivo, gestão de sitemaps e deep-links para "Request Indexing" (que
            continua a ser UI-only na GSC).
          </p>
        </header>

        {/* Property selector */}
        <section className="rounded-lg border border-[color:var(--sand)] bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Propriedade
          </h2>
          {sitesQ.isLoading && (
            <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">
              a carregar propriedades…
            </p>
          )}
          {sitesQ.error && (
            <p className="mt-2 text-xs text-rose-600">
              {sitesQ.error instanceof Error ? sitesQ.error.message : String(sitesQ.error)}
            </p>
          )}
          {sitesQ.data && (
            <select
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="mt-2 w-full rounded border border-[color:var(--sand)] bg-white px-3 py-2 text-sm text-[color:var(--charcoal)]"
            >
              {sitesQ.data.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl}>
                  {s.siteUrl} — {s.permissionLevel}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* URL Inspection */}
        <section className="rounded-lg border border-[color:var(--sand)] bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            URL Inspection
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={inspectUrlValue}
              onChange={(e) => setInspectUrlValue(e.target.value)}
              placeholder="https://yesexperiencesportugal.com/..."
              className="flex-1 rounded border border-[color:var(--sand)] bg-white px-3 py-2 text-sm text-[color:var(--charcoal)]"
            />
            <button
              onClick={() => inspectMut.mutate()}
              disabled={inspectMut.isPending || !inspectUrlValue}
              className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {inspectMut.isPending ? "a inspecionar…" : "Inspecionar"}
            </button>
          </div>

          {inspectMut.error && (
            <p className="mt-3 text-xs text-rose-600">
              {inspectMut.error instanceof Error
                ? inspectMut.error.message
                : String(inspectMut.error)}
            </p>
          )}

          {inspection && !inspection.ok && (
            <p className="mt-3 rounded bg-rose-50 p-3 text-xs text-rose-700">{inspection.error}</p>
          )}

          {inspection?.ok && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Row label="Verdict">
                  <span className="inline-flex items-center gap-2">
                    <Dot tone={verdictTone(idx?.verdict)} />
                    <strong>{idx?.verdict ?? "—"}</strong>
                  </span>
                </Row>
                <Row label="Coverage">{idx?.coverageState ?? "—"}</Row>
                <Row label="Indexing state">{idx?.indexingState ?? "—"}</Row>
                <Row label="Robots.txt">{idx?.robotsTxtState ?? "—"}</Row>
                <Row label="Page fetch">{idx?.pageFetchState ?? "—"}</Row>
                <Row label="Crawled as">{idx?.crawledAs ?? "—"}</Row>
                <Row label="Last crawl">
                  {idx?.lastCrawlTime ? new Date(idx.lastCrawlTime).toLocaleString("pt-PT") : "—"}
                </Row>
                <Row label="Google canonical">
                  <span className="break-all">{idx?.googleCanonical ?? "—"}</span>
                </Row>
                <Row label="User canonical">
                  <span className="break-all">{idx?.userCanonical ?? "—"}</span>
                </Row>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[color:var(--sand)] pt-4">
                <a
                  href={inspection.gscInspectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[color:var(--teal)] px-4 py-1.5 text-xs font-medium text-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-white"
                >
                  Abrir na GSC · Request Indexing →
                </a>
                <button
                  onClick={() => inspectMut.mutate()}
                  disabled={inspectMut.isPending}
                  className="rounded-full border border-[color:var(--charcoal)] px-4 py-1.5 text-xs font-medium text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)] hover:text-white disabled:opacity-60"
                >
                  Re-inspecionar
                </button>
              </div>

              <p className="text-[11px] text-[color:var(--charcoal-soft)]">
                Nota: "Request Indexing" não está disponível via API. O botão acima abre o URL
                Inspection do GSC — basta clicar em "Solicitar indexação".
              </p>
            </div>
          )}
        </section>

        {/* Sitemaps */}
        <section className="rounded-lg border border-[color:var(--sand)] bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Sitemaps
          </h2>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newSitemap}
              onChange={(e) => setNewSitemap(e.target.value)}
              placeholder="https://exemplo.com/sitemap.xml"
              className="flex-1 rounded border border-[color:var(--sand)] bg-white px-3 py-2 text-sm text-[color:var(--charcoal)]"
            />
            <button
              onClick={() => submitSitemapMut.mutate(newSitemap)}
              disabled={submitSitemapMut.isPending || !newSitemap}
              className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitSitemapMut.isPending ? "a submeter…" : "Submeter"}
            </button>
          </div>
          {submitSitemapMut.error && (
            <p className="mt-2 text-xs text-rose-600">
              {submitSitemapMut.error instanceof Error
                ? submitSitemapMut.error.message
                : String(submitSitemapMut.error)}
            </p>
          )}

          <div className="mt-5 space-y-2">
            {sitemapsQ.isLoading && (
              <p className="text-xs text-[color:var(--charcoal-soft)]">a carregar sitemaps…</p>
            )}
            {sitemapsQ.error && (
              <p className="text-xs text-rose-600">
                {sitemapsQ.error instanceof Error
                  ? sitemapsQ.error.message
                  : String(sitemapsQ.error)}
              </p>
            )}
            {sitemapsQ.data?.length === 0 && (
              <p className="text-xs text-[color:var(--charcoal-soft)]">
                Nenhum sitemap submetido para esta propriedade.
              </p>
            )}
            {sitemapsQ.data?.map((s: GscSitemap) => (
              <article
                key={s.path}
                className="flex flex-col gap-2 rounded border border-[color:var(--sand)] p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[color:var(--charcoal)]">{s.path}</p>
                  <p className="mt-0.5 text-[color:var(--charcoal-soft)]">
                    Submetido{" "}
                    {s.lastSubmitted ? new Date(s.lastSubmitted).toLocaleDateString("pt-PT") : "—"}{" "}
                    · Descarregado{" "}
                    {s.lastDownloaded
                      ? new Date(s.lastDownloaded).toLocaleDateString("pt-PT")
                      : "—"}
                    {s.errors && s.errors !== "0" ? ` · ⚠ ${s.errors} erros` : ""}
                    {s.warnings && s.warnings !== "0" ? ` · ${s.warnings} avisos` : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remover sitemap ${s.path}?`)) deleteSitemapMut.mutate(s.path);
                  }}
                  disabled={deleteSitemapMut.isPending}
                  className="shrink-0 rounded-full border border-rose-400 px-3 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-500 hover:text-white disabled:opacity-60"
                >
                  Remover
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[color:var(--charcoal)]">{children}</p>
    </div>
  );
}
