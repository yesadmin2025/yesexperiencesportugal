import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Calendar, Users, Loader2, Check } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { signatureTours, findTour } from "@/data/signatureTours";
import { supabase } from "@/integrations/supabase/client";
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
          "Tell us your date, party and preferences — we confirm your private day in Portugal within 24 hours. Instant booking also available on every Signature day.",
      },
      { property: "og:title", content: "Book a Private Day in Portugal | YES Portugal" },
      {
        property: "og:description",
        content:
          "Tell us your date, party and preferences — we confirm your private day in Portugal within 24 hours.",
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

function BookPage() {
  const { tour: tourParam } = Route.useSearch();
  const preselected = tourParam && findTour(tourParam) ? tourParam : "";

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
    const { error } = await supabase.from("booking_requests").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      tour_id: parsed.data.tourId || null,
      preferred_date: parsed.data.date || null,
      adults: parsed.data.adults,
      children: parsed.data.children,
      preferences: parsed.data.preferences || null,
      source: "book_page",
      attribution: guideAttributionMetadata(),
    });
    setPending(false);
    if (error) {
      toast.error("Something went wrong — please try again in a moment.");
      return;
    }
    setDone(true);
  };

  const fieldClass =
    "w-full min-h-[48px] border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-[16px] sm:text-sm focus:border-[color:var(--gold)] focus:outline-none";
  const labelClass =
    "mb-1.5 block font-sans text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]";

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
            Share your date, your party and what you love — a real person from our team replies
            within 24 hours with your day confirmed, or a better-shaped suggestion.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x max-w-2xl">
          {done ? (
            <div className="rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-7 md:p-9 text-center">
              <Check className="mx-auto text-[color:var(--teal)]" size={28} aria-hidden />
              <h2 className="font-display mt-4 text-[1.5rem] font-medium leading-[1.2] text-[color:var(--charcoal)]">
                Thank you, {name.trim().split(" ")[0]}. Your request is with us.
              </h2>
              <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                We reply personally within 24 hours — usually much sooner. Keep an eye on{" "}
                {email.trim()} for our note.
              </p>
              {chosenTour ? (
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: chosenTour.id }}
                  className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
                >
                  Or book {chosenTour.title.split("—")[0].trim()} instantly →
                </Link>
              ) : null}
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8"
              data-testid="booking-request-form"
            >
              <div className="grid gap-5">
                <div>
                  <label htmlFor="book-tour" className={labelClass}>
                    Which day?
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
                </div>

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
                    <Users size={12} className="mr-1 inline" aria-hidden /> Who's travelling
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="book-adults" className="sr-only">
                        Adults
                      </label>
                      <input
                        id="book-adults"
                        type="number"
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
                    Email
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

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--charcoal)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                >
                  {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
                  Send my booking request
                </button>

                <p className="text-center text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
                  A person replies within 24 hours — never an autoresponder. No payment taken here.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
