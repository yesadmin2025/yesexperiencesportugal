import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLegacyDomainsHistory, type HistoryPoint } from "@/lib/legacy-domains-monitor.functions";

/** Color for a given HTTP status band. */
function statusColor(status: number | null): string {
  if (status === null) return "#94a3b8"; // slate — no response
  if (status === 410) return "#10b981"; // emerald — desired
  if (status >= 200 && status < 300) return "#f59e0b"; // amber — still serving
  if (status >= 300 && status < 400) return "#ef4444"; // rose — hijacked redirect
  return "#a855f7"; // purple — other
}

function StatusLegend() {
  const items: Array<{ label: string; color: string }> = [
    { label: "410 Gone (ok)", color: "#10b981" },
    { label: "2xx (legacy)", color: "#f59e0b" },
    { label: "3xx (redirect)", color: "#ef4444" },
    { label: "sem resposta", color: "#94a3b8" },
    { label: "outro", color: "#a855f7" },
  ];
  return (
    <ul className="flex flex-wrap gap-3 text-[11px] text-[color:var(--charcoal-soft)]">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

interface RowProps {
  host: string;
  points: HistoryPoint[];
  range: { start: number; end: number };
}

function HostRow({ host, points, range }: RowProps) {
  const width = 720;
  const height = 44;
  const span = Math.max(1, range.end - range.start);

  // DNS band = strip along bottom; HTTP band = strip on top.
  const dnsY = 30;
  const dnsH = 10;
  const httpY = 4;
  const httpH = 22;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-[color:var(--charcoal)]">{host}</span>
        <span className="text-[10px] text-[color:var(--charcoal-soft)]">
          {points.length} sondas
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-11 w-full rounded border border-[color:var(--sand)] bg-[color:var(--ivory)]/40"
        aria-label={`Histórico de ${host}`}
      >
        {/* base tracks */}
        <rect x={0} y={httpY} width={width} height={httpH} fill="#f5f5f4" />
        <rect x={0} y={dnsY} width={width} height={dnsH} fill="#f5f5f4" />

        {points.map((p, i) => {
          const t = new Date(p.checkedAt).getTime();
          const x = ((t - range.start) / span) * width;
          const w = Math.max(2, width / Math.max(points.length, 60));
          const httpFill = statusColor(p.httpStatus);
          const dnsFill = p.pointsToLovable ? "#10b981" : "#94a3b8";
          return (
            <g key={i}>
              <rect x={x} y={httpY} width={w} height={httpH} fill={httpFill} opacity={0.9}>
                <title>
                  {new Date(p.checkedAt).toLocaleString("pt-PT")} · HTTP {p.httpStatus ?? "—"} ·
                  DNS→Lovable {p.pointsToLovable ? "sim" : "não"}
                </title>
              </rect>
              <rect x={x} y={dnsY} width={w} height={dnsH} fill={dnsFill} opacity={0.9} />
            </g>
          );
        })}
      </svg>
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-[color:var(--charcoal-soft)]">
        <span>HTTP acima · DNS abaixo</span>
        <span>
          {new Date(range.start).toLocaleDateString("pt-PT")} —{" "}
          {new Date(range.end).toLocaleDateString("pt-PT")}
        </span>
      </div>
    </div>
  );
}

export function LegacyDomainsHistoryChart() {
  const fetchHistory = useServerFn(getLegacyDomainsHistory);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["legacy-domains-history"],
    queryFn: () => fetchHistory(),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryPoint[]>();
    (data ?? []).forEach((p) => {
      const arr = map.get(p.host) ?? [];
      arr.push(p);
      map.set(p.host, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const range = useMemo(() => {
    if (!data || data.length === 0) {
      const end = Date.now();
      return { start: end - 7 * 24 * 3600 * 1000, end };
    }
    const times = data.map((p) => new Date(p.checkedAt).getTime());
    return { start: Math.min(...times), end: Math.max(...times) };
  }, [data]);

  return (
    <section className="mt-10 rounded-lg border border-[color:var(--sand)] bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
            Evolução histórica · últimos 7 dias
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[color:var(--charcoal)]">
            DNS &amp; HTTP ao longo do tempo
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Cada sonda de 60s é registada. A faixa superior mostra o estado HTTP (200/302/410), a
            inferior indica se o DNS aponta para Lovable.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-full border border-[color:var(--teal)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-white disabled:opacity-60"
        >
          {isFetching ? "…" : "atualizar"}
        </button>
      </header>

      <div className="mt-4">
        <StatusLegend />
      </div>

      {error ? (
        <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">A carregar histórico…</p>
      ) : grouped.length === 0 ? (
        <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
          Ainda não existem sondas registadas. Os dados começam a aparecer após a primeira execução
          automática de <code>probeLegacyDomains</code>.
        </p>
      ) : (
        <div>
          {grouped.map(([host, pts]) => (
            <HostRow key={host} host={host} points={pts} range={range} />
          ))}
        </div>
      )}
    </section>
  );
}
