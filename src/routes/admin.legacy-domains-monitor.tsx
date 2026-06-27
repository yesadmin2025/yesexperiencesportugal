import { createFileRoute, useServerFn } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  probeLegacyDomains,
  type LegacyHostReport,
} from "@/lib/legacy-domains-monitor.functions";

export const Route = createFileRoute("/admin/legacy-domains-monitor")({
  head: () => ({
    meta: [
      { title: "Legacy Domains Monitor — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LegacyDomainsMonitorPage,
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
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function toneFor(report: LegacyHostReport): "ok" | "warn" | "bad" {
  if (report.compliant410) return "ok";
  if (!report.http.some((p) => typeof p.status === "number")) return "bad";
  return "warn";
}

function HostCard({ r }: { r: LegacyHostReport }) {
  const tone = toneFor(r);
  return (
    <article className="rounded-lg border border-[color:var(--sand)] bg-white p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusDot tone={tone} />
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--charcoal)]">{r.host}</h2>
            <p className="mt-0.5 text-xs text-[color:var(--charcoal-soft)]">{r.verdict}</p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
          {new Date(r.checkedAt).toLocaleTimeString("pt-PT")}
        </span>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            DNS (DoH · Cloudflare)
          </h3>
          <dl className="mt-2 space-y-1 text-xs text-[color:var(--charcoal)]">
            <DnsRow label="A" rows={r.dns.a} />
            <DnsRow label="AAAA" rows={r.dns.aaaa} />
            <DnsRow label="CNAME" rows={r.dns.cname} />
            <DnsRow label="NS" rows={r.dns.ns} />
            {r.dns.error ? (
              <div className="text-rose-600">DNS erro: {r.dns.error}</div>
            ) : null}
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            HTTP
          </h3>
          <ul className="mt-2 space-y-2 text-xs">
            {r.http.map((p) => {
              const is410 = p.status === 410;
              const hasLoc = !!p.location;
              const probeTone: "ok" | "warn" | "bad" = p.error
                ? "bad"
                : is410 && !hasLoc
                  ? "ok"
                  : "warn";
              return (
                <li
                  key={p.scheme}
                  className="rounded border border-[color:var(--sand)] bg-[color:var(--ivory)]/40 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-[color:var(--charcoal)]">
                      <StatusDot tone={probeTone} />
                      {p.scheme.toUpperCase()}
                    </span>
                    <span className="text-[color:var(--charcoal-soft)]">
                      {p.error ? "erro" : `HTTP ${p.status} · ${p.elapsedMs}ms`}
                    </span>
                  </div>
                  {p.error ? (
                    <p className="mt-1 text-rose-600">{p.error}</p>
                  ) : (
                    <dl className="mt-1 space-y-0.5 text-[11px] text-[color:var(--charcoal-soft)]">
                      {p.location ? (
                        <div>
                          <span className="font-medium">Location:</span> {p.location}
                        </div>
                      ) : null}
                      {p.xRobotsTag ? (
                        <div>
                          <span className="font-medium">X-Robots-Tag:</span> {p.xRobotsTag}
                        </div>
                      ) : null}
                      {p.server ? (
                        <div>
                          <span className="font-medium">Server:</span> {p.server}
                        </div>
                      ) : null}
                      {p.contentType ? (
                        <div>
                          <span className="font-medium">Content-Type:</span> {p.contentType}
                        </div>
                      ) : null}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer className="mt-5 rounded border border-dashed border-[color:var(--sand)] bg-[color:var(--ivory)]/60 p-3 text-[11px] text-[color:var(--charcoal-soft)]">
        <strong className="text-[color:var(--charcoal)]">Conformidade 410 Gone:</strong>{" "}
        {r.compliant410 ? (
          <span className="text-emerald-700">conforme (status 410 sem Location)</span>
        ) : (
          <span className="text-amber-700">
            não conforme — esperado HTTP 410 sem cabeçalho Location. Atualizar DNS de{" "}
            <code>{r.host}</code> para apontar para os servidores do site atual.
          </span>
        )}
      </footer>
    </article>
  );
}

function DnsRow({ label, rows }: { label: string; rows: { data: string; TTL?: number }[] }) {
  if (rows.length === 0)
    return (
      <div className="flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-[color:var(--charcoal-soft)]">—</span>
      </div>
    );
  return (
    <div className="flex justify-between gap-3">
      <span className="font-medium">{label}</span>
      <span className="text-right">
        {rows.map((r, i) => (
          <span key={i} className="block break-all">
            {r.data}
            {r.TTL ? (
              <span className="ml-1 text-[10px] text-[color:var(--charcoal-soft)]">
                TTL {r.TTL}s
              </span>
            ) : null}
          </span>
        ))}
      </span>
    </div>
  );
}

function LegacyDomainsMonitorPage() {
  const probe = useServerFn(probeLegacyDomains);
  const { data, isFetching, refetch, error, dataUpdatedAt } = useQuery({
    queryKey: ["legacy-domains-monitor"],
    queryFn: () => probe(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] px-5 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-[color:var(--charcoal)] md:text-4xl">
          Legacy domains{" "}
          <span className="font-serif italic font-normal text-[color:var(--teal)]">monitor</span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
          Estado em tempo real de cada domínio legacy: resolução DNS (DoH Cloudflare), resposta
          HTTP em <code>http://</code> e <code>https://</code>, e conformidade com{" "}
          <strong>410 Gone</strong>. Atualiza a cada 60s.
        </p>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-[color:var(--charcoal-soft)]">
            Última verificação:{" "}
            <span className="font-medium">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString("pt-PT") : "—"}
            </span>
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full bg-[color:var(--teal)] px-4 py-2 text-xs font-medium text-white hover:bg-[color:var(--teal-2)] disabled:opacity-60"
          >
            {isFetching ? "a verificar…" : "Voltar a verificar"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            Erro ao puxar dados: {error instanceof Error ? error.message : String(error)}
          </p>
        ) : null}

        <section className="mt-6 space-y-4">
          {!data && isFetching ? (
            <p className="text-sm text-[color:var(--charcoal-soft)]">A sondar domínios…</p>
          ) : null}
          {data?.map((r) => <HostCard key={r.host} r={r} />)}
        </section>

        <section className="mt-10 rounded-lg border border-[color:var(--sand)] bg-white p-5 text-sm text-[color:var(--charcoal-soft)]">
          <h3 className="text-base font-semibold text-[color:var(--charcoal)]">Como ler</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Verde:</strong> o host responde com HTTP 410 e sem cabeçalho{" "}
              <code>Location</code> — Google vai despromover.
            </li>
            <li>
              <strong>Amarelo:</strong> responde mas não com 410 (pode estar a servir 200/302 do
              servidor antigo) — atualizar DNS para apontar para o site atual.
            </li>
            <li>
              <strong>Vermelho:</strong> sem resposta HTTP — DNS provavelmente não resolve ou o
              host está offline.
            </li>
            <li>
              O servidor 410 está pronto em <code>src/lib/legacy-domain-redirect.ts</code>; só
              entra em vigor quando o DNS do domínio legacy aponta para os servidores deste site.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
