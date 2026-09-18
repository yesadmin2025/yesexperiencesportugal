import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { inspectGscUrls, type UrlInspectionResult } from "@/lib/gscMonitor.functions";
import {
  getBookingConversions,
  getRetiredUrlRedirects,
  getSearchPerformance,
  type BookingConversionRow,
  type RetiredUrlRow,
  type SearchPerformance,
} from "@/lib/seoPerformance.functions";
import { auditSeoUrls, type SeoAuditResult } from "@/lib/seoAudit.functions";

const KEY_URLS = [
  "https://yesexperiencesportugal.com/",
  "https://yesexperiencesportugal.com/experiences",
  "https://yesexperiencesportugal.com/studio-v3",
  "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
  "https://yesexperiencesportugal.com/local-stories/best-day-trips-from-lisbon",
];

export const Route = createFileRoute("/admin/seo-monitor")({
  head: () => ({
    meta: [
      { title: "SEO Monitor — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SeoMonitorPage,
});

const SITE = "https://yesexperiencesportugal.com";

type CheckState = {
  url: string;
  status?: number;
  ok?: boolean;
  contentType?: string;
  bytes?: number;
  lastmodCount?: number;
  error?: string;
  checking: boolean;
};

const CHECKS: { label: string; url: string; expect: string }[] = [
  { label: "sitemap.xml", url: `${SITE}/sitemap.xml`, expect: "application/xml" },
  { label: "robots.txt", url: `${SITE}/robots.txt`, expect: "text/plain" },
  { label: "Homepage", url: `${SITE}/`, expect: "text/html" },
];

async function probe(url: string): Promise<Partial<CheckState>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const lastmodCount = (text.match(/<lastmod>/g) || []).length;
    return {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") || "",
      bytes: text.length,
      lastmodCount: lastmodCount || undefined,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const REFRESH_EVENT = "seo-monitor:refresh-all";

function GlobalRefresh({ probeRun, probeAt }: { probeRun: () => Promise<void>; probeAt: string }) {
  const [busy, setBusy] = useState(false);
  const [lastAt, setLastAt] = useState<string>("");
  const [done, setDone] = useState({ probe: false, gsc: false, audit: false });

  async function refreshAll() {
    setBusy(true);
    setDone({ probe: false, gsc: false, audit: false });
    const finished: Record<string, boolean> = { probe: false, gsc: false, audit: false };
    const markDone = (k: "gsc" | "audit") => {
      finished[k] = true;
      setDone((d) => ({ ...d, [k]: true }));
      if (finished.probe && finished.gsc && finished.audit) {
        setLastAt(new Date().toLocaleString("pt-PT"));
        setBusy(false);
      }
    };
    window.addEventListener("seo-monitor:gsc-done", () => markDone("gsc"), { once: true });
    window.addEventListener("seo-monitor:audit-done", () => markDone("audit"), { once: true });
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
    await probeRun();
    finished.probe = true;
    setDone((d) => ({ ...d, probe: true }));
    if (finished.gsc && finished.audit) {
      setLastAt(new Date().toLocaleString("pt-PT"));
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-[color:var(--gold)]/40 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Atualizar tudo
          </p>
          <p className="mt-1 text-sm font-medium text-[color:var(--charcoal)]">
            GSC + Auditoria SEO + Ficheiros
          </p>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Último refresh global:{" "}
            <span className="font-medium text-[color:var(--charcoal)]">
              {lastAt || probeAt || "—"}
            </span>
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={busy}
          className="rounded-full bg-[color:var(--charcoal)] px-5 py-2.5 text-xs font-medium text-white hover:bg-[color:var(--teal)] disabled:opacity-60"
        >
          {busy ? "A atualizar…" : "Atualizar agora"}
        </button>
      </div>
      {busy ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Pill label="Ficheiros" done={done.probe} />
          <Pill label="GSC" done={done.gsc} />
          <Pill label="Auditoria" done={done.audit} />
        </div>
      ) : null}
    </div>
  );
}

function Pill({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        done
          ? "bg-emerald-50 text-emerald-700"
          : "bg-[color:var(--sand)] text-[color:var(--charcoal-soft)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}
      />
      {label}
    </span>
  );
}

function SeoMonitorPage() {
  const [checks, setChecks] = useState<Record<string, CheckState>>(() =>
    Object.fromEntries(CHECKS.map((c) => [c.url, { url: c.url, checking: true }])),
  );
  const [runAt, setRunAt] = useState<string>("");

  async function runAll() {
    setRunAt(new Date().toLocaleString("pt-PT"));
    setChecks((prev) => {
      const next = { ...prev };
      for (const c of CHECKS) next[c.url] = { url: c.url, checking: true };
      return next;
    });
    await Promise.all(
      CHECKS.map(async (c) => {
        const r = await probe(c.url);
        setChecks((prev) => ({ ...prev, [c.url]: { url: c.url, checking: false, ...r } }));
      }),
    );
  }

  useEffect(() => {
    runAll();
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] px-5 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-[color:var(--charcoal)] md:text-4xl">
          SEO{" "}
          <span className="font-serif italic font-normal text-[color:var(--teal)]">monitor</span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
          Estado dos ficheiros de indexação e atalhos para o Google Search Console.
        </p>

        <GlobalRefresh probeRun={runAll} probeAt={runAt} />

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-[color:var(--charcoal-soft)]">
            Ficheiros: <span className="font-medium">{runAt || "—"}</span>
          </p>
          <button
            onClick={runAll}
            className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)]"
          >
            Voltar a verificar
          </button>
        </div>

        <section className="mt-6 space-y-3">
          {CHECKS.map((c) => {
            const s = checks[c.url];
            const ok = s?.ok;
            const dot = s?.checking ? "bg-amber-400" : ok ? "bg-emerald-500" : "bg-rose-500";
            return (
              <div
                key={c.url}
                className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                    <div>
                      <p className="font-medium text-[color:var(--charcoal)]">{c.label}</p>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[color:var(--teal)] underline"
                      >
                        {c.url.replace(SITE, "")}
                      </a>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[color:var(--charcoal-soft)]">
                    {s?.checking ? (
                      "a verificar…"
                    ) : s?.error ? (
                      <span className="text-rose-600">{s.error}</span>
                    ) : (
                      <>
                        <div>HTTP {s?.status}</div>
                        <div>{(s?.bytes ?? 0).toLocaleString()} bytes</div>
                        {s?.lastmodCount ? <div>{s.lastmodCount} URLs (sitemap)</div> : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
            Atalhos Google Search Console
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Abrem na propriedade {SITE.replace("https://", "")}.
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            {[
              {
                label: "Visão geral",
                href: `https://search.google.com/search-console?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
              {
                label: "Inspeção de URL",
                href: `https://search.google.com/search-console/inspect?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
              {
                label: "Cobertura / Páginas",
                href: `https://search.google.com/search-console/index?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
              {
                label: "Sitemaps",
                href: `https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
              {
                label: "Remoções (limpar cache antigo)",
                href: `https://search.google.com/search-console/removals?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
              {
                label: "Performance (cliques & impressões)",
                href: `https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Ayesexperiencesportugal.com`,
              },
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-[color:var(--sand)] bg-white px-4 py-3 hover:border-[color:var(--gold)]"
                >
                  <span className="text-[color:var(--charcoal)]">{l.label}</span>
                  <span className="text-xs text-[color:var(--gold)]">abrir →</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <SearchPerformancePanel />
        <ConversionPanel />
        <RetiredUrlPanel />
        <IndexationPanel />
        <CriticalSeoPanel />

        <section className="mt-10 rounded-lg border border-[color:var(--sand)] bg-white p-5 text-sm text-[color:var(--charcoal-soft)]">
          <h3 className="text-base font-semibold text-[color:var(--charcoal)]">
            Checklist de recrawl
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Confirmar que sitemap.xml e robots.txt retornam HTTP 200 acima.</li>
            <li>Resolver erros críticos do painel "Erros críticos de SEO".</li>
            <li>
              Em <strong>Inspeção de URL</strong>, pedir indexação das páginas com problemas.
            </li>
            <li>Repetir verificação após 24–72h.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function IndexationPanel() {
  const inspect = useServerFn(inspectGscUrls);
  const [rows, setRows] = useState<UrlInspectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();
  const [lastAt, setLastAt] = useState<string>("");

  async function run() {
    setLoading(true);
    setErr(undefined);
    try {
      const r = await inspect({ data: { urls: KEY_URLS } });
      setRows(r.results);
      setLastAt(new Date().toLocaleString("pt-PT"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent("seo-monitor:gsc-done"));
    }
  }

  useEffect(() => {
    const handler = () => run();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
          Estado de indexação (Google)
        </h2>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)] disabled:opacity-50"
        >
          {loading ? "A consultar…" : "Consultar GSC"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
        Inspeção live da API do Search Console para as páginas-chave.
        {lastAt ? (
          <>
            {" "}
            · Atualizado <span className="font-medium">{lastAt}</span>
          </>
        ) : null}
      </p>

      {err ? <p className="mt-3 text-xs text-rose-600">{err}</p> : null}
      <div className="mt-4 space-y-2">
        {rows.length === 0 && !loading ? (
          <p className="text-xs text-[color:var(--charcoal-soft)]">
            Clica em "Consultar GSC" para carregar.
          </p>
        ) : null}
        {rows.map((r) => {
          const indexed = r.verdict === "PASS";
          const dot = !r.ok ? "bg-rose-500" : indexed ? "bg-emerald-500" : "bg-amber-500";
          return (
            <div
              key={r.url}
              className="rounded-lg border border-[color:var(--sand)] bg-white p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 inline-block h-2 w-2 rounded-full ${dot}`} />
                  <div>
                    <p className="font-medium text-[color:var(--charcoal)] break-all">
                      {r.url.replace("https://yesexperiencesportugal.com", "") || "/"}
                    </p>
                    {r.error ? (
                      <p className="mt-1 text-xs text-rose-600">{r.error}</p>
                    ) : (
                      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                        {r.verdict ?? "—"} · {r.coverageState ?? "—"}
                        {r.lastCrawlTime
                          ? ` · crawl ${new Date(r.lastCrawlTime).toLocaleDateString("pt-PT")}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CriticalSeoPanel() {
  const audit = useServerFn(auditSeoUrls);
  const [rows, setRows] = useState<SeoAuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAt, setLastAt] = useState<string>("");

  async function run() {
    setLoading(true);
    try {
      const r = await audit({ data: { urls: KEY_URLS } });
      setRows(r.results);
      setLastAt(new Date().toLocaleString("pt-PT"));
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent("seo-monitor:audit-done"));
    }
  }

  useEffect(() => {
    run();
    const handler = () => run();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCritical = rows.reduce(
    (s, r) => s + r.issues.filter((i) => i.level === "critical").length,
    0,
  );
  const totalWarn = rows.reduce((s, r) => s + r.issues.filter((i) => i.level === "warn").length, 0);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
          Erros críticos de SEO
        </h2>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full border border-[color:var(--teal)] px-4 py-2 text-xs font-medium text-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-white disabled:opacity-50"
        >
          {loading ? "A analisar…" : "Re-analisar"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
        Audita title, description, canonical, H1, JSON-LD, og:* e robots em tempo real.
        {lastAt ? (
          <>
            {" "}
            · Atualizado <span className="font-medium">{lastAt}</span>
          </>
        ) : null}
      </p>

      <p className="mt-2 text-xs">
        <span className="text-rose-600">{totalCritical} críticos</span>
        <span className="mx-2 text-[color:var(--charcoal-soft)]">·</span>
        <span className="text-amber-600">{totalWarn} avisos</span>
      </p>
      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const critical = r.issues.filter((i) => i.level === "critical");
          const warn = r.issues.filter((i) => i.level === "warn");
          const dot =
            critical.length > 0
              ? "bg-rose-500"
              : warn.length > 0
                ? "bg-amber-500"
                : "bg-emerald-500";
          return (
            <details
              key={r.url}
              className="rounded-lg border border-[color:var(--sand)] bg-white p-4 text-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                  <span className="font-medium text-[color:var(--charcoal)] break-all">
                    {r.url.replace("https://yesexperiencesportugal.com", "") || "/"}
                  </span>
                </div>
                <span className="text-xs text-[color:var(--charcoal-soft)]">
                  {critical.length}C · {warn.length}W
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-xs text-[color:var(--charcoal-soft)]">
                <p>
                  <strong>HTTP:</strong> {r.status ?? "—"} · <strong>H1:</strong> {r.h1Count ?? 0} ·{" "}
                  <strong>JSON-LD:</strong> {r.jsonLdBlocks ?? 0}
                </p>
                <p>
                  <strong>Title</strong> ({r.titleLength ?? 0}): {r.title ?? "—"}
                </p>
                <p>
                  <strong>Description</strong> ({r.descriptionLength ?? 0}): {r.description ?? "—"}
                </p>
                <p className="break-all">
                  <strong>Canonical:</strong> {r.canonical ?? "—"}
                </p>
                {r.issues.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {r.issues.map((i, idx) => (
                      <li
                        key={idx}
                        className={i.level === "critical" ? "text-rose-600" : "text-amber-600"}
                      >
                        • {i.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-600">✓ Sem problemas detetados</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function Delta({ now, before, lowerIsBetter = false }: { now: number; before?: number; lowerIsBetter?: boolean }) {
  if (before == null) return <span className="text-[color:var(--charcoal-soft)]">novo</span>;
  const diff = now - before;
  if (Math.abs(diff) < 0.05) return <span className="text-[color:var(--charcoal-soft)]">=</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const shown = Math.abs(diff) >= 10 ? Math.round(Math.abs(diff)) : Math.abs(diff).toFixed(1);
  return (
    <span className={good ? "text-emerald-600" : "text-rose-600"}>
      {diff > 0 ? "+" : "−"}
      {shown}
    </span>
  );
}

function SearchRows({ rows, label }: { rows: SearchPerformance["pages"]; label: string }) {
  if (rows.length === 0) {
    return <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">Sem dados de {label}.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="text-[color:var(--charcoal-soft)]">
          <tr>
            <th className="py-2 pr-3 font-medium">{label}</th>
            <th className="py-2 pr-3 font-medium">Cliques</th>
            <th className="py-2 pr-3 font-medium">Impressões</th>
            <th className="py-2 pr-3 font-medium">Posição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[color:var(--sand)]">
              <td className="py-2 pr-3 break-all text-[color:var(--charcoal)]">
                {r.key.replace(SITE, "") || "/"}
              </td>
              <td className="py-2 pr-3">
                {r.clicks} <Delta now={r.clicks} before={r.prevClicks} />
              </td>
              <td className="py-2 pr-3">
                {r.impressions} <Delta now={r.impressions} before={r.prevImpressions} />
              </td>
              <td className="py-2 pr-3">
                {r.position.toFixed(1)}{" "}
                <Delta now={r.position} before={r.prevPosition} lowerIsBetter />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchPerformancePanel() {
  const run = useServerFn(getSearchPerformance);
  const [data, setData] = useState<SearchPerformance>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();

  async function load() {
    setLoading(true);
    setErr(undefined);
    try {
      setData(await run({ data: { days: 28, rowLimit: 25 } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
          Performance de pesquisa (28 dias)
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)] disabled:opacity-50"
        >
          {loading ? "A carregar…" : "Carregar"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
        Cliques, impressões e posição média por página e por pesquisa, comparados com os 28 dias
        anteriores.
        {data ? ` · ${data.current.startDate} → ${data.current.endDate} vs ${data.previous.startDate} → ${data.previous.endDate}` : ""}
      </p>
      {err || data?.error ? (
        <p className="mt-3 text-xs text-rose-600">{err ?? data?.error}</p>
      ) : null}
      {data && !data.error ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Cliques", now: data.totals.clicks, before: data.totals.prevClicks, lower: false },
              {
                label: "Impressões",
                now: data.totals.impressions,
                before: data.totals.prevImpressions,
                lower: false,
              },
              {
                label: "Posição média",
                now: Number(data.totals.position.toFixed(1)),
                before: Number(data.totals.prevPosition.toFixed(1)),
                lower: true,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--gold)]">
                  {k.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--charcoal)]">{k.now}</p>
                <p className="text-xs">
                  <Delta now={k.now} before={k.before} lowerIsBetter={k.lower} />
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-[color:var(--sand)] bg-white p-4">
            <SearchRows rows={data.pages} label="Página" />
          </div>
          <div className="mt-4 rounded-lg border border-[color:var(--sand)] bg-white p-4">
            <SearchRows rows={data.queries} label="Pesquisa" />
          </div>
        </>
      ) : null}
    </section>
  );
}

function ConversionPanel() {
  const run = useServerFn(getBookingConversions);
  const [rows, setRows] = useState<BookingConversionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();

  async function load() {
    setLoading(true);
    setErr(undefined);
    try {
      const r = await run({ data: { days: 28 } });
      setRows(r.rows);
      if (r.error) setErr(r.error);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
          Reservas por experiência (28 dias)
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-[color:var(--teal)] px-4 py-2 text-xs font-medium text-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-white disabled:opacity-50"
        >
          {loading ? "A carregar…" : "Carregar"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
        Quantas pessoas iniciaram, chegaram aos dados do hóspede e pagaram, por experiência.
      </p>
      {err ? <p className="mt-3 text-xs text-rose-600">{err}</p> : null}
      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[color:var(--sand)] bg-white p-4">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="text-[color:var(--charcoal-soft)]">
              <tr>
                <th className="py-2 pr-3 font-medium">Experiência</th>
                <th className="py-2 pr-3 font-medium">Iniciadas</th>
                <th className="py-2 pr-3 font-medium">Dados do hóspede</th>
                <th className="py-2 pr-3 font-medium">Pagas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tourId} className="border-t border-[color:var(--sand)]">
                  <td className="py-2 pr-3 break-all text-[color:var(--charcoal)]">{r.tourId}</td>
                  <td className="py-2 pr-3">{r.started}</td>
                  <td className="py-2 pr-3">{r.reachedDetails}</td>
                  <td className="py-2 pr-3 font-medium text-[color:var(--charcoal)]">{r.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function RetiredUrlPanel() {
  const run = useServerFn(getRetiredUrlRedirects);
  const [rows, setRows] = useState<RetiredUrlRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();

  async function load() {
    setLoading(true);
    setErr(undefined);
    try {
      const r = await run();
      setRows(r.rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failing = rows.filter((r) => !r.permanent || !r.correctTarget).length;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
          Redirecionamentos das páginas retiradas
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-[color:var(--teal)] px-4 py-2 text-xs font-medium text-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-white disabled:opacity-50"
        >
          {loading ? "A verificar…" : "Verificar"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
        Cada guia de vinho retirado deve responder com redirecionamento permanente para o guia que
        ficou.
        {rows.length > 0 ? ` · ${rows.length - failing}/${rows.length} corretos` : ""}
      </p>
      {err ? <p className="mt-3 text-xs text-rose-600">{err}</p> : null}
      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const ok = r.permanent && r.correctTarget;
          return (
            <div
              key={r.from}
              className="rounded-lg border border-[color:var(--sand)] bg-white p-4 text-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
                />
                <div>
                  <p className="break-all font-medium text-[color:var(--charcoal)]">
                    {r.from.replace(SITE, "")}
                  </p>
                  <p className="mt-1 break-all text-xs text-[color:var(--charcoal-soft)]">
                    {r.error
                      ? r.error
                      : `HTTP ${r.status ?? "—"} → ${(r.location ?? "—").replace(SITE, "")}`}
                    {!ok && !r.error ? ` · esperado ${r.expectedTo.replace(SITE, "")}` : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
