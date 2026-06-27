import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  inspectGscUrls,
  getGscTopPages,
  type UrlInspectionResult,
  type TopPageRow,
} from "@/lib/gscMonitor.functions";

export const Route = createFileRoute("/admin/redirects-monitor")({
  head: () => ({
    meta: [
      { title: "Redirects & 404 Monitor — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RedirectsMonitorPage,
});

const CANONICAL = "https://yesexperiencesportugal.com";

type RedirectCheck = {
  label: string;
  url: string;
  expectStatus: number;
  expectLocationHost?: string;
  note?: string;
};

type RouteCheck = {
  label: string;
  path: string;
  expectStatus: number; // 200 for live, 404 for retired
  note?: string;
};

/**
 * Legacy URLs that must now return 410 Gone (clean break — no redirect).
 * The 301 was removed so Google does NOT associate the deprecated Google
 * Business Profile attached to yesexperiences.pt with the canonical site.
 */
const REDIRECT_CHECKS: RedirectCheck[] = [
  {
    label: "Legacy root — yesexperiences.pt",
    url: "https://yesexperiences.pt/",
    expectStatus: 410,
    note: "Deve devolver 410 Gone (sem redirect). Depende de DNS apontar para Lovable.",
  },
  {
    label: "Legacy www — www.yesexperiences.pt",
    url: "https://www.yesexperiences.pt/",
    expectStatus: 410,
  },
  {
    label: "Legacy deep link — /tours/sintra",
    url: "https://yesexperiences.pt/tours/sintra",
    expectStatus: 410,
  },
];

/**
 * Old GBP / share links that we want to dissociate from the brand.
 * These are NOT under our control to redirect — we monitor them so we
 * can submit them to Google "Remove outdated content" if they keep
 * returning brand content.
 */
const EXTERNAL_LINKS_TO_DISSOCIATE: { label: string; url: string }[] = [
  {
    label: "GBP share link (antigo perfil) — submeter em Remoções",
    url: "https://share.google/GBbQFUyo2B0zJ8jwL",
  },
  {
    label: "GBP share link (antigo) — share.google/9Hdtey43ysRs0FVGh",
    url: "https://share.google/9Hdtey43ysRs0FVGh",
  },
];

/**
 * Old internal routes that should now return 404 (or be redirected
 * elsewhere). Useful when we retire pages but Google still has them
 * cached.
 */
const RETIRED_ROUTES: RouteCheck[] = [
  { label: "/bespoke (renomeado para /proposals)", path: "/bespoke", expectStatus: 404 },
  { label: "/tours/viator-old", path: "/tours/viator-old", expectStatus: 404 },
];

/**
 * Spot-check the canonical pages we expect to be live.
 */
const LIVE_ROUTES: RouteCheck[] = [
  { label: "Homepage", path: "/", expectStatus: 200 },
  { label: "Experiences", path: "/experiences", expectStatus: 200 },
  { label: "Proposals", path: "/proposals", expectStatus: 200 },
  { label: "Contact", path: "/contact", expectStatus: 200 },
  { label: "Local Stories", path: "/local-stories", expectStatus: 200 },
  { label: "sitemap.xml", path: "/sitemap.xml", expectStatus: 200 },
  { label: "robots.txt", path: "/robots.txt", expectStatus: 200 },
];

type ProbeResult = {
  status?: number;
  ok?: boolean;
  redirected?: boolean;
  finalUrl?: string;
  error?: string;
  checking: boolean;
};

async function probeUrl(url: string): Promise<ProbeResult> {
  try {
    // Use no-cors? No — we need status. Most same-origin and CORS-enabled
    // hosts will work; cross-origin without CORS will throw and we report it.
    const res = await fetch(url, { redirect: "follow", cache: "no-store" });
    return {
      status: res.status,
      ok: res.ok,
      redirected: res.redirected,
      finalUrl: res.url,
      checking: false,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      checking: false,
    };
  }
}

function StatusDot({ ok, checking }: { ok?: boolean; checking?: boolean }) {
  const cls = checking
    ? "bg-amber-400"
    : ok
      ? "bg-emerald-500"
      : "bg-rose-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function RedirectsMonitorPage() {
  const [redirectResults, setRedirectResults] = useState<Record<string, ProbeResult>>({});
  const [routeResults, setRouteResults] = useState<Record<string, ProbeResult>>({});
  const [runAt, setRunAt] = useState<string>("");

  // GSC integration
  const inspectFn = useServerFn(inspectGscUrls);
  const topPagesFn = useServerFn(getGscTopPages);
  const [gscInspect, setGscInspect] = useState<UrlInspectionResult[]>([]);
  const [gscTopPages, setGscTopPages] = useState<TopPageRow[]>([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);

  async function runAll() {
    setRunAt(new Date().toLocaleString("pt-PT"));
    const init = (urls: string[]) =>
      Object.fromEntries(urls.map((u) => [u, { checking: true } as ProbeResult]));
    setRedirectResults(init(REDIRECT_CHECKS.map((c) => c.url)));
    setRouteResults(
      init([...LIVE_ROUTES, ...RETIRED_ROUTES].map((r) => `${CANONICAL}${r.path}`)),
    );

    await Promise.all([
      ...REDIRECT_CHECKS.map(async (c) => {
        const r = await probeUrl(c.url);
        setRedirectResults((prev) => ({ ...prev, [c.url]: r }));
      }),
      ...[...LIVE_ROUTES, ...RETIRED_ROUTES].map(async (route) => {
        const url = `${CANONICAL}${route.path}`;
        const r = await probeUrl(url);
        setRouteResults((prev) => ({ ...prev, [url]: r }));
      }),
    ]);
  }

  async function runGsc() {
    setGscLoading(true);
    setGscError(null);
    try {
      // Inspect canonical equivalents of every legacy redirect target, plus
      // every retired route and the canonical live routes. GSC URL Inspection
      // only accepts URLs under the verified property — so we map legacy URLs
      // to the canonical host.
      const inspectUrls = [
        ...REDIRECT_CHECKS.map((c) => {
          try {
            const u = new URL(c.url);
            return `${CANONICAL}${u.pathname}${u.search}`;
          } catch {
            return null;
          }
        }).filter(Boolean) as string[],
        ...RETIRED_ROUTES.map((r) => `${CANONICAL}${r.path}`),
        ...LIVE_ROUTES.filter(
          (r) => !r.path.endsWith(".xml") && !r.path.endsWith(".txt"),
        ).map((r) => `${CANONICAL}${r.path}`),
      ];
      // De-duplicate
      const unique = Array.from(new Set(inspectUrls));
      const [inspect, topPages] = await Promise.all([
        inspectFn({ data: { urls: unique } }),
        topPagesFn({ data: { days: 28, rowLimit: 25 } }),
      ]);
      setGscInspect(inspect.results);
      setGscTopPages(topPages.rows);
      if (topPages.error) setGscError(topPages.error);
    } catch (e) {
      setGscError(e instanceof Error ? e.message : String(e));
    } finally {
      setGscLoading(false);
    }
  }

  useEffect(() => {
    runAll();
  }, []);


  function judgeRedirect(c: RedirectCheck, r: ProbeResult | undefined): boolean | undefined {
    if (!r || r.checking) return undefined;
    if (r.error) return false;
    if (c.expectLocationHost && r.finalUrl) {
      try {
        const host = new URL(r.finalUrl).host;
        return host.includes(c.expectLocationHost);
      } catch {
        return false;
      }
    }
    return r.status === c.expectStatus;
  }

  function judgeRoute(rc: RouteCheck, r: ProbeResult | undefined): boolean | undefined {
    if (!r || r.checking) return undefined;
    if (r.error) return false;
    return r.status === rc.expectStatus;
  }

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] px-5 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-[color:var(--charcoal)] md:text-4xl">
          Redirects &amp;{" "}
          <span className="font-serif italic font-normal text-[color:var(--teal)]">
            404 monitor
          </span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
          Vigia URLs antigos (domínio .pt, GBP, rotas retiradas) e confirma que o domínio canónico
          está saudável.
        </p>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-[color:var(--charcoal-soft)]">
            Última verificação: <span className="font-medium">{runAt || "—"}</span>
          </p>
          <button
            onClick={runAll}
            className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)]"
          >
            Voltar a verificar
          </button>
        </div>

        {/* Section 1: Legacy domain redirects */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
            1 · Redirects do domínio antigo
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            yesexperiences.pt deve fazer 301 para {CANONICAL.replace("https://", "")}, preservando
            path e query.
          </p>
          <div className="mt-4 space-y-3">
            {REDIRECT_CHECKS.map((c) => {
              const r = redirectResults[c.url];
              const ok = judgeRedirect(c, r);
              return (
                <div
                  key={c.url}
                  className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <StatusDot ok={ok} checking={r?.checking} />
                      <div>
                        <p className="text-sm font-medium text-[color:var(--charcoal)]">
                          {c.label}
                        </p>
                        <p className="break-all text-xs text-[color:var(--charcoal-soft)]">
                          {c.url}
                        </p>
                        {c.note ? (
                          <p className="mt-1 text-[11px] italic text-[color:var(--charcoal-soft)]">
                            {c.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-[color:var(--charcoal-soft)]">
                      {r?.checking ? (
                        "a verificar…"
                      ) : r?.error ? (
                        <span className="text-rose-600">erro de rede</span>
                      ) : (
                        <>
                          <div>HTTP {r?.status}</div>
                          {r?.finalUrl ? (
                            <div className="max-w-[180px] truncate">→ {new URL(r.finalUrl).host}</div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Retired routes (should 404) */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
            2 · Rotas retiradas (devem dar 404)
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Páginas antigas que já não existem — se aparecerem no Google, submete em Remoções.
          </p>
          <div className="mt-4 space-y-3">
            {RETIRED_ROUTES.map((rc) => {
              const url = `${CANONICAL}${rc.path}`;
              const r = routeResults[url];
              const ok = judgeRoute(rc, r);
              return (
                <div
                  key={rc.path}
                  className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusDot ok={ok} checking={r?.checking} />
                      <div>
                        <p className="text-sm font-medium text-[color:var(--charcoal)]">{rc.label}</p>
                        <p className="text-xs text-[color:var(--charcoal-soft)]">{rc.path}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[color:var(--charcoal-soft)]">
                      {r?.checking ? "a verificar…" : `HTTP ${r?.status ?? "—"}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Live canonical routes */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
            3 · Rotas canónicas (devem dar 200)
          </h2>
          <div className="mt-4 space-y-3">
            {LIVE_ROUTES.map((rc) => {
              const url = `${CANONICAL}${rc.path}`;
              const r = routeResults[url];
              const ok = judgeRoute(rc, r);
              return (
                <div
                  key={rc.path}
                  className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusDot ok={ok} checking={r?.checking} />
                      <div>
                        <p className="text-sm font-medium text-[color:var(--charcoal)]">
                          {rc.label}
                        </p>
                        <p className="text-xs text-[color:var(--charcoal-soft)]">{rc.path}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[color:var(--charcoal-soft)]">
                      {r?.checking ? "a verificar…" : `HTTP ${r?.status ?? "—"}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: External links to dissociate */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
            4 · Links externos a dissociar (GBP antigo)
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Não podemos redirecionar estes URLs — eles vivem na Google. Submete cada um em{" "}
            <a
              href="https://search.google.com/search-console/removals?resource_id=sc-domain%3Ayesexperiencesportugal.com"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--teal)] underline"
            >
              Search Console → Remoções → Conteúdo desatualizado
            </a>
            .
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {EXTERNAL_LINKS_TO_DISSOCIATE.map((l) => (
              <li
                key={l.url}
                className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
              >
                <p className="font-medium text-[color:var(--charcoal)]">{l.label}</p>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="break-all text-xs text-[color:var(--teal)] underline"
                >
                  {l.url}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 4.5: GSC correlation (Cobertura via URL Inspection) */}
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">
              4.5 · Google Search Console — cobertura por URL
            </h2>
            <button
              onClick={runGsc}
              disabled={gscLoading}
              className="rounded-full bg-[color:var(--gold)] px-4 py-2 text-xs font-medium text-[color:var(--charcoal)] disabled:opacity-60"
            >
              {gscLoading ? "a consultar…" : gscInspect.length ? "Voltar a puxar" : "Puxar dados GSC"}
            </button>
          </div>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Inspeção de URL via GSC para cada rota antiga/canónica, correlacionada com o estado HTTP
            local. (Cobertura e Remoções não têm endpoint de listagem — usamos URL Inspection +
            Search Analytics.)
          </p>
          {gscError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {gscError}
            </p>
          ) : null}

          {gscInspect.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-[color:var(--sand)] bg-white">
              <table className="w-full text-xs">
                <thead className="bg-[color:var(--ivory)] text-left text-[color:var(--charcoal-soft)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium">GSC veredicto</th>
                    <th className="px-3 py-2 font-medium">Cobertura</th>
                    <th className="px-3 py-2 font-medium">Último crawl</th>
                    <th className="px-3 py-2 font-medium">HTTP local</th>
                    <th className="px-3 py-2 font-medium">Correlação</th>
                  </tr>
                </thead>
                <tbody>
                  {gscInspect.map((row) => {
                    const localProbe =
                      routeResults[row.url] ??
                      Object.values(redirectResults).find((p) => p.finalUrl === row.url);
                    const localStatus = localProbe?.status;
                    // Heuristic correlation
                    let corr = "—";
                    let corrClass = "text-[color:var(--charcoal-soft)]";
                    if (row.coverageState && localStatus) {
                      const cov = row.coverageState.toLowerCase();
                      if (localStatus === 404 && cov.includes("not found")) {
                        corr = "✓ alinhado (404)";
                        corrClass = "text-emerald-700";
                      } else if (localStatus === 200 && cov.includes("submitted and indexed")) {
                        corr = "✓ indexado";
                        corrClass = "text-emerald-700";
                      } else if (localStatus === 200 && cov.includes("not found")) {
                        corr = "⚠ Google ainda 404, página está live — pedir indexação";
                        corrClass = "text-amber-700";
                      } else if (localStatus === 404 && cov.includes("indexed")) {
                        corr = "⚠ Google ainda indexa, página retirada — submeter Remoção";
                        corrClass = "text-rose-700";
                      } else {
                        corr = "↻ a propagar";
                        corrClass = "text-amber-700";
                      }
                    }
                    return (
                      <tr key={row.url} className="border-t border-[color:var(--sand)]">
                        <td className="px-3 py-2">
                          <span className="break-all text-[color:var(--charcoal)]">
                            {row.url.replace(CANONICAL, "") || "/"}
                          </span>
                        </td>
                        <td className="px-3 py-2">{row.verdict ?? (row.error ? "erro" : "—")}</td>
                        <td className="px-3 py-2">{row.coverageState ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row.lastCrawlTime
                            ? new Date(row.lastCrawlTime).toLocaleDateString("pt-PT")
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{localStatus ?? "—"}</td>
                        <td className={`px-3 py-2 font-medium ${corrClass}`}>{corr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : !gscLoading ? (
            <p className="mt-4 text-xs italic text-[color:var(--charcoal-soft)]">
              Carrega "Puxar dados GSC" para consultar o estado de cobertura de cada URL.
            </p>
          ) : null}

          {gscTopPages.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[color:var(--charcoal)]">
                Top páginas em impressões (últimos 28 dias)
              </h3>
              <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                Se aparecerem aqui URLs antigos ou de marca incorreta, são candidatos a Remoção.
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--sand)] bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--ivory)] text-left text-[color:var(--charcoal-soft)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Página</th>
                      <th className="px-3 py-2 font-medium text-right">Impressões</th>
                      <th className="px-3 py-2 font-medium text-right">Cliques</th>
                      <th className="px-3 py-2 font-medium text-right">Posição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscTopPages.map((row) => {
                      const isLegacy = !row.page.startsWith(CANONICAL);
                      return (
                        <tr
                          key={row.page}
                          className={`border-t border-[color:var(--sand)] ${
                            isLegacy ? "bg-rose-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2 break-all">
                            {row.page.replace(CANONICAL, "") || "/"}
                            {isLegacy ? (
                              <span className="ml-2 rounded-sm bg-rose-200 px-1 text-[10px] text-rose-800">
                                fora do domínio
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">{row.impressions}</td>
                          <td className="px-3 py-2 text-right">{row.clicks}</td>
                          <td className="px-3 py-2 text-right">{row.position.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        {/* Section 5: GSC shortcuts */}

        <section className="mt-10 rounded-lg border border-[color:var(--sand)] bg-white p-5 text-sm">
          <h3 className="text-base font-semibold text-[color:var(--charcoal)]">
            Próximos passos no Google Search Console
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[color:var(--charcoal-soft)]">
            <li>
              Cobertura — filtra por "Not found (404)" para ver URLs antigos que o Google ainda
              tenta. Submete os relevantes em Remoções.
            </li>
            <li>
              Remoções → Conteúdo desatualizado — cola URLs do GBP antigo e rotas retiradas
              listadas acima.
            </li>
            <li>
              Inspeção de URL — para cada rota canónica importante, "Pedir indexação" se o estado
              ainda for desatualizado.
            </li>
            <li>
              Repete esta verificação aqui depois de cada submissão para confirmar 301/404 corretos.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              className="rounded-full border border-[color:var(--gold)] px-3 py-1 text-[color:var(--charcoal)] hover:bg-[color:var(--ivory)]"
              href="https://search.google.com/search-console/index?resource_id=sc-domain%3Ayesexperiencesportugal.com"
              target="_blank"
              rel="noreferrer"
            >
              Cobertura
            </a>
            <a
              className="rounded-full border border-[color:var(--gold)] px-3 py-1 text-[color:var(--charcoal)] hover:bg-[color:var(--ivory)]"
              href="https://search.google.com/search-console/removals?resource_id=sc-domain%3Ayesexperiencesportugal.com"
              target="_blank"
              rel="noreferrer"
            >
              Remoções
            </a>
            <a
              className="rounded-full border border-[color:var(--gold)] px-3 py-1 text-[color:var(--charcoal)] hover:bg-[color:var(--ivory)]"
              href="https://search.google.com/search-console/inspect?resource_id=sc-domain%3Ayesexperiencesportugal.com"
              target="_blank"
              rel="noreferrer"
            >
              Inspeção de URL
            </a>
            <a
              className="rounded-full border border-[color:var(--gold)] px-3 py-1 text-[color:var(--charcoal)] hover:bg-[color:var(--ivory)]"
              href="/admin/seo-monitor"
            >
              SEO Monitor
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
