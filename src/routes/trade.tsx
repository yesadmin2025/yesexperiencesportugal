import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Scene } from "@/components/motion/Scene";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript, SITE_URL } from "@/lib/jsonld";
import { EMAIL, EMAIL_HREF } from "@/config/business-nap";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/why-image.jpg";

/**
 * /trade — B2B landing page for US travel advisors, designers and agencies.
 * Reuses the /api/public/contact endpoint (source: "trade").
 * No invented affiliations (Virtuoso, Serandipians, etc.) — brand rule.
 */

const CANONICAL = `${SITE_URL}/trade`;
const TITLE = "Portugal for travel advisors | YES Experiences trade partner";
const DESCRIPTION =
  "Direct trade partner in Portugal for US travel advisors, designers and agencies. Private Signature experiences, custom multi-day journeys, one contact on the ground.";
const OG_IMAGE = `${SITE_URL}${heroImg}`;

const tradeSchema = z.object({
  first: z.string().trim().min(1, "Please enter your first name").max(80),
  last: z.string().trim().min(1, "Please enter your last name").max(80),
  agency: z.string().trim().min(2, "Please enter your agency or brand").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  country: z.string().trim().min(2, "Please enter a country").max(80),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little about your clients so we can reply usefully")
    .max(3500),
});

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
          audienceType: "Travel advisors, travel designers, travel agencies",
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
    title: "A real operator on the ground",
    body: "Licensed Portuguese tour operator (RNAAT nº 31/2023). Your clients travel with our own guides and vehicles — not a rebooked third party.",
  },
  {
    title: "Bookable in real time",
    body: "Availability, pricing and reservation confirmed in minutes through our Studio, not days of back-and-forth. Custom multi-day journeys drafted the same week.",
  },
  {
    title: "One contact, on Lisbon time",
    body: "Direct WhatsApp and email with a named designer. No call centre, no OTA queue. Your client always knows who to reach.",
  },
];

const WHAT_WE_DESIGN = [
  {
    label: "Signature Experiences",
    body: "Twelve pre-designed private days across Lisbon, Arrábida, Sintra, Alentejo and the Vicentine Coast — bookable as-is for clients who want a strong, curated day.",
    to: "/experiences",
  },
  {
    label: "Experience Studio",
    body: "A live design tool your client can use with you or alone — private day built stop-by-stop, priced in real time.",
    to: "/studio-v3",
  },
  {
    label: "Multi-day journeys",
    body: "Custom 4–12 day private journeys across Portugal — pace, regions and hotels shaped around each client.",
    to: "/multi-day",
  },
  {
    label: "Moments",
    body: "Proposals, honeymoons, anniversaries — quiet, cinematic setups run by our team with the guide.",
    to: "/proposal-in-portugal",
  },
  {
    label: "Corporate & Private Groups",
    body: "Small executive groups, incentive days, family celebrations — briefed and quoted directly with you.",
    to: "/corporate",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do you work with US travel advisors?",
    a: "Direct. You reach out through this page or on WhatsApp; we assign a designer who works with you (not your client) until the itinerary is confirmed. Client-facing communication is handled by you unless you ask us to co-brand it.",
  },
  {
    q: "Do you offer trade rates or commission?",
    a: "Yes — standard trade terms on confirmed bookings, negotiated per relationship. We do not publish rates because they depend on volume, seasonality and whether you want net or commissionable pricing. Ask us in the form below.",
  },
  {
    q: "Are you affiliated with Virtuoso, Signature, Serandipians or similar consortia?",
    a: "Not yet. We are a licensed independent Portuguese operator and work directly with advisors on both sides of the Atlantic. If you require consortium membership as a condition, tell us — we are open to conversations.",
  },
  {
    q: "Do you offer FAM trips or site inspections?",
    a: "On a case-by-case basis for advisors who have sent, or are seriously planning to send, clients to Portugal. Send us your agency details, typical client profile and travel window in the form.",
  },
  {
    q: "Where in Portugal can you operate?",
    a: "Our home base is Sesimbra, 40 minutes south of Lisbon, and we operate day tours across Lisbon, Sintra, Arrábida, Setúbal, Alentejo and the Vicentine Coast. For multi-day journeys we design nationally — Douro, Porto, Alentejo interior, Algarve, the islands — with vetted partners for the regions we do not drive ourselves.",
  },
];

