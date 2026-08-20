/**
 * /itinerary?session_id=cs_… — the online, readable version of the exact
 * itinerary PDF attached to the confirmation emails. Same source (the frozen
 * booking snapshot), same content, same notes — rendered as HTML so guests
 * can open it on a phone without downloading anything.
 */
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, Download, Loader2, Printer, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface Search {
  session_id?: string;
}

interface ItineraryStop {
  order?: number | null;
  label: string;
  note?: string | null;
}

interface ItineraryData {
  ok: true;
  reference: string;
  experienceName: string | null;
  customerName: string | null;
  dateLabel: string | null;
  guestsLabel: string | null;
  pickup: string | null;
  durationLabel: string | null;
  amountFormatted: string | null;
  itinerary: ItineraryStop[];
  includedItems: string[];
  addOnLabels: string[];
  removedOptions: string[];
  customerNotes: string[];
  flexibilityNote: string;
  sufficiencyNote: string;
}

function formatDateLabel(value: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return value;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const Route = createFileRoute("/itinerary")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your itinerary — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Your private Portugal day, stop by stop: the route, what is included, your add-ons and your notes.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Your itinerary — YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Your private Portugal day, stop by stop, exactly as confirmed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItineraryPage,
});

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="itinerary-block mt-12">
      <h2 className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--gold-ink)]">
        {title}
      </h2>
      <div className="mt-3 h-px w-full bg-[color:var(--gold)]/25" />
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="itinerary-row grid grid-cols-[12px_minmax(0,1fr)] items-start gap-x-3"
          >
            <span
              aria-hidden
              className="mt-[0.72em] h-px w-2 bg-[color:var(--gold)]"
            />
            <span className="min-w-0 break-words text-[15px] leading-relaxed text-[color:var(--charcoal)]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItineraryPage() {
  const { session_id } = useSearch({ from: "/itinerary" });
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: ItineraryData }
    | { kind: "error"; message: string }
  >({ kind: session_id ? "loading" : "idle" });

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/booking-itinerary-data?session_id=${encodeURIComponent(session_id)}`,
        );
        const body = (await res.json()) as ItineraryData | { ok: false; error: string };
        if (cancelled) return;
        if (!res.ok || !("ok" in body) || body.ok !== true) {
          setState({
            kind: "error",
            message:
              !("ok" in body) || body.ok !== true
                ? "We couldn't find an itinerary for that reference yet."
                : "Could not load this itinerary.",
          });
          return;
        }
        setState({ kind: "ok", data: body });
      } catch {
        if (cancelled) return;
        setState({ kind: "error", message: "Could not load this itinerary." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  const data = state.kind === "ok" ? state.data : null;

  const facts: Array<[string, string | null]> = data
    ? [
        ["Guest", data.customerName],
        ["Date", formatDateLabel(data.dateLabel)],
        ["Travelers", data.guestsLabel],
        ["Pickup", data.pickup],
        ["Duration", data.durationLabel],
        ["Total paid", data.amountFormatted],
      ]
    : [];

  return (
    <SiteLayout>
      <main className="itinerary-doc mx-auto w-full max-w-[720px] px-5 pb-24 pt-14 sm:pt-20">
        <Eyebrow>Your designed day</Eyebrow>
        <SectionTitle as="h1">{data?.experienceName ?? "Your YES experience"}</SectionTitle>

        {state.kind === "idle" ? (
          <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Open this page from your confirmation email to see your itinerary.
          </p>
        ) : null}

        {state.kind === "loading" ? (
          <p className="mt-8 inline-flex items-center gap-2 text-[color:var(--charcoal-soft)]">
            <Loader2 size={16} className="animate-spin" /> Loading your itinerary…
          </p>
        ) : null}

        {state.kind === "error" ? (
          <p className="mt-8 inline-flex items-start gap-2 text-[color:var(--charcoal)]">
            <AlertCircle size={16} className="mt-1 shrink-0 text-[color:var(--gold-ink)]" />
            {state.message}
          </p>
        ) : null}

        {data ? (
          <>
            <dl className="itinerary-block mt-9 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              {facts
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="itinerary-row flex min-w-0 flex-col">
                    <dt className="text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                      {label}
                    </dt>
                    <dd className="mt-1.5 break-words text-[15px] leading-relaxed text-[color:var(--charcoal)]">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>

            {data.itinerary.length > 0 ? (
              <section className="itinerary-block mt-12">
                <h2 className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--gold-ink)]">
                  Your day, stop by stop
                </h2>
                <div className="mt-3 h-px w-full bg-[color:var(--gold)]/25" />
                <ol className="mt-6 space-y-7">
                  {data.itinerary.map((stop, index) => (
                    <li
                      key={`${stop.label}-${index}`}
                      className="itinerary-row grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-4"
                    >
                      <span className="mt-[0.15em] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/45 text-[11px] leading-none text-[color:var(--gold-ink)]">
                        {stop.order ?? index + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="serif break-words text-[18px] leading-snug text-[color:var(--teal)]">
                          {stop.label}
                        </h3>
                        {stop.note ? (
                          <p className="mt-2 break-words text-[15px] leading-relaxed text-[color:var(--charcoal)]">
                            {stop.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <Section title="Included" items={data.includedItems} />
            <Section title="Add-ons" items={data.addOnLabels} />
            <Section title="Adjusted for you" items={data.removedOptions} />
            <Section title="Your notes" items={data.customerNotes} />

            <div className="itinerary-block mt-14 h-px w-full bg-[color:var(--gold)]/25" />
            <p className="mt-6 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
              {data.flexibilityNote}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
              {data.sufficiencyNote}
            </p>

            <p className="mt-8 text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Reference · {data.reference.slice(-12)}
            </p>

            <div className="itinerary-actions mt-10 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center gap-2 self-start border-b border-[color:var(--teal)]/40 pb-1 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)]"
              >
                <Printer size={14} /> Print itinerary
              </button>
              <a
                href={`/api/public/booking-itinerary?session_id=${encodeURIComponent(data.reference)}`}
                className="inline-flex min-h-[44px] items-center gap-2 border-b border-[color:var(--teal)]/40 pb-1 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)] self-start"
              >
                <Download size={14} /> Download as PDF
              </a>
              <Link
                to="/booking-receipt"
                search={{ session_id: data.reference }}
                className="inline-flex min-h-[44px] items-center gap-2 border-b border-[color:var(--teal)]/40 pb-1 text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)] self-start"
              >
                <Receipt size={14} /> Printable receipt
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </SiteLayout>
  );
}
