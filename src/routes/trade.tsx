import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TravelFilePreview } from "@/components/travel-designer/TravelFilePreview";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript, SITE_URL } from "@/lib/jsonld";
import { trackEvent } from "@/lib/analytics-events";
import { EMAIL, EMAIL_HREF, LICENSE_LABEL } from "@/config/business-nap";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/why-image.jpg";

/**
 * /trade — B2B page for travel advisors, designers, agencies, DMC and
 * group partners. Reuses the /api/public/contact endpoint (source: "trade").
 * No invented affiliations, rates or regional limits — brand rule.
 */

const CANONICAL = `${SITE_URL}/trade`;
const TITLE = "Portugal for travel advisors | YES Experiences trade partner";
const DESCRIPTION =
  "Portugal ground partner for travel advisors and agencies, with private tours, custom journeys, groups and one dedicated local contact.";
const OG_IMAGE = `${SITE_URL}${heroImg}`;

const tradeSchema = z.object({
  first: z.string().trim().min(1, "Please enter your first name").max(80),
  last: z.string().trim().min(1, "Please enter your last name").max(80),
  agency: z.string().trim().min(2, "Please enter your agency or brand").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid work email").max(254),
  country: z.string().trim().min(2, "Please enter a country").max(80),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little about your clients so we can reply usefully")
    .max(3500),
});

type FieldName = keyof z.infer<typeof tradeSchema>;
type Status = "idle" | "submitting" | "success" | "error";

export const Route = createFileRoute("/trade")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      { rel: "alternate", hrefLang: "en-US", href: CANONICAL },
      { rel: "alternate", hrefLang: "x-default", href: CANONICAL },
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "For travel advisors", path: "/trade" },
        ]),
      ),
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${CANONICAL}#service`,
        name: "Trade partnership for travel advisors and agencies",
        serviceType: "Private tour operator — trade partner",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Portugal" },
        audience: {
          "@type": "Audience",
          audienceType:
            "Travel advisors, travel designers, travel agencies, DMC partners, group and incentive planners",
        },
        description: DESCRIPTION,
        url: CANONICAL,
      }),
    ],
  }),
  component: TradePage,
});

const BENEFITS = [
  {
    title: "Portugal, known from the inside",
    body: `YES Experiences Portugal is a licensed Portuguese tour operator, ${LICENSE_LABEL}. Our journeys can include Portugal's essential landmarks, but they do not have to end there. First-hand knowledge of the country allows us to introduce clients to family-run producers, artisans, regional traditions, small communities and landscapes that rarely enter a standard itinerary.`,
  },
  {
    title: "Designed around the client, not the circuit",
    body: "Some clients want the classics. Others want a slower, more personal or more unexpected Portugal. We shape each route around their interests, pace and curiosity rather than fitting them into a fixed touring circuit.",
  },
  {
    title: "One local contact, from idea to travel",
    body: "Work directly with a Portugal-based designer who understands the client brief, knows the itinerary and coordinates every confirmed detail from the first conversation through to delivery.",
  },
];

const WHAT_WE_DESIGN = [
  {
    label: "Signature Experiences",
    body: "Ready-to-book private days across Portugal, combining strong regional storytelling, carefully chosen local encounters and seamless private operation.",
    to: "/experiences",
  },
  {
    label: "Experience Studio",
    body: "A private day shaped interactively by you or your client, from classic highlights to more local experiences, with the route, timings and price updating in real time — and reserved when it feels right.",
    to: "/studio-v3",
  },
  {
    label: "Travel Designer",
    body: "Tailor-made multi-day journeys across Portugal, balancing the places clients expect with the people, traditions and landscapes that make the country feel real.",
    to: "/multi-day",
  },
  {
    label: "Moments",
    body: "Proposals, anniversaries, honeymoons and private celebrations, planned discreetly and shaped around the people and meaning behind the occasion.",
    to: "/proposal-in-portugal",
  },
  {
    label: "Corporate & Private Groups",
    body: "Incentives, executive groups, private gatherings and family celebrations, designed around the people, purpose and pace of the group.",
    to: "/corporate",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do you work with travel advisors?",
    a: "Share the client brief, dates, interests, preferred pace and approximate budget. We will recommend the most suitable Signature Experience, shape a private day in the Studio or develop a tailor-made journey. One named contact follows the project from the first brief through to delivery.",
  },
  {
    q: "Do you offer trade rates or commission?",
    a: "Yes. We work on standard trade terms for confirmed bookings, agreed per relationship. Terms depend on volume, seasonality and whether you prefer net or commissionable pricing, so we discuss them directly rather than publish them. Ask us in the form below.",
  },
  {
    q: "Are you affiliated with Virtuoso, Signature, Serandipians or similar consortia?",
    a: "No. YES Experiences Portugal is a licensed independent Portuguese operator and works directly with advisors and agencies. If consortium membership matters for your programme, tell us and we will discuss it.",
  },
  {
    q: "Do you offer FAM trips or site inspections?",
    a: "FAM visits and site inspections are considered selectively for advisors with active or well-defined Portugal business. Share your agency profile, typical client and expected travel window, and we will assess the most relevant format.",
  },
  {
    q: "Where in Portugal can you operate?",
    a: "We operate across Portugal. We design everything from private days and classic itineraries to immersive multi-day journeys beyond the usual tourist routes. Each programme is shaped around the client and coordinated through one named local contact.",
  },
];

