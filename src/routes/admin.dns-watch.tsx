import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  getDnsWatchStatus,
  runDnsWatchNow,
  type DnsWatchStatus,
} from "@/lib/dns-watch.functions";

export const Route = createFileRoute("/admin/dns-watch")({
  head: () => ({
    meta: [
      { title: "DNS Watch — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DnsWatchPage,
});

function StatusDot({ ready }: { ready: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-400"}`}
    />
  );
}

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  ready: { label: "Pronto", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "dns-missing": { label: "DNS em falta", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  "dns-wrong": { label: "DNS errado", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  "http-down": { label: "HTTPS em baixo", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  "http-error": { label: "HTTPS erro", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  "wrong-content": { label: "Conteúdo errado", cls: "bg-amber-100 text-amber-800 border-amber-300" },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const v = VERDICT_LABEL[verdict] ?? { label: verdict, cls: "bg-slate-100 text-slate-800 border-slate-300" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${v.cls}`}>
      {v.label}
    </span>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[color:var(--sand)] py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-400"}`} />
        <span className="font-medium text-[color:var(--charcoal)]">{label}</span>
      </div>
      <span className="text-right font-mono text-[11px] text-[color:var(--charcoal-soft)] break-all">
        {detail}
      </span>
    </div>
  );
}

function DnsWatchPage() {
  const getStatus = useServerFn(getDnsWatchStatus);
  const runNow = useServerFn(runDnsWatchNow);
  const qc = useQueryClient();
  const wasReadyRef = useRef<boolean | null>(null);

  const { data, isLoading, isError, error } = useQuery<DnsWatchStatus>({
    queryKey: ["dns-watch-status"],
    queryFn: () => getStatus(),
    refetchInterval: 60_000, // refresh every 60s while page is open
  });

  const checkNow = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (fresh) => qc.setQueryData(["dns-watch-status"], fresh),
  });

  // Ask for permission once, then fire a browser notification when state
  // transitions from "not ready" -> "all ready" while the tab is open.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const prev = wasReadyRef.current;
    if (prev === false && data.allReady && typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("✅ Domínios prontos no Lovable", {
          body: "Os 4 domínios resolvem para o Lovable e respondem em HTTPS.",
        });
      }
    }
    wasReadyRef.current = data.allReady;
  }, [data]);

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Admin · Monitor
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[color:var(--charcoal)]">
            DNS Watch
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal-soft)]">
            Verificação automática (a cada 15 min) dos registos DNS e da resposta HTTPS dos domínios
            ligados ao Lovable. Recebes uma notificação no browser assim que todos ficarem prontos.
          </p>
        </header>

        {isLoading && (
          <div className="rounded-lg border border-[color:var(--sand)] bg-white p-6 text-sm">
            A carregar estado…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            Erro a obter estado: {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            <section
              className={`mb-6 rounded-lg border p-6 ${
                data.allReady
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                    Estado global
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[color:var(--charcoal)]">
                    {data.allReady ? "✓ Todos os domínios prontos" : "Aguardar propagação"}
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                    {data.hosts.filter((h) => h.ready).length} / {data.hosts.length} prontos
                  </p>
                  {data.readySince && (
                    <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                      Pronto desde {new Date(data.readySince).toLocaleString("pt-PT")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => checkNow.mutate()}
                  disabled={checkNow.isPending}
                  className="rounded-md border border-[color:var(--charcoal)] bg-[color:var(--charcoal)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:opacity-50"
                >
                  {checkNow.isPending ? "A verificar…" : "Verificar agora"}
                </button>
              </div>

              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {data.hosts.map((h) => (
                  <li key={`sum-${h.host}`} className="flex items-center justify-between gap-2 rounded-md border border-white/60 bg-white/60 px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-2">
                      <StatusDot ready={h.ready} />
                      <span className="font-mono text-[11px] text-[color:var(--charcoal)]">{h.host}</span>
                    </span>
                    <VerdictBadge verdict={h.verdict} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="grid gap-3">
              {data.hosts.map((h) => (
                <article
                  key={h.host}
                  className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusDot ready={h.ready} />
                      <h3 className="font-medium text-[color:var(--charcoal)]">{h.host}</h3>
                      <VerdictBadge verdict={h.verdict} />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                      {new Date(h.checkedAt).toLocaleTimeString("pt-PT")}
                    </span>
                  </header>

                  <div className="mt-3">
                    {h.checks.map((c) => (
                      <CheckRow key={c.label} ok={c.ok} label={c.label} detail={c.detail} />
                    ))}
                  </div>

                  {(h.httpLocation || h.httpServer || h.httpContentType) && (
                    <dl className="mt-3 grid gap-1 border-t border-[color:var(--sand)] pt-2 text-[11px] text-[color:var(--charcoal-soft)] sm:grid-cols-3">
                      {h.httpServer && (
                        <div><dt className="opacity-70">Server</dt><dd className="font-mono">{h.httpServer}</dd></div>
                      )}
                      {h.httpContentType && (
                        <div><dt className="opacity-70">Content-Type</dt><dd className="font-mono">{h.httpContentType}</dd></div>
                      )}
                      {h.httpLocation && (
                        <div><dt className="opacity-70">Location</dt><dd className="font-mono break-all">{h.httpLocation}</dd></div>
                      )}
                    </dl>
                  )}

                  <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">{h.notes}</p>
                </article>
              ))}
            </section>


            <section className="mt-10">
              <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
                Histórico recente
              </h2>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--sand)] bg-white">
                <table className="w-full min-w-[640px] text-xs">
                  <thead className="bg-[color:var(--sand)]/40 text-left text-[color:var(--charcoal-soft)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Quando</th>
                      <th className="px-3 py-2 font-medium">Host</th>
                      <th className="px-3 py-2 font-medium">Lovable IP</th>
                      <th className="px-3 py-2 font-medium">HTTPS</th>
                      <th className="px-3 py-2 font-medium">Ready</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((r, i) => (
                      <tr key={i} className="border-t border-[color:var(--sand)]">
                        <td className="px-3 py-2 font-mono">
                          {new Date(r.checked_at).toLocaleString("pt-PT")}
                        </td>
                        <td className="px-3 py-2">{r.host}</td>
                        <td className="px-3 py-2">{r.points_to_lovable ? "✓" : "—"}</td>
                        <td className="px-3 py-2 font-mono">{r.http_status ?? "—"}</td>
                        <td className="px-3 py-2">{r.ready ? "✓" : "—"}</td>
                      </tr>
                    ))}
                    {data.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-[color:var(--charcoal-soft)]">
                          Ainda sem registos — o cron corre a cada 15 minutos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
