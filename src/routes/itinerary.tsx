/**
 * /itinerary?session_id=cs_… — the online, readable version of the exact
 * itinerary PDF attached to the confirmation emails. Same source (the frozen
 * booking snapshot), same content, same notes — rendered as HTML so guests
 * can open it on a phone without downloading anything.
 *
 * Openable from the link alone (no email, no login): the Stripe checkout
 * session id is long and unguessable, the response carries no contact PII,
 * and the page is excluded from search engines.
 */
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  Download,
  Link2,
  Loader2,
  Printer,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { MAP_CANVAS_CLASS, MAP_FRAME_CLASS } from "@/components/SignatureRouteMapShell";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  filterItineraryStops,
  parseStopAnchor,
  resolveItineraryGeoStops,
  routeMatchesStops,
  stopAnchorId,
  unmappedStops,
} from "@/lib/itinerary-view";
import { getSignatureTourRoute } from "@/lib/signature-route.functions";

const ItineraryRouteMap = lazy(() => import("@/components/itinerary/ItineraryRouteMap"));

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
  tourId: string | null;
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

/** Shared control styling — 44px targets and a visible gold focus ring. */
const ACTION_CLASS =
  "inline-flex min-h-[44px] items-center gap-2 self-start border-b border-[color:var(--teal)]/40 pb-1 text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] transition-colors hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]";

