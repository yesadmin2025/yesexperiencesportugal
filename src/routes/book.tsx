import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Calendar, Users, Loader2, Check, ChevronLeft, MapPin, Clock, Mail } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { signatureTours, findTour } from "@/data/signatureTours";
import { SimpleBookingForm } from "@/components/SimpleBookingForm";
import { guideAttributionMetadata } from "@/lib/guide-attribution";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { toast } from "sonner";

const PAGE_URL = "https://yesexperiencesportugal.com/book";
const crumbs = [
  { name: "Home", path: "/" },
  { name: "Book a day", path: "/book" },
];

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  email: z.string().trim().email("Please check your email address").max(255),
  tourId: z.string().max(80),
  date: z.string().max(20),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  preferences: z.string().trim().max(1000),
});

const searchSchema = (search: Record<string, unknown>): { tour?: string } => ({
  tour: typeof search.tour === "string" ? search.tour : undefined,
});

export const Route = createFileRoute("/book")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Book a Private Day in Portugal | YES Portugal" },
      {
        name: "description",
        content:
          "Tell us your date, party and preferences in three short steps — a real person confirms your private day in Portugal within 24 hours. Instant booking also available.",
      },
      { property: "og:title", content: "Book a Private Day in Portugal | YES Portugal" },
      {
        property: "og:description",
        content:
          "Three short steps, then a personal reply within 24 hours with your private day in Portugal confirmed.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [jsonLdScript(breadcrumbLd(crumbs))],
  }),
  component: BookPage,
});

const STEPS = ["Your day", "Who & when", "Your details"] as const;

const HOW_IT_WORKS = [
  {
    title: "You tell us the shape of the day",
    body: "A date, who is travelling and what you love. Nothing more — the detail comes in conversation, not in a long form.",
  },
  {
    title: "A designer replies personally",
    body: "Within 24 hours, usually far sooner. Either your day confirmed as asked, or a better-shaped version with the reason why.",
  },
  {
    title: "You confirm and travel",
    body: "Private guide and vehicle, hotel pickup, and a day that keeps its rhythm even if the weather changes its mind.",
  },
] as const;

