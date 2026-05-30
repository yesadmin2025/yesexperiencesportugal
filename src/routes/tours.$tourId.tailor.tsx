import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  Sparkles,
  MessageCircle,
  Lock,
  Info,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { findTour, stopImage, stopFocal, type SignatureTour, type TourStop } from "@/data/signatureTours";
import { whatsappHref } from "@/components/WhatsAppFab";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

/* ════════════════════════════════════════════════════════════════
 * /tours/$tourId/tailor — Tailor a Signature
 *
 * A calmer, focused flow that lets a guest adjust *only* the details
 * available inside one specific Signature. The core route, story and
 * local guide stay locked. Live summary updates as the user adjusts.
 * ════════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/tours/$tourId/tailor")({
  loader: ({ params }) => {
    const tour = findTour(params.tourId);
    if (!tour) throw notFound();
    return { tour };
  },
  head: ({ params, loaderData }) => {
    const url = `https://yesexperiencesportugal.com/tours/${params.tourId}/tailor`;
    const t = loaderData?.tour;
    if (!t)
      return {
        meta: [
          { title: "Tailor a Signature — YES experiences Portugal" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    const img = t.img?.startsWith("http") ? t.img : `https://yesexperiencesportugal.com${t.img}`;
    return {
      meta: [
        { title: `Tailor "${t.title.split("—")[0].trim()}" — YES experiences Portugal` },
        {
          name: "description",
          content: `Adjust selected details inside the ${t.title} Signature — pace, timing, group needs and small additions, without redesigning the day.`,
        },
        { property: "og:title", content: `Tailor this Signature — ${t.title}` },
        {
          property: "og:description",
          content:
            "Keep the heart of this journey, adjust selected details to match your rhythm.",
        },
        { property: "og:image", content: img },
        { property: "twitter:image", content: img },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-4xl">Signature not found</h1>
          <p className="mt-4 text-[color:var(--charcoal-soft)]">
            That Signature Experience doesn't exist anymore.
          </p>
          <Link
            to="/experiences"
            className="mt-8 inline-flex items-center gap-2 border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-3 text-sm"
          >
            <ArrowLeft size={14} /> Back to all experiences
          </Link>
        </div>
      </section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-3xl">Something went sideways</h1>
          <p className="mt-3 text-[color:var(--charcoal-soft)] text-sm">{error.message}</p>
        </div>
      </section>
    </SiteLayout>
  ),
  component: TailorPage,
});

/* ────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────── */
function TailorPage() {
  const { tour } = Route.useLoaderData();

  // ─── State (only adjustable details) ────────────────────────
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [pace, setPace] = useState<"relaxed" | "balanced" | "full">("balanced");
  const [guests, setGuests] = useState(2);
  const [language, setLanguage] = useState<"en" | "pt" | "es" | "fr">("en");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Tour-aware add-ons — only those plausible for this tour
  const addonOptions = useMemo(() => buildAddons(tour), [tour]);
  const lunchOptions = useMemo(() => buildLunch(tour), [tour]);
  const [addons, setAddons] = useState<Set<string>>(new Set(["pickup"]));
  const [lunch, setLunch] = useState<string>(lunchOptions[0]?.id ?? "");

  const [accessibility, setAccessibility] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  // ─── Derived live summary values ────────────────────────────
  const keptStops = useMemo(
    () => (tour.stops ?? []).filter((s: TourStop) => !skipped.has(s.label)),
    [tour.stops, skipped],
  );

  const estimatedHours = useMemo(() => {
    const base = parseHours(tour.durationHours);
    const paceDelta = pace === "relaxed" ? 1 : pace === "full" ? -0.5 : 0;
    const skippedDelta = -0.5 * skipped.size;
    return Math.max(3, Math.round((base + paceDelta + skippedDelta) * 10) / 10);
  }, [tour.durationHours, pace, skipped]);

  const estimatedReturn = useMemo(
    () => addHoursToTime(pickup, estimatedHours),
    [pickup, estimatedHours],
  );

  const estimatedPrice = useMemo(() => {
    let p = tour.priceFrom;
    if (addons.has("photographer")) p += 75;
    if (addons.has("wine")) p += 25;
    if (lunch === "premium") p += 35;
    return p;
  }, [tour.priceFrom, addons, lunch]);

  // ─── WhatsApp / submission message ──────────────────────────
  const message = useMemo(() => {
    const lines = [
      `Hi! I'd like to confirm a Tailored Signature.`,
      `• Tour: ${tour.title} (${tour.region})`,
      `• Date: ${date || "flexible"}`,
      `• Pickup: ${pickup}`,
      `• Pace: ${pace}`,
      `• Guests: ${guests}`,
      `• Guide language: ${language.toUpperCase()}`,
      `• Stops kept: ${keptStops.map((s: TourStop) => s.label).join(", ") || "guide's choice"}`,
      skipped.size ? `• Skipped: ${[...skipped].join(", ")}` : "",
      addons.size ? `• Add-ons: ${[...addons].join(", ")}` : "",
      lunch ? `• Lunch: ${lunchOptions.find((l) => l.id === lunch)?.label ?? lunch}` : "",
      accessibility.size ? `• Accessibility: ${[...accessibility].join(", ")}` : "",
      notes ? `• Notes: ${notes}` : "",
      `• Indicative total from €${estimatedPrice} pp`,
    ].filter(Boolean);
    return lines.join("\n");
  }, [
    tour,
    date,
    pickup,
    pace,
    guests,
    language,
    keptStops,
    skipped,
    addons,
    lunch,
    lunchOptions,
    accessibility,
    notes,
    estimatedPrice,
  ]);

  // ─── Helpers ────────────────────────────────────────────────
  const toggle = <T extends string>(setter: (s: Set<T>) => void, current: Set<T>, val: T) => {
    const next = new Set(current);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  return (
    <SiteLayout>
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <section className="pt-24 pb-3">
        <div className="container-x max-w-6xl">
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <ArrowLeft size={12} /> Back to this Signature
          </Link>
        </div>
      </section>

      {/* ── 1 · INTRO ───────────────────────────────────────── */}
      <section className="pb-8">
        <div className="container-x max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-end">
            <div>
              <Eyebrow>Tailor this Signature</Eyebrow>
              <SectionTitle as="h1" size="default" spacing="normal">
                Keep the heart of this journey,{" "}
                <SectionTitle.Em>adjust selected details</SectionTitle.Em>{" "}
                to match your rhythm.
              </SectionTitle>
              <p className="mt-5 text-[14.5px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-lg">
                You're tailoring{" "}
                <span className="text-[color:var(--charcoal)]">
                  {tour.title.split("—")[0].trim()}
                </span>
                . The route, story and trusted local guide remain intact — only the
                details below can be adjusted.
              </p>
            </div>

            {/* Tour mini card — visual anchor */}
            <div className="relative aspect-[16/9] sm:aspect-[16/8] overflow-hidden border border-[color:var(--border)]">
              <img
                src={tour.img}
                alt={tour.title}
                style={{ objectPosition: tour.focal ?? "50% 50%" }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-[color:var(--ivory)]">
                <span className="text-[10px] uppercase tracking-[0.24em] bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] px-2.5 py-1">
                  Signature
                </span>
                <p className="serif italic mt-2 text-[15px] leading-snug">{tour.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ivory)]/85">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={11} /> {tour.region}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={11} /> {tour.durationHours}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 · WHAT STAYS / WHAT YOU CAN ADJUST ──────────────
          Two-column reassurance block. The user must understand:
          "I can adjust this tour a little, without starting from
          zero." Tailored = selected adjustments INSIDE this one
          Signature — never a new itinerary, never stops from other
          tours, never a mix of regions. */}
      <section
        className="py-10 md:py-12 bg-[color:var(--ivory)] border-y border-[color:var(--border)]"
        aria-labelledby="tailor-scope-title"
      >
        <div className="container-x max-w-6xl">
          <h2 id="tailor-scope-title" className="sr-only">
            What stays the same and what you can adjust
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* What stays the same */}
            <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <Lock size={14} className="text-[color:var(--gold)] shrink-0" aria-hidden="true" />
                <span className="text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]">
                  What stays the same
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--charcoal)]">
                The core route, quality and local flow remain intact.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                {[
                  "The real route and order of stops",
                  "The trusted local guide and driver",
                  "The quality of every stop and partner",
                  "The region — only this Signature, no mixing",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check size={13} className="mt-[3px] text-[color:var(--teal)] shrink-0" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What you can adjust */}
            <div className="border border-[color:var(--border)] bg-[color:var(--sand)] p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <Sparkles size={14} className="text-[color:var(--teal)] shrink-0" aria-hidden="true" />
                <span className="text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]">
                  What you can adjust
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--charcoal)]">
                Selected details available inside this specific experience.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                {[
                  "Pace and timing",
                  "Optional stops, when available",
                  "Available add-ons for this tour",
                  "Lunch preference, when applicable",
                  "Group size, language and accessibility needs",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Plain-language clarification — sets the right mental model
              before the user touches any control. */}
          <p className="mt-5 text-[12.5px] leading-[1.6] text-[color:var(--charcoal-soft)] italic max-w-2xl">
            You're adjusting this tour a little — not starting from zero. To design
            a day from scratch, open the Studio.
          </p>
        </div>
      </section>

      {/* ── 2 · ADJUSTABLE OPTIONS + 4 · LIVE SUMMARY ─────── */}
      <section className="py-12 md:py-16">
        <div className="container-x max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_22rem] gap-8 lg:gap-12 items-start">
            {/* ─── Adjustments column ──────────────────── */}
            <div className="space-y-10">
              {/* Date + Pickup */}
              <Group title="When">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Date">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-transparent border border-[color:var(--border)] px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--gold)] min-h-[48px]"
                    />
                  </Field>
                  <Field label="Pickup time">
                    <Segmented
                      value={pickup}
                      onChange={setPickup}
                      options={[
                        { v: "08:00", l: "08:00" },
                        { v: "09:00", l: "09:00" },
                        { v: "10:00", l: "10:00" },
                      ]}
                    />
                  </Field>
                </div>
              </Group>

              {/* Pace */}
              <Group title="Pace">
                <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                  How the day breathes. The stops stay; only the rhythm changes.
                </p>
                <Segmented
                  value={pace}
                  onChange={setPace}
                  options={[
                    { v: "relaxed", l: "Relaxed" },
                    { v: "balanced", l: "Balanced" },
                    { v: "full", l: "Full" },
                  ]}
                />
              </Group>

              {/* Group */}
              <Group title="Your group">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Guests">
                    <Stepper value={guests} onChange={setGuests} min={1} max={12} />
                  </Field>
                  <Field label="Guide language">
                    <Segmented
                      value={language}
                      onChange={setLanguage}
                      options={[
                        { v: "en", l: "EN" },
                        { v: "pt", l: "PT" },
                        { v: "es", l: "ES" },
                        { v: "fr", l: "FR" },
                      ]}
                    />
                  </Field>
                </div>
              </Group>

              {/* Stops — only those that exist on this tour */}
              {(tour.stops ?? []).length > 0 && (
                <Group title="Stop variations">
                  <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                    Tap to skip a stop you'd rather trade for extra time elsewhere.
                    The order of what stays is preserved.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0">
                    {(tour.stops ?? []).map((s: TourStop, i: number) => {
                      const kept = !skipped.has(s.label);
                      return (
                        <li key={s.label + i}>
                          <button
                            type="button"
                            onClick={() =>
                              toggle(setSkipped, skipped, s.label)
                            }
                            aria-pressed={kept}
                            className={[
                              "w-full flex items-stretch gap-3 border text-left transition-colors min-h-[64px]",
                              kept
                                ? "border-[color:var(--teal)]/50 bg-[color:var(--teal)]/5"
                                : "border-[color:var(--border)] opacity-60",
                            ].join(" ")}
                          >
                            <span className="relative w-16 shrink-0 overflow-hidden">
                              <img
                                src={stopImage(s)}
                                alt=""
                                style={{ objectPosition: stopFocal(s) }}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </span>
                            <span className="flex-1 py-2.5 pr-3 flex flex-col justify-center">
                              <span
                                className={[
                                  "text-[13px] leading-snug",
                                  kept
                                    ? "text-[color:var(--charcoal)]"
                                    : "text-[color:var(--charcoal-soft)] line-through",
                                ].join(" ")}
                              >
                                {s.label}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mt-1">
                                {kept ? "Included" : "Skipping"}
                              </span>
                            </span>
                            <span
                              className={[
                                "w-9 flex items-center justify-center text-[color:var(--ivory)]",
                                kept ? "bg-[color:var(--teal)]" : "bg-[color:var(--border)]",
                              ].join(" ")}
                              aria-hidden
                            >
                              {kept ? <Check size={14} /> : "–"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Group>
              )}

              {/* Lunch — only when relevant for this tour */}
              {lunchOptions.length > 0 && (
                <Group title="Lunch">
                  <ChipGroup
                    value={lunch}
                    onChange={setLunch}
                    options={lunchOptions.map((l) => ({ v: l.id, l: l.label }))}
                  />
                </Group>
              )}

              {/* Add-ons — tour-aware */}
              {addonOptions.length > 0 && (
                <Group title="Small additions">
                  <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                    Optional. Available within this Signature only.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {addonOptions.map((a) => {
                      const on = addons.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggle(setAddons, addons, a.id)}
                          aria-pressed={on}
                          className={[
                            "px-3.5 py-2 text-[12px] border transition-colors min-h-[40px]",
                            on
                              ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]"
                              : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                          ].join(" ")}
                        >
                          {a.label}
                          {a.priceDelta ? (
                            <span className="ml-1.5 text-[color:var(--gold)] tracking-normal">
                              +€{a.priceDelta}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </Group>
              )}

              {/* Accessibility / comfort */}
              <Group title="Accessibility & comfort">
                <p className="text-[12.5px] text-[color:var(--charcoal-soft)] mb-3 -mt-1">
                  Tell us anything that helps your guide prepare.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "mobility", l: "Mobility support" },
                    { id: "stroller", l: "Stroller / pram" },
                    { id: "child-seat", l: "Child seat" },
                    { id: "vegetarian", l: "Vegetarian / vegan" },
                    { id: "allergies", l: "Allergies" },
                    { id: "quiet", l: "Quiet pace" },
                  ].map((c) => {
                    const on = accessibility.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(setAccessibility, accessibility, c.id)}
                        aria-pressed={on}
                        className={[
                          "px-3 py-2 text-[12px] border transition-colors min-h-[40px]",
                          on
                            ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                            : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                        ].join(" ")}
                      >
                        {c.l}
                      </button>
                    );
                  })}
                </div>
              </Group>

              {/* Notes */}
              <Group title="Anything else?">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Anniversary, kids' ages, mobility needs, languages spoken at home…"
                  className="w-full bg-transparent border border-[color:var(--border)] px-3 py-3 text-sm focus:outline-none focus:border-[color:var(--gold)] resize-none"
                />
              </Group>

              {/* 5 · Human guidance */}
              <div className="bg-[color:var(--sand)]/60 border border-[color:var(--border)] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--gold)] text-[color:var(--gold)] shrink-0">
                    <MessageCircle size={14} />
                  </span>
                  <div>
                    <p className="serif text-[17px] leading-snug">
                      Need help deciding?
                    </p>
                    <p className="text-[13px] text-[color:var(--charcoal-soft)] mt-1 leading-relaxed">
                      A local is available in real time. We'll suggest the right pace and
                      add-ons for your group.
                    </p>
                    <a
                      href={whatsappHref(
                        `Hi! I'd like a quick suggestion for tailoring "${tour.title}".`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--gold)]"
                    >
                      <MessageCircle size={13} /> Talk to a local
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 4 · LIVE SUMMARY (sticky on desktop) ─── */}
            <aside className="lg:sticky lg:top-24">
              <div className="bg-[color:var(--card)] border border-[color:var(--border)] overflow-hidden">
                <div className="px-5 py-4 bg-[color:var(--charcoal-deep)] text-[color:var(--ivory)] flex items-center justify-between">
                  <Eyebrow tone="onDark">Live summary</Eyebrow>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--gold)] opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--gold)]" />
                    </span>
                    Updating
                  </span>
                </div>

                <div className="p-5 space-y-4 text-[13px]">
                  <SummaryRow label="Date" value={date || "Flexible — confirm with guide"} />
                  <SummaryRow
                    label="Timing"
                    value={`${pickup} → ~${estimatedReturn} · ~${formatHours(estimatedHours)}`}
                  />
                  <SummaryRow label="Pace" value={cap(pace)} />
                  <SummaryRow label="Guests" value={`${guests} · ${language.toUpperCase()}`} />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                      Itinerary ({keptStops.length} of {(tour.stops ?? []).length})
                    </p>
                    <ol className="mt-2 space-y-1.5 list-none p-0">
                      {keptStops.map((s: TourStop, i: number) => (
                        <li key={s.label + i} className="flex gap-2.5">
                          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)] w-5 shrink-0 mt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[13px] leading-snug">{s.label}</span>
                        </li>
                      ))}
                      {keptStops.length === 0 && (
                        <li className="text-[12px] italic text-[color:var(--charcoal-soft)]">
                          Add at least one stop back.
                        </li>
                      )}
                    </ol>
                  </div>

                  {(addons.size > 0 || lunch) && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                        Additions
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1.5 list-none p-0">
                        {lunch && (
                          <li className="text-[10.5px] uppercase tracking-[0.18em] border border-[color:var(--gold)]/40 px-2 py-1">
                            {lunchOptions.find((l) => l.id === lunch)?.label}
                          </li>
                        )}
                        {[...addons].map((id) => {
                          const a = addonOptions.find((x) => x.id === id);
                          if (!a) return null;
                          return (
                            <li
                              key={id}
                              className="text-[10.5px] uppercase tracking-[0.18em] border border-[color:var(--gold)]/40 px-2 py-1"
                            >
                              {a.label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[color:var(--border)] flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                      Indicative total
                    </span>
                    <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
                      €{estimatedPrice}
                      <span className="ml-1 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                        / pp
                      </span>
                    </span>
                  </div>

                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] inline-flex items-center gap-1.5">
                    <Check size={12} /> Confirmation status: ready
                  </p>
                </div>

                {/* 6 · CTA */}
                <div className="p-5 pt-0">
                  <a
                    href={whatsappHref(message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-5 py-4 text-sm tracking-wide transition-all min-h-[52px]"
                  >
                    <Sparkles size={15} /> Tailor this Signature
                  </a>
                  <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)] text-center">
                    Instant confirmation. No forms. No waiting.
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80 text-center">
                    Secured directly on this site.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[12px] italic text-[color:var(--charcoal-soft)] leading-relaxed flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-[color:var(--gold)]" />
                Looking for full freedom? You can{" "}
                <Link
                  to="/builder"
                  className="not-italic underline decoration-[color:var(--gold)] underline-offset-2 hover:text-[color:var(--teal)]"
                >
                  open the Studio
                </Link>{" "}
                and build a day from scratch instead.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Per-tour option builders (tour-aware, never global)
 * ──────────────────────────────────────────────────────────── */
function buildAddons(tour: SignatureTour): { id: string; label: string; priceDelta?: number }[] {
  const out: { id: string; label: string; priceDelta?: number }[] = [
    { id: "pickup", label: "Hotel pickup" },
  ];
  const styles = tour.seed.styles ?? [];
  const text = (tour.title + " " + tour.blurb + " " + tour.intro).toLowerCase();

  if (styles.includes("wine") || /wine|tasting|winery/.test(text)) {
    out.push({ id: "wine", label: "Extra wine pairing", priceDelta: 25 });
  }
  if (/photo|memorable|anniversary|propos/.test(text) || styles.includes("celebration")) {
    out.push({ id: "photographer", label: "Photographer (1h)", priceDelta: 75 });
  }
  if (/family|kids|children/.test(text)) {
    out.push({ id: "kids", label: "Kids' activity kit" });
  }
  if (/sunset|dusk|evening/.test(text)) {
    out.push({ id: "sunset", label: "Sunset extension" });
  }
  return out;
}

function buildLunch(tour: SignatureTour): { id: string; label: string }[] {
  const text = (tour.title + " " + tour.intro + " " + tour.blurb).toLowerCase();
  const includesLunch = (tour.included ?? []).some((i) => /lunch/i.test(i));
  if (!/lunch|picnic|meal|seafood|tasting/.test(text) && !includesLunch) return [];
  return [
    { id: "included", label: includesLunch ? "Keep included lunch" : "Add a local lunch" },
    { id: "premium", label: "Premium tasting menu" },
    { id: "skip", label: "Skip — light snack only" },
  ];
}

/* ────────────────────────────────────────────────────────────────
 * Small UI primitives
 * ──────────────────────────────────────────────────────────── */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr border border-[color:var(--border)]">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            className={[
              "px-3 py-3 text-[12px] uppercase tracking-[0.2em] transition-colors min-h-[48px]",
              on
                ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
            ].join(" ")}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            className={[
              "px-3.5 py-2 text-[12px] border transition-colors min-h-[40px]",
              on
                ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
            ].join(" ")}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center border border-[color:var(--border)] min-h-[48px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-4 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
        aria-label="Fewer"
      >
        −
      </button>
      <span className="flex-1 text-center text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-4 py-2.5 text-lg leading-none text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
        aria-label="More"
      >
        +
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] shrink-0">
        {label}
      </span>
      <span className="text-[12.5px] text-[color:var(--charcoal)] text-right leading-snug">
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Utilities
 * ──────────────────────────────────────────────────────────── */
function parseHours(s: string): number {
  // "7–9h" → 8, "8h" → 8, "9–10h" → 9.5
  const nums = s.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0) return 7;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function addHoursToTime(hhmm: string, hoursToAdd: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m + Math.round(hoursToAdd * 60);
  const hh = Math.floor((totalMin / 60) % 24);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatHours(h: number): string {
  if (Number.isInteger(h)) return `${h}h`;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min === 0 ? `${whole}h` : `${whole}h${String(min).padStart(2, "0")}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