function TradePage() {
  useMarketingMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  function onFieldFocus() {
    if (started.current) return;
    started.current = true;
    trackEvent("trade_form_started");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    const form = e.currentTarget;
    const data = new FormData(form);
    // Honeypot — bots fill it, humans don't.
    if (String(data.get("website") ?? "").trim().length > 0) {
      setSent(true);
      setStatus("success");
      return;
    }
    const parsed = tradeSchema.safeParse({
      first: String(data.get("first") ?? ""),
      last: String(data.get("last") ?? ""),
      agency: String(data.get("agency") ?? ""),
      email: String(data.get("email") ?? ""),
      country: String(data.get("country") ?? ""),
      message: String(data.get("message") ?? ""),
    });
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setErrorMsg("Please check the highlighted fields.");
      trackEvent("trade_form_error", { placement: "validation" });
      return;
    }
    setStatus("submitting");
    try {
      const composed = `[TRADE INQUIRY]\nAgency: ${parsed.data.agency}\nCountry: ${parsed.data.country}\n\n${parsed.data.message}`;
      const resp = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first: parsed.data.first,
          last: parsed.data.last,
          email: parsed.data.email,
          message: composed,
          source: "trade",
          locale: typeof navigator !== "undefined" ? navigator.language : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setStatus("success");
      setSent(true);
      trackEvent("trade_form_submitted");
      void import("@/lib/analytics-ga4").then((m) =>
        m.gaGenerateLead({
          leadSource: "trade_form",
          method: "email",
          requestType: "trade",
        }),
      );
    } catch (err) {
      console.error("[trade] submit failed", err);
      setStatus("error");
      trackEvent("trade_form_error", { placement: "network" });
      setErrorMsg(
        `Sorry — the form did not go through. Please email ${EMAIL} directly with your agency and country.`,
      );
    }
  }

  return (
    <SiteLayout>
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="reveal pt-24 md:pt-32 pb-14 md:pb-24 bg-[color:var(--sand)]">
        <Scene className="container-x max-w-4xl text-center">
          <div className="scene-atmosphere">
            <Eyebrow flank>For travel advisors &amp; designers</Eyebrow>
          </div>
          <div className="scene-title mt-4 md:mt-5">
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Your clients&rsquo; Portugal,{" "}
              <SectionTitle.Em>designed and delivered locally.</SectionTitle.Em>
            </SectionTitle>
          </div>
          <span
            className="gold-rule mt-5 md:mt-6 mx-auto max-w-[64px] md:max-w-[80px]"
            aria-hidden="true"
          />
          <p className="scene-body mt-5 md:mt-6 mx-auto max-w-[42ch] md:max-w-[62ch] text-[15.5px] md:text-[16.5px] leading-[1.75] md:leading-[1.7] text-[color:var(--charcoal-soft)]">
            A trusted on-the-ground partner across Portugal, combining the places clients come to
            see with the people, traditions and landscapes they would rarely find on their own.
            Private experiences, tailor-made journeys, celebrations and groups, all handled through
            one named local contact.
          </p>
          <div className="scene-cta mt-8 md:mt-10 flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
            <CtaButton
              href="#trade-inquiry"
              variant="primary"
              onClick={() => trackEvent("trade_access_click", { placement: "hero" })}
            >
              Request trade access
            </CtaButton>
            <CtaButton
              href={EMAIL_HREF}
              variant="ghost"
              onClick={() => trackEvent("trade_email_click", { placement: "hero" })}
            >
              Email a local designer
            </CtaButton>
          </div>
        </Scene>
      </section>

      {/* ── Why partner with YES ────────────────────────── */}
      <section className="reveal py-14 md:py-24 bg-[color:var(--ivory)]">
        <Scene className="container-x max-w-6xl">
          <Eyebrow>Why partner with YES</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-4 max-w-[18ch] md:max-w-[24ch]">
            Local knowledge. <SectionTitle.Em>Portugal beyond the obvious.</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-9 md:mt-14 grid md:grid-cols-3 gap-8 md:gap-12 items-start divide-y divide-[color:var(--charcoal)]/10 md:divide-y-0">
            {BENEFITS.map((b) => (
              <div key={b.title} className="reveal-stagger pt-8 first:pt-0 md:pt-0">
                <h3 className="serif text-[1.15rem] md:text-xl leading-snug text-[color:var(--teal)]">
                  {b.title}
                </h3>
                <span className="gold-rule mt-3 max-w-[40px]" aria-hidden="true" />
                <p className="mt-3 max-w-[46ch] md:max-w-[60ch] text-[15px] leading-[1.75] md:leading-[1.7] text-[color:var(--charcoal-soft)]">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </Scene>
      </section>

      {/* ── What we design for your clients ─────────────── */}
      <section id="trade-services" className="reveal py-14 md:py-24 bg-[color:var(--sand)]">
        <Scene className="container-x max-w-6xl">
          <Eyebrow>What we design for your clients</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-4 max-w-[26ch]">
            Five ways we can support <SectionTitle.Em>your clients in Portugal.</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-12 md:mt-14 grid md:grid-cols-2 gap-x-12 gap-y-10 md:gap-y-12">
            {WHAT_WE_DESIGN.map((row) => (
              <a
                key={row.to}
                href={row.to}
                className="reveal-stagger group block border-t border-[color:var(--charcoal)]/15 pt-6 hover:border-[color:var(--gold)] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="serif text-[1.15rem] md:text-xl leading-snug text-[color:var(--teal)]">
                    {row.label}
                  </h3>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-[color:var(--gold)] transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </div>
                <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                  {row.body}
                </p>
              </a>
            ))}
          </div>
        </Scene>
      </section>

      {/* ── Travel Designer Book — proof of capability ──── */}
      <section
        id="sample-journey"
        className="reveal scroll-mt-28 py-16 md:py-24 bg-[color:var(--ivory)] border-y border-[color:var(--border)]"
      >
        <Scene className="container-x max-w-5xl">
          <div className="max-w-[62ch]">
            <Eyebrow>A sample journey</Eyebrow>
            <SectionTitle as="h2" spacing="tight" className="mt-4 max-w-[24ch]">
              See how local knowledge <SectionTitle.Em>becomes a journey.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-[color:var(--charcoal-soft)]">
              Each Travel Designer project brings together the client&rsquo;s priorities,
              Portugal&rsquo;s essential places and the local stories, people and experiences that
              give the journey its character. The result is presented as a personal travel book,
              visual, practical and entirely shaped around the client.
            </p>
            <p className="mt-4 text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
              From the first route idea to the final confirmed journey, every detail is brought
              together in one clear and beautifully presented travel document.
            </p>
          </div>

          <TravelFilePreview
            className="mt-10 md:mt-12"
            onEngage={() => trackEvent("sample_journey_view", { placement: "trade" })}
          />

          <p className="mt-8 text-center text-[13.5px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            An anonymised sample file, shown as a preview only.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton
              href="#trade-inquiry"
              variant="primary"
              onClick={() =>
                trackEvent("travel_book_sample_request", { placement: "sample_journey" })
              }
            >
              Request a travel book sample
            </CtaButton>
          </div>
        </Scene>
      </section>

      {/* ── Trade FAQ ───────────────────────────────────── */}
      <section className="reveal py-14 md:py-24 pb-20 md:pb-28 bg-[color:var(--sand)]">
        <Scene className="container-x max-w-3xl">
          <Eyebrow>Trade FAQ</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-4 max-w-[24ch]">
            Clear answers before <SectionTitle.Em>you entrust us with a client.</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-8 md:mt-12">
            <Accordion
              type="single"
              collapsible
              className="space-y-3"
              onValueChange={(v) => {
                if (v) trackEvent("trade_faq_open", { placement: v });
              }}
            >
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`trade-faq-${i}`}
                  className="reveal-stagger border border-[color:var(--border)] bg-white/80 transition-colors duration-200 hover:border-[color:var(--teal)]/40 [&[data-state=open]]:border-[color:var(--teal)]/55"
                >
                  <AccordionTrigger className="px-5 md:px-6 py-5 text-left serif text-[15.5px] md:text-[17px] leading-snug text-[color:var(--charcoal)] hover:no-underline hover:text-[color:var(--teal)] [&[data-state=open]]:text-[color:var(--teal)]">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 md:px-6 pt-0 pb-6 text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {/* FAQ JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        </Scene>
      </section>

      {/* ── Trade access form ───────────────────────────── */}
      <section
        id="trade-inquiry"
        className="reveal py-14 md:py-24 pb-24 md:pb-24 bg-[color:var(--ivory)] scroll-mt-28"
      >
        <Scene className="container-x max-w-2xl">
          <Eyebrow>Request trade access</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-4 max-w-[24ch]">
            Tell us about your agency <SectionTitle.Em>and the clients you serve.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-[60ch] text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            Share your agency profile, typical client and the kind of support you are looking for in
            Portugal. A named local designer will reply within one business day.
          </p>
          {sent ? (
            <div
              className="mt-10 border-l-4 border-[color:var(--gold)] bg-[color:var(--sand)] p-8 flex gap-4"
              role="status"
            >
              <CheckCircle2 className="text-[color:var(--teal)] mt-1 shrink-0" size={22} />
              <div>
                <h3 className="serif text-2xl text-[color:var(--teal)]">Thank you.</h3>
                <p className="mt-2 text-[color:var(--charcoal-soft)] text-[15px] leading-[1.7]">
                  Your request reached the trade desk. A named local designer will be in touch
                  shortly.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-6" noValidate>
              <div className="grid sm:grid-cols-2 gap-6">
                <TField
                  label="First name"
                  name="first"
                  autoComplete="given-name"
                  error={fieldErrors.first}
                  onFocus={onFieldFocus}
                />
                <TField
                  label="Last name"
                  name="last"
                  autoComplete="family-name"
                  error={fieldErrors.last}
                  onFocus={onFieldFocus}
                />
              </div>
              <TField
                label="Agency or brand"
                name="agency"
                autoComplete="organization"
                error={fieldErrors.agency}
                onFocus={onFieldFocus}
              />
              <div className="grid sm:grid-cols-2 gap-6">
                <TField
                  label="Work email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  error={fieldErrors.email}
                  onFocus={onFieldFocus}
                />
                <TField
                  label="Country"
                  name="country"
                  autoComplete="country-name"
                  error={fieldErrors.country}
                  onFocus={onFieldFocus}
                />
              </div>
              <TField
                label="Your clients & the support you need"
                name="message"
                textarea
                error={fieldErrors.message}
                onFocus={onFieldFocus}
              />
              {/* Honeypot — hidden from users, visible to bots. */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {errorMsg ? (
                <p className="text-[13.5px] leading-[1.6] text-red-700" role="alert">
                  {errorMsg}
                </p>
              ) : null}
              <div className="pt-2">
                <CtaButton
                  type="submit"
                  variant="primary"
                  loading={status === "submitting"}
                  loadingLabel="Sending…"
                >
                  Request trade access
                </CtaButton>
              </div>
            </form>
          )}
        </Scene>
      </section>
    </SiteLayout>
  );
}

function TField({
  label,
  name,
  type = "text",
  textarea = false,
  autoComplete,
  inputMode,
  error,
  onFocus,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  autoComplete?: string;
  inputMode?: "email" | "text";
  error?: string;
  onFocus?: () => void;
}) {
  const id = `trade-${name}`;
  const errId = `${id}-error`;
  const cls = [
    "mt-2 w-full border-b bg-transparent py-2.5 text-[16px] text-[color:var(--charcoal)]",
    "focus:outline-none focus:border-[color:var(--gold)]",
    error
      ? "border-red-700"
      : "border-[color:var(--charcoal)]/40 hover:border-[color:var(--charcoal)]/60",
  ].join(" ");
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11.5px] uppercase tracking-[0.2em] font-semibold text-[color:var(--charcoal)]"
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          rows={5}
          className={cls}
          onFocus={onFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={cls}
          onFocus={onFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
        />
      )}
      {error ? (
        <p id={errId} className="mt-2 text-[13px] leading-[1.5] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
