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
            </section>

            <section className="grid gap-3">
              {data.hosts.map((h) => (
                <article
                  key={h.host}
                  className="rounded-lg border border-[color:var(--sand)] bg-white p-4"
                >
                  <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusDot ready={h.ready} />
                      <h3 className="font-medium text-[color:var(--charcoal)]">{h.host}</h3>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                      {new Date(h.checkedAt).toLocaleTimeString("pt-PT")}
                    </span>
                  </header>
                  <dl className="mt-3 grid gap-1 text-xs text-[color:var(--charcoal)] sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        A records
                      </dt>
                      <dd className="font-mono">
                        {h.aRecords.length ? h.aRecords.join(", ") : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        HTTPS
                      </dt>
                      <dd className="font-mono">{h.httpStatus ?? "sem resposta"}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">{h.notes}</p>
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