function TradePage() {
  useMarketingMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
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
      setErrorMsg(parsed.error.issues[0]?.message ?? "Please check the form.");
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
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setStatus("success");
      setSent(true);
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
      setErrorMsg(
        `Sorry — the form did not go through. Please email ${EMAIL} directly with your agency and country.`,
      );
    }
  }

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="reveal pt-32 pb-14 md:pb-20 bg-[color:var(--sand)]">
        <Scene className="container-x max-w-4xl text-center">
          <div className="scene-atmosphere">
            <Eyebrow flank>For travel advisors &amp; designers</Eyebrow>
          </div>
          <div className="scene-title">
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Portugal, designed with your{" "}
              <SectionTitle.Em>clients</SectionTitle.Em> in mind.
            </SectionTitle>
          </div>
          <p className="scene-body mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)]">
            A direct partner in Portugal for US travel advisors, designers and agencies.
            Signature private days, custom multi-day journeys, one designer on the ground —
            reached in minutes, not days.
          </p>
          <div className="scene-cta mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="#trade-inquiry"
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
            >
              Request trade access <ArrowRight size={14} />
            </a>
            <a
              href={EMAIL_HREF}
              className="inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--charcoal)]/60 text-[color:var(--charcoal)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
            >
              Email a designer
            </a>
          </div>
        </Scene>
      </section>

      {/* Why partner */}
      <section className="reveal py-20">
        <Scene className="container-x max-w-6xl">
          <Eyebrow>Why partner with YES</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-3 max-w-3xl">
            A working Portuguese operator — not a marketplace.
          </SectionTitle>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="border-l-2 border-[color:var(--gold)]/60 pl-5"
              >
                <h3 className="serif text-xl text-[color:var(--teal)]">{b.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-[color:var(--charcoal-soft)]">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </Scene>
      </section>

      {/* What we design for your clients */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <Scene className="container-x max-w-6xl">
          <Eyebrow>What we design for your clients</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-3 max-w-3xl">
            Five ways your client can travel with us.
          </SectionTitle>
          <div className="mt-12 grid md:grid-cols-2 gap-x-10 gap-y-8">
            {WHAT_WE_DESIGN.map((row) => (
              <a
                key={row.to}
                href={row.to}
                className="group block border-t border-[color:var(--charcoal)]/15 pt-6 hover:border-[color:var(--gold)] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="serif text-xl text-[color:var(--teal)]">
                    {row.label}
                  </h3>
                  <ArrowRight
                    size={16}
                    className="text-[color:var(--gold)] transition-transform group-hover:translate-x-1"
                  />
                </div>
                <p className="mt-3 text-[15px] leading-[1.65] text-[color:var(--charcoal-soft)]">
                  {row.body}
                </p>
              </a>
            ))}
          </div>
        </Scene>
      </section>

      {/* FAQ */}
      <section className="reveal py-20">
        <Scene className="container-x max-w-3xl">
          <Eyebrow>Trade FAQ</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-3">
            Straight answers before you send us a client.
          </SectionTitle>
          <div className="mt-10 space-y-6">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group border-t border-[color:var(--charcoal)]/15 pt-5"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[color:var(--charcoal)]">
                  <span className="serif text-lg leading-snug">{f.q}</span>
                  <span
                    className="mt-1 text-[color:var(--gold)] transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                  {f.a}
                </p>
              </details>
            ))}
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

      {/* Inquiry */}
      <section id="trade-inquiry" className="reveal py-20 bg-[color:var(--sand)] scroll-mt-24">
        <Scene className="container-x max-w-2xl">
          <Eyebrow>Request trade access</Eyebrow>
          <SectionTitle as="h2" spacing="tight" className="mt-3">
            Tell us about your agency and your clients.
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            A named designer replies from Lisbon, usually within one business day.
          </p>
          {sent ? (
            <div className="mt-10 border-l-4 border-[color:var(--gold)] bg-[color:var(--ivory)] p-8 flex gap-4">
              <CheckCircle2
                className="text-[color:var(--teal)] mt-1 shrink-0"
                size={22}
              />
              <div>
                <h3 className="serif text-2xl text-[color:var(--teal)]">Thank you.</h3>
                <p className="mt-2 text-[color:var(--charcoal-soft)] text-[15px]">
                  Your inquiry reached the trade desk. A designer will be in touch shortly.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
              <div className="grid sm:grid-cols-2 gap-5">
                <TField label="First name" name="first" autoComplete="given-name" />
                <TField label="Last name" name="last" autoComplete="family-name" />
              </div>
              <TField
                label="Agency or brand"
                name="agency"
                autoComplete="organization"
              />
              <div className="grid sm:grid-cols-2 gap-5">
                <TField
                  label="Work email"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
                <TField label="Country" name="country" autoComplete="country-name" />
              </div>
              <TField
                label="Tell us about your clients & travel window"
                name="message"
                textarea
              />
              {/* Honeypot — hidden from users, visible to bots. */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {errorMsg ? (
                <p className="text-[13px] text-red-700" role="alert">
                  {errorMsg}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Sending…" : "Send trade inquiry"}
              </button>
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
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  autoComplete?: string;
}) {
  const id = `trade-${name}`;
  const cls =
    "mt-2 w-full border-b border-[color:var(--charcoal)]/25 bg-transparent py-2 text-[15px] text-[color:var(--charcoal)] focus:border-[color:var(--gold)] focus:outline-none";
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]"
      >
        {label}
      </label>
      {textarea ? (
        <textarea id={id} name={name} rows={5} className={cls} required />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          className={cls}
          required
        />
      )}
    </div>
  );
}
