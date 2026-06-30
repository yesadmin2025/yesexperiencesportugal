import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { probeDomainHealth, type DomainHealth, type PathProbe } from "@/lib/domain-health.functions";

const AUTO_REFRESH_OPTIONS = [
  { label: "Off", ms: 0 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 5 * 60_000 },
] as const;

export const Route = createFileRoute("/admin/domains-health")({
  head: () => ({
    meta: [
      { title: "Domain Health — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DomainsHealthPage,
});

function StatusDot({ tone }: { tone: "ok" | "warn" | "bad" | "idle" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-400"
        : tone === "bad"
          ? "bg-rose-500"
          : "bg-stone-300";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

function ConnectBadge({ status }: { status: DomainHealth["connectStatus"] }) {
  const map = {
    active: { label: "ACTIVE", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    verifying: { label: "VERIFYING", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    offline: { label: "OFFLINE", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${cls}`}
    >
      {label}
    </span>
  );
}

function pathTone(p: PathProbe, role: DomainHealth["role"]): "ok" | "warn" | "bad" {
  if (typeof p.status !== "number") return "bad";
  if (role === "legacy") {
    if (p.status === 410 && !p.location) return "ok";
    return "warn";
  }
  if (p.status === 200 && !p.noindex) return "ok";
  if (p.status >= 500 || typeof p.status !== "number") return "bad";
  // 200 + noindex (other than robots.txt) is a warn; redirects on canonical are warn
  if (p.noindex && p.path !== "/robots.txt") return "warn";
  if (p.status >= 300 && p.status < 400) return "warn";
  return "ok";
}

function PathRow({ p, role }: { p: PathProbe; role: DomainHealth["role"] }) {
  const tone = pathTone(p, role);
  const noindexSrc = p.xRobotsTag?.toLowerCase().includes("noindex")
    ? "x-robots-tag"
    : p.metaRobots?.toLowerCase().includes("noindex")
      ? "meta robots"
      : null;
  return (
    <tr className="border-t border-[color:var(--sand)] text-xs">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <StatusDot tone={tone} />
          <code className="text-[color:var(--charcoal)]">{p.path}</code>
        </div>
      </td>
      <td className="py-2 pr-3 font-mono">
        {p.error ? <span className="text-rose-700">ERR</span> : (p.status ?? "—")}
      </td>
      <td className="py-2 pr-3">
        {role === "legacy" ? (
          p.status === 410 && !p.location ? (
            <span className="text-emerald-700">410 Gone ✓</span>
          ) : p.location ? (
            <span className="text-amber-700">→ {p.location.slice(0, 40)}</span>
          ) : (
            <span className="text-[color:var(--charcoal-soft)]">—</span>
          )
        ) : p.noindex ? (
          <span className="text-amber-700">noindex ({noindexSrc})</span>
        ) : p.status === 200 ? (
          <span className="text-emerald-700">indexável</span>
        ) : (
          <span className="text-[color:var(--charcoal-soft)]">—</span>
        )}
      </td>
      <td className="py-2 pr-3 text-[color:var(--charcoal-soft)]">{p.elapsedMs ?? "—"}ms</td>
    </tr>
  );
}

function HostCard({ r }: { r: DomainHealth }) {
  const overallTone: "ok" | "warn" | "bad" =
    r.healthPct === 100 ? "ok" : r.connectStatus === "offline" ? "bad" : "warn";

  return (
    <article className="rounded-lg border border-[color:var(--sand)] bg-white p-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <StatusDot tone={overallTone} />
          <div>
            <h2 className="text-base font-semibold text-[color:var(--charcoal)]">{r.host}</h2>
            <p className="mt-0.5 text-xs text-[color:var(--charcoal-soft)]">{r.verdict}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${
              r.role === "canonical"
                ? "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/5 text-[color:var(--teal)]"
                : "border-stone-300 bg-stone-50 text-stone-600"
            }`}
          >
            {r.role}
          </span>
          <ConnectBadge status={r.connectStatus} />
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-[color:var(--sand)] bg-[color:var(--ivory)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            DNS A
          </div>
          <div className="mt-1 font-mono text-[color:var(--charcoal)]">
            {r.dns.a.length ? r.dns.a.join(", ") : "—"}
          </div>
          <div className="mt-1 text-[10px] text-[color:var(--charcoal-soft)]">
            {r.dns.dnsOk ? "→ aponta para o projeto" : "não aponta para 185.158.133.1"}
          </div>
        </div>
        <div className="rounded border border-[color:var(--sand)] bg-[color:var(--ivory)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {r.role === "legacy" ? "410 compliance" : "Indexable"}
          </div>
          <div className="mt-1 text-2xl font-light text-[color:var(--charcoal)]">{r.healthPct}%</div>
        </div>
        <div className="rounded border border-[color:var(--sand)] bg-[color:var(--ivory)] p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Caminhos
          </div>
          <div className="mt-1 text-2xl font-light text-[color:var(--charcoal)]">
            {r.paths.length}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              <th className="pb-2 pr-3 font-medium">Path</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">
                {r.role === "legacy" ? "Redirect / 410" : "Index signal"}
              </th>
              <th className="pb-2 pr-3 font-medium">Latência</th>
            </tr>
          </thead>
          <tbody>
            {r.paths.map((p) => (
              <PathRow key={p.path} p={p} role={r.role} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function DomainsHealthPage() {
  const fetcher = useServerFn(probeDomainHealth);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["domain-health"],
    queryFn: () => fetcher(),
    refetchOnWindowFocus: false,
  });

  const canonical = data?.hosts.filter((h) => h.role === "canonical") ?? [];
  const legacy = data?.hosts.filter((h) => h.role === "legacy") ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Admin · Infraestrutura
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--charcoal)] md:text-3xl">
          Domain Health
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal-soft)]">
          Estado de cada domínio (active / verifying / offline) e saúde de noindex e 410 por caminho.
          Canónicos devem servir 200 indexável; legacy devem servir 410 Gone sem Location.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded border border-[color:var(--charcoal)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--charcoal)] transition hover:bg-[color:var(--charcoal)] hover:text-white disabled:opacity-50"
          >
            {isFetching ? "A verificar…" : "Re-verificar"}
          </button>
          {data?.checkedAt && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              Última verificação: {new Date(data.checkedAt).toLocaleString("pt-PT")}
            </span>
          )}
          <Link
            to="/admin/legacy-domains-monitor"
            className="ml-auto text-xs underline text-[color:var(--teal)]"
          >
            Legacy 410 monitor →
          </Link>
          <Link to="/admin/seo-monitor" className="text-xs underline text-[color:var(--teal)]">
            SEO monitor →
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Erro ao sondar domínios: {String(error)}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-[color:var(--charcoal-soft)]">A sondar domínios…</p>
      )}

      {data && (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Canónico · indexável esperado
            </h2>
            <div className="space-y-4">
              {canonical.map((r) => (
                <HostCard key={r.host} r={r} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Legacy · 410 Gone esperado
            </h2>
            <div className="space-y-4">
              {legacy.map((r) => (
                <HostCard key={r.host} r={r} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