function BookPage() {
  const { tour: tourParam } = Route.useSearch();
  const preselected = tourParam && findTour(tourParam) ? tourParam : "";

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tourId, setTourId] = useState(preselected);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [preferences, setPreferences] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const chosenTour = tourId ? findTour(tourId) : undefined;
  const pct = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const parsed = bookingSchema.safeParse({
      name,
      email,
      tourId,
      date,
      adults,
      children,
      preferences,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/public/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          tourId: parsed.data.tourId || null,
          date: parsed.data.date || null,
          adults: parsed.data.adults,
          children: parsed.data.children,
          preferences: parsed.data.preferences || null,
          source: "book-page",
          attribution: guideAttributionMetadata(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
      if (!response.ok || !payload.ok) throw new Error("request_failed");
      setDone(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Something went wrong — please try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  const fieldClass =
    "w-full min-h-[52px] rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] px-3.5 py-3 text-[16px] focus:border-[color:var(--gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/40";
  const labelClass =
    "mb-1.5 block font-sans text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]";
  const primaryBtn =
    "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--charcoal)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2";

  const next = () => {
    if (step === 1) {
      if (!date) {
        toast.error("Please choose a preferred date — or pick any date and tell us you're flexible.");
        return;
      }
    }
    setStep((s) => (s === 2 ? s : ((s + 1) as 0 | 1 | 2)));
  };

  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="pt-10 pb-12 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Eyebrow flank>Book directly</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Tell us your day. <SectionTitle.Em>We take care of the rest</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
            Two ways to do it: pay and confirm your day instantly, or send your dates and a real
            person from our team replies within 24 hours.
          </p>
        </div>
      </section>

      {chosenTour && !done ? (
        <section className="py-12 md:py-14 border-b border-[color:var(--border)]" id="pay">
          <div className="container-x max-w-3xl">
            <div className="text-center">
              <Eyebrow flank>Confirm instantly</Eyebrow>
              <SectionTitle as="h2" spacing="tight">
                Pay securely and{" "}
                <SectionTitle.Em>your day is confirmed on the spot</SectionTitle.Em>.
              </SectionTitle>
              <p className="mt-5 mx-auto max-w-xl text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                Live dates and the final price for {chosenTour.title}, paid by card here. No waiting
                for a reply.
              </p>
            </div>
            <div className="mt-8">
              <SimpleBookingForm tour={chosenTour} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-12 md:py-14">
        <div className="container-x max-w-2xl">
          {done ? (
            <div
              className="rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-7 md:p-10 text-center"
              data-testid="booking-request-confirmation"
            >
              <Check className="mx-auto text-[color:var(--teal)]" size={30} aria-hidden />
              <h2 className="font-display mt-4 text-[1.6rem] font-medium leading-[1.2] text-[color:var(--charcoal)]">
                Thank you, {name.trim().split(" ")[0]}. Your request is with us.
              </h2>
              <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                We reply personally within 24 hours — usually much sooner. A confirmation is on its
                way to {email.trim()}; if it isn&apos;t there in a few minutes, check your spam
                folder.
              </p>

              <dl className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-4">
                  <dt className={labelClass}>Day requested</dt>
                  <dd className="text-[14.5px] text-[color:var(--charcoal)]">
                    {chosenTour ? chosenTour.title : "Not sure yet — we'll suggest"}
                  </dd>
                </div>
                <div className="rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-4">
                  <dt className={labelClass}>Date & party</dt>
                  <dd className="text-[14.5px] text-[color:var(--charcoal)]">
                    {date || "Flexible"} · {adults} adult{adults === 1 ? "" : "s"}
                    {children > 0 ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}
                  </dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {chosenTour ? (
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: chosenTour.id }}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
                  >
                    Book this day instantly →
                  </Link>
                ) : (
                  <Link
                    to="/experiences"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
                  >
                    Browse Signature days →
                  </Link>
                )}
                <Link
                  to="/local-stories"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[4px] border border-[color:var(--charcoal)]/20 px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)] no-underline hover:border-[color:var(--gold)]"
                >
                  Read local stories
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7 md:p-8"
              data-testid="booking-request-form"
            >
              {/* Progress indicator */}
              <div className="mb-6" data-testid="booking-progress">
                <div className="flex items-center justify-between font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal-soft)]">
                  <span>
                    Step {step + 1} / {STEPS.length} · {STEPS[step]}
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label="Booking request progress"
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--charcoal)]/10"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--gold-soft)] to-[color:var(--gold)] transition-[width] duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <ol className="mt-3 flex gap-2" aria-hidden="true">
                  {STEPS.map((label, i) => (
                    <li
                      key={label}
                      className={`flex-1 text-center font-sans text-[10px] uppercase tracking-[0.16em] ${
                        i <= step
                          ? "text-[color:var(--charcoal)] font-bold"
                          : "text-[color:var(--charcoal-soft)]"
                      }`}
                    >
                      {label}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-5">
                {step === 0 && (
                  <>
                    <div>
                      <label htmlFor="book-tour" className={labelClass}>
                        <MapPin size={12} className="mr-1 inline" aria-hidden /> Which day?
                      </label>
                      <select
                        id="book-tour"
                        value={tourId}
                        onChange={(e) => setTourId(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">Not sure yet — help me choose</option>
                        {signatureTours.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                      {chosenTour ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">
                          From €{chosenTour.priceFrom} per person · private, hotel pickup included.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="book-preferences" className={labelClass}>
                        Anything we should know?
                      </label>
                      <textarea
                        id="book-preferences"
                        value={preferences}
                        onChange={(e) => setPreferences(e.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Wine lover, celebrating an anniversary, slower pace, dietary needs…"
                        className={`${fieldClass} resize-y`}
                      />
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div>
                      <label htmlFor="book-date" className={labelClass}>
                        <Calendar size={12} className="mr-1 inline" aria-hidden /> Preferred date
                      </label>
                      <input
                        id="book-date"
                        type="date"
                        value={date}
                        min={minDate}
                        onChange={(e) => setDate(e.target.value)}
                        className={fieldClass}
                      />
                    </div>

                    <fieldset>
                      <legend className={labelClass}>
                        <Users size={12} className="mr-1 inline" aria-hidden /> Who&apos;s
                        travelling
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="book-adults" className="sr-only">
                            Adults
                          </label>
                          <input
                            id="book-adults"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            value={adults}
                            onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
                            className={fieldClass}
                            aria-label="Number of adults"
                          />
                          <span className="mt-1 block text-[12px] text-[color:var(--charcoal-soft)]">
                            Adults
                          </span>
                        </div>
                        <div>
                          <label htmlFor="book-children" className="sr-only">
                            Children
                          </label>
                          <input
                            id="book-children"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={20}
                            value={children}
                            onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
                            className={fieldClass}
                            aria-label="Number of children"
                          />
                          <span className="mt-1 block text-[12px] text-[color:var(--charcoal-soft)]">
                            Children
                          </span>
                        </div>
                      </div>
                    </fieldset>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <label htmlFor="book-name" className={labelClass}>
                        Your name
                      </label>
                      <input
                        id="book-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        required
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="book-email" className={labelClass}>
                        <Mail size={12} className="mr-1 inline" aria-hidden /> Email
                      </label>
                      <input
                        id="book-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={255}
                        required
                        className={fieldClass}
                      />
                    </div>

                    <div className="rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-4 text-[13.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                      <p className="font-sans text-[10.5px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)]">
                        Your request
                      </p>
                      <p className="mt-2">
                        {chosenTour ? chosenTour.title : "Day to be suggested"} · {date || "Flexible"}{" "}
                        · {adults} adult{adults === 1 ? "" : "s"}
                        {children > 0 ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  {step < 2 ? (
                    <button type="button" onClick={next} className={primaryBtn}>
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={pending}
                      className={primaryBtn}
                      data-testid="booking-request-submit"
                    >
                      {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
                      Send my booking request
                    </button>
                  )}
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep((s) => ((s - 1) as 0 | 1 | 2))}
                      className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-[4px] border border-[color:var(--charcoal)]/15 px-6 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)] hover:border-[color:var(--gold)] sm:w-auto"
                    >
                      <ChevronLeft size={14} aria-hidden /> Back
                    </button>
                  ) : null}
                </div>

                <p className="text-center text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                  A person replies within 24 hours — never an autoresponder. No payment taken here.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="pb-16 md:pb-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>What happens next</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Three steps, one <SectionTitle.Em>real conversation</SectionTitle.Em>.
          </SectionTitle>
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <li
                key={item.title}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5"
              >
                <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)]">
                  0{i + 1}
                </span>
                <h3 className="font-display mt-2 text-[1.1rem] leading-snug text-[color:var(--charcoal)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col items-start gap-3 rounded-[6px] border border-[color:var(--gold)]/40 bg-[color:var(--sand)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
              <Clock size={13} className="mr-1.5 inline text-[color:var(--gold)]" aria-hidden />
              In a hurry? Every Signature day can be booked instantly, with dates and prices shown
              before you pay.
            </p>
            <Link
              to="/experiences"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-6 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
            >
              Book instantly →
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
