import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { inspectGscUrls, type UrlInspectionResult } from "@/lib/gscMonitor.functions";
import { auditSeoUrls, type SeoAuditResult } from "@/lib/seoAudit.functions";

const KEY_URLS = [
  "https://yesexperiencesportugal.com/",
  "https://yesexperiencesportugal.com/experiences",
  "https://yesexperiencesportugal.com/studio-v3",
  "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
  "https://yesexperiencesportugal.com/day-trips-from-lisbon",
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
          SEO <span className="font-serif italic font-normal text-[color:var(--teal)]">monitor</span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
          Estado dos ficheiros de indexação e atalhos para o Google Search Console.
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

        <section className="mt-6 space-y-3">
          {CHECKS.map((c) => {
            const s = checks[c.url];
            const ok = s?.ok;
            const dot = s?.checking
              ? "bg-amber-400"
              : ok
                ? "bg-emerald-500"
                : "bg-rose-500";
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

        <section className="mt-10 rounded-lg border border-[color:var(--sand)] bg-white p-5 text-sm text-[color:var(--charcoal-soft)]">
          <h3 className="text-base font-semibold text-[color:var(--charcoal)]">
            Checklist de recrawl
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Confirmar que sitemap.xml e robots.txt retornam HTTP 200 acima.</li>
            <li>
              Em <strong>Sitemaps</strong>, submeter{" "}
              <code className="rounded bg-[color:var(--ivory)] px-1">/sitemap.xml</code> se ainda
              não estiver listado.
            </li>
            <li>
              Em <strong>Inspeção de URL</strong>, colar uma página chave e clicar
              "Pedir indexação".
            </li>
            <li>
              Em <strong>Remoções → Conteúdo desatualizado</strong>, submeter URLs antigos a
              limpar do cache.
            </li>
            <li>Repetir verificação aqui após 24–72h para confirmar lastmod refletido.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