const SECTION_HEADING_CLASS =
  "text-[12px] uppercase tracking-[0.2em] text-[color:var(--gold-ink)]";

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
      <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
      <div className="mt-3 h-px w-full bg-[color:var(--gold)]/25" />
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="itinerary-row grid grid-cols-[12px_minmax(0,1fr)] items-start gap-x-3"
          >
            <span aria-hidden className="mt-[0.72em] h-px w-2 bg-[color:var(--gold)]" />
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

  /* ------------------------------------------------------------------ *
   * Stops, numbered exactly as the PDF and the emails number them.
   * ------------------------------------------------------------------ */
  const stops = useMemo(
    () =>
      (data?.itinerary ?? []).map((stop, index) => ({
        order: stop.order ?? index + 1,
        label: stop.label,
        note: stop.note ?? null,
      })),
    [data],
  );

  const geoStops = useMemo(() => resolveItineraryGeoStops(stops), [stops]);
  const listOnlyStops = useMemo(() => unmappedStops(stops, geoStops), [stops, geoStops]);

  /* Real driving geometry, only for a Signature day whose route matches. */
  const fetchRoute = useServerFn(getSignatureTourRoute);
  const { data: routePayload } = useQuery({
    queryKey: ["itinerary-route", data?.tourId],
    queryFn: () => fetchRoute({ data: { tourId: data?.tourId as string } }),
    enabled: Boolean(data?.tourId) && geoStops.length >= 2,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const polylines = useMemo(() => {
    const routeStops = routePayload?.stops ?? [];
    if (!routeMatchesStops(routeStops.map((s) => s.label), geoStops)) return [];
    return (routePayload?.legs ?? []).map((l) => l.polyline);
  }, [routePayload, geoStops]);

  /* ------------------------------------------------------------------ *
   * Search + quick jump.
   * ------------------------------------------------------------------ */
  const [query, setQuery] = useState("");
  const visibleStops = useMemo(() => filterItineraryStops(stops, query), [stops, query]);
  const [activeStop, setActiveStop] = useState<number | null>(null);

  const jumpToStop = useCallback((order: number) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(stopAnchorId(order));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setActiveStop(order);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${stopAnchorId(order)}`);
    }
  }, []);

  /* Deep link: land on the stop named in the hash once data has loaded. */
  const landedRef = useRef(false);
  useEffect(() => {
    if (landedRef.current || stops.length === 0 || typeof window === "undefined") return;
    const order = parseStopAnchor(window.location.hash);
    if (order == null || !stops.some((s) => s.order === order)) return;
    landedRef.current = true;
    const id = window.setTimeout(() => {
      const el = document.getElementById(stopAnchorId(order));
      if (!el) return;
      el.scrollIntoView({ behavior: "auto", block: "center" });
      setActiveStop(order);
    }, 120);
    return () => window.clearTimeout(id);
  }, [stops]);

  /* ------------------------------------------------------------------ *
   * Copy link.
   * ------------------------------------------------------------------ */
  const [copied, setCopied] = useState(false);
  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable — the URL bar still holds the link */
      }
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }, []);

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
      <div className="itinerary-doc mx-auto w-full max-w-[720px] px-5 pb-24 pt-14 sm:pt-20">
        <Eyebrow>Your designed day</Eyebrow>
        <SectionTitle as="h1">{data?.experienceName ?? "Your YES experience"}</SectionTitle>

        {state.kind === "idle" ? (
          <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Open this page from your confirmation email to see your itinerary.
          </p>
        ) : null}

        {state.kind === "loading" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-8 inline-flex items-center gap-2 text-[color:var(--charcoal-soft)]"
          >
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading your itinerary…
          </p>
        ) : null}

        {state.kind === "error" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-8 inline-flex items-start gap-2 text-[color:var(--charcoal)]"
          >
            <AlertCircle size={16} className="mt-1 shrink-0 text-[color:var(--gold-ink)]" aria-hidden />
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
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                      {label}
                    </dt>
                    <dd className="mt-1.5 break-words text-[15px] leading-relaxed text-[color:var(--charcoal)]">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>

            {/* ---------------------------------------------------------- *
             * The route on a map — order only, never clock times.
             * ---------------------------------------------------------- */}
            {geoStops.length > 0 ? (
              <section className="itinerary-map mt-12" aria-labelledby="itinerary-map-heading">
                <h2 id="itinerary-map-heading" className={SECTION_HEADING_CLASS}>
                  The route
                </h2>
                <div className="mt-3 mb-6 h-px w-full bg-[color:var(--gold)]/25" />
                <Suspense
                  fallback={
                    <div className={MAP_FRAME_CLASS}>
                      <div
                        className={`${MAP_CANVAS_CLASS} flex items-center justify-center`}
                        role="status"
                        aria-live="polite"
                      >
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                          Loading map
                        </span>
                      </div>
                    </div>
                  }
                >
                  <ItineraryRouteMap stops={geoStops} polylines={polylines} />
                </Suspense>
                <p className="mt-4 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  The numbers follow the order of your day. We keep the day paced around you rather
                  than to fixed hours, so nothing is rushed.
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  {data.flexibilityNote}
                </p>
                {listOnlyStops.length > 0 ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">
                    {listOnlyStops.map((s) => `${s.order}. ${s.label}`).join(" · ")} — shown in the
                    list below only.
                  </p>
                ) : null}
              </section>
            ) : null}

            {stops.length > 0 ? (
              <section className="itinerary-block mt-12" aria-labelledby="itinerary-stops-heading">
                <h2 id="itinerary-stops-heading" className={SECTION_HEADING_CLASS}>
                  Your day, stop by stop
                </h2>
                <div className="mt-3 h-px w-full bg-[color:var(--gold)]/25" />

                {/* Search + quick jump */}
                <div className="itinerary-find mt-6">
                  <label htmlFor="itinerary-search" className="sr-only">
                    Search your stops by name
                  </label>
                  <div className="relative">
                    <Search
                      size={15}
                      aria-hidden
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--charcoal-soft)]"
                    />
                    <input
                      id="itinerary-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a stop"
                      autoComplete="off"
                      className="min-h-[44px] w-full rounded-[4px] border border-[color:var(--gold)]/35 bg-[color:var(--ivory)] pl-9 pr-10 text-[15px] text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      >
                        <X size={16} aria-hidden />
                      </button>
                    ) : null}
                  </div>

                  <div
                    className="mt-4 flex gap-2 overflow-x-auto pb-1"
                    role="group"
                    aria-label="Jump to a stop"
                  >
                    {stops.map((stop) => (
                      <button
                        key={stop.order}
                        type="button"
                        onClick={() => jumpToStop(stop.order)}
                        aria-label={`Jump to stop ${stop.order}: ${stop.label}`}
                        aria-current={activeStop === stop.order ? "true" : undefined}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
                          activeStop === stop.order
                            ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                            : "border-[color:var(--gold)]/45 text-[color:var(--gold-ink)] hover:border-[color:var(--gold)]"
                        }`}
                      >
                        {stop.order}
                      </button>
                    ))}
                  </div>

                  <p className="sr-only" role="status" aria-live="polite">
                    {query
                      ? `${visibleStops.length} of ${stops.length} stops match ${query}`
                      : `${stops.length} stops`}
                  </p>
                </div>

                {visibleStops.length === 0 ? (
                  <div className="mt-8">
                    <p className="text-[15px] leading-relaxed text-[color:var(--charcoal)]">
                      No stop matches that name.
                    </p>
                    <button type="button" onClick={() => setQuery("")} className={`${ACTION_CLASS} mt-4`}>
                      Show every stop
                    </button>
                  </div>
                ) : (
                  <ol className="mt-8 space-y-7">
                    {visibleStops.map((stop) => (
                      <li
                        key={stop.order}
                        id={stopAnchorId(stop.order)}
                        tabIndex={-1}
                        className="itinerary-row grid scroll-mt-24 grid-cols-[28px_minmax(0,1fr)] items-start gap-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      >
                        <span className="mt-[0.15em] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/45 text-[11px] leading-none text-[color:var(--gold-ink)]">
                          {stop.order}
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
                )}
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

            <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
              Reference · {data.reference.slice(-12)}
            </p>

            <div className="itinerary-actions mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href={`/api/public/booking-itinerary?session_id=${encodeURIComponent(data.reference)}`}
                className={ACTION_CLASS}
              >
                <Download size={14} aria-hidden /> Download PDF
              </a>
              <button type="button" onClick={() => window.print()} className={ACTION_CLASS}>
                <Printer size={14} aria-hidden /> Print
              </button>
              <button type="button" onClick={copyLink} className={ACTION_CLASS}>
                {copied ? <Check size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}
                {copied ? "Link copied" : "Copy link"}
              </button>
              <Link
                to="/booking-receipt"
                search={{ session_id: data.reference }}
                className={ACTION_CLASS}
              >
                <Receipt size={14} aria-hidden /> Receipt
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </SiteLayout>
  );
}
