import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin, Printer } from "lucide-react";

import { loadJourney } from "@/lib/builderJourneys.functions";
import { buildDayRoute } from "@/lib/builderEngine.functions";
import { fmtMinutes } from "@/components/builder/types";

export const Route = createFileRoute("/i/$token")({
  head: ({ params }) => ({
    meta: [
      { title: `Roteiro · ${params.token.slice(0, 6)} · YES Experiences` },
      {
        name: "description",
        content:
          "Roteiro privado YES Experiences Portugal — paragens reais, ritmo cuidado, exportável em PDF.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SharedItineraryPage,
  errorComponent: () => <ErrorShell title="Não foi possível carregar este roteiro." />,
  notFoundComponent: () => <ErrorShell title="Este roteiro foi removido ou nunca existiu." />,
});

function ErrorShell({ title }: { title: string }) {
  return (
    <div className="min-h-[100dvh] bg-[color:var(--ivory)] text-[color:var(--charcoal)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
          YES Experiences
        </p>
        <h1 className="serif mt-3 text-[1.8rem] font-semibold leading-tight">{title}</h1>
        <a
          href="/builder"
          className="mt-6 inline-block text-[12px] uppercase tracking-[0.22em] font-semibold underline underline-offset-4"
        >
          Construir um novo roteiro
        </a>
      </div>
    </div>
  );
}

function SharedItineraryPage() {
  const { token } = Route.useParams();
  const load = useServerFn(loadJourney);
  const build = useServerFn(buildDayRoute);

  const journeyQ = useQuery({
    queryKey: ["shared-journey", token],
    queryFn: () => load({ data: { shareToken: token } }),
    staleTime: 60_000,
  });

  const firstDay = useMemo(() => {
    if (!journeyQ.data || !("found" in journeyQ.data) || !journeyQ.data.found) return null;
    return journeyQ.data.state.days[0] ?? null;
  }, [journeyQ.data]);

  const routeQ = useQuery({
    queryKey: ["shared-route", token, firstDay?.stopKeys.join("|")],
    enabled: !!firstDay && firstDay.stopKeys.length > 0,
    queryFn: () =>
      build({
        data: {
          regionKey: firstDay!.regionKey,
          pace: (journeyQ.data && "found" in journeyQ.data && journeyQ.data.found
            ? journeyQ.data.state.pace
            : "balanced") as "relaxed" | "balanced" | "full",
          stopKeys: firstDay!.stopKeys,
        },
      }),
    staleTime: 60_000,
  });

  // Auto-print if ?print=1 in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1" && routeQ.data?.route) {
      const t = window.setTimeout(() => window.print(), 600);
      return () => window.clearTimeout(t);
    }
  }, [routeQ.data]);

  if (journeyQ.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[color:var(--ivory)] flex items-center justify-center">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/60">
          A carregar roteiro…
        </p>
      </div>
    );
  }

  if (!journeyQ.data || !("found" in journeyQ.data) || !journeyQ.data.found) {
    throw notFound();
  }

  if (!routeQ.data?.route) {
    return (
      <div className="min-h-[100dvh] bg-[color:var(--ivory)] flex items-center justify-center">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/60">
          A construir o roteiro…
        </p>
      </div>
    );
  }

  const route = routeQ.data.route;
  const guests = journeyQ.data.state.guests;
  const totalEur = route.pricePerPersonEur * guests;

  return (
    <main className="min-h-[100dvh] bg-[color:var(--ivory)] text-[color:var(--charcoal)] print:bg-white">
      <PrintStyles />

      {/* Top bar — hidden in print */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <a
            href="/"
            className="text-[10.5px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]"
          >
            YES Experiences Portugal
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
          >
            <Printer size={12} />
            PDF
          </button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 md:py-16 print:py-6">
        <p className="text-[10.5px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
          Roteiro privado
        </p>
        <h1 className="serif mt-3 text-[2.2rem] md:text-[3rem] leading-[1.04] tracking-[-0.01em] font-semibold">
          {route.region.label}
          <span className="italic font-normal text-[color:var(--charcoal)]/70">
            {" "}
            · um dia desenhado para ti
          </span>
        </h1>

        {route.region.blurb && (
          <p className="mt-4 serif italic text-[1.05rem] leading-[1.5] text-[color:var(--charcoal)]/80">
            {route.region.blurb}
          </p>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Paragens" value={String(route.stops.length)} />
          <Stat label="Duração" value={fmtMinutes(route.totals.experienceMinutes)} />
          <Stat label="Ritmo" value={route.pace} capitalize />
          <Stat label="Convidados" value={String(guests)} />
        </div>

        {/* Itinerary */}
        <section className="mt-10">
          <h2 className="text-[10.5px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Itinerário
          </h2>
          <ol className="mt-5 flex flex-col gap-5 border-l border-[color:var(--gold)]/30 pl-5">
            {route.stops.map((s, i) => (
              <li key={s.key} className="relative">
                <span className="absolute -left-[27px] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--teal)] text-[11px] font-bold text-[color:var(--ivory)] tabular-nums">
                  {i + 1}
                </span>
                <div className="flex items-start justify-between gap-3">
                  <p className="serif text-[1.15rem] font-semibold leading-tight">{s.label}</p>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55 tabular-nums">
                    {fmtMinutes(s.duration_minutes)}
                  </span>
                </div>
                {s.tag && (
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--gold)]">
                    {s.tag}
                  </p>
                )}
                {s.blurb && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--charcoal)]/80">
                    {s.blurb}
                  </p>
                )}
                {i > 0 && s.driveMinutesFromPrev > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/50">
                    <MapPin size={10} />
                    {fmtMinutes(s.driveMinutesFromPrev)} de viagem
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Included */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2">
          <Block
            title="Incluído"
            items={[
              "Motorista-anfitrião privado",
              "Todas as paragens planeadas",
              "Provas e visitas curadas",
              "Narrativa pessoal para o dia",
            ]}
          />
          <Block
            title="Pode ainda mudar"
            items={[
              "Ordem final das paragens",
              "Escolhas de almoço & vinho",
              "Ajustes de ritmo",
              "Momento de celebração",
            ]}
            muted
          />
        </section>

        {/* Price */}
        <section className="mt-10 rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40 p-6 print:bg-transparent">
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Investimento estimado
          </p>
          <p className="mt-2 serif text-[2.4rem] leading-none font-semibold tabular-nums">
            €{totalEur}
          </p>
          <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/65">
            €{route.pricePerPersonEur} por convidado · {guests} convidado
            {guests > 1 ? "s" : ""}
          </p>
        </section>

        {/* CTA — hidden in print */}
        <div className="mt-10 flex flex-col gap-3 print:hidden">
          <a
            href={`/builder?j=${token}`}
            className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)] bg-[color:var(--charcoal)] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ivory)] hover:bg-[color:var(--teal)] transition-colors"
          >
            <Check size={14} />
            Abrir & ajustar no Experience Studio
          </a>
          <p className="text-center text-[11px] text-[color:var(--charcoal)]/55">
            Confirmação instantânea · Anfitrião privado · Roteiro real
          </p>
        </div>

        <footer className="mt-16 border-t border-[color:var(--charcoal)]/10 pt-6 text-center text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
          YES Experiences Portugal
        </footer>
      </article>
    </main>
  );
}

function Stat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] px-3 py-3">
      <p className="text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/55">
        {label}
      </p>
      <p
        className={[
          "mt-1 serif text-[1.15rem] font-semibold tabular-nums",
          capitalize ? "capitalize" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function Block({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5 print:border-[color:var(--charcoal)]/30">
      <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((it) => (
          <li
            key={it}
            className={[
              "text-[13px] leading-snug",
              muted ? "text-[color:var(--charcoal)]/65" : "text-[color:var(--charcoal)]/85",
            ].join(" ")}
          >
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 18mm 16mm; }
        html, body { background: #fff !important; }
        .print\\:hidden { display: none !important; }
        a[href]::after { content: ""; }
      }
    `}</style>
  );
}
