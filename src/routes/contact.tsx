import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import ogImg from "@/assets/why-image.jpg";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
  BUSINESS_LEGAL_NAME,
  CITY,
  COUNTRY_CODE,
  EMAIL,
  PHONE_DISPLAY,
} from "@/config/business-nap";

const REQUEST_TYPES = [
  { value: "private_day", label: "A private day" },
  { value: "studio", label: "The Studio" },
  { value: "multi_day", label: "A multi-day journey" },
  { value: "proposal", label: "A proposal or celebration" },
  { value: "corporate", label: "A corporate/group day" },
  { value: "other", label: "Something else" },
] as const;

const requestTypeValues = REQUEST_TYPES.map((r) => r.value) as [string, ...string[]];

const contactSchema = z.object({
  first: z.string().trim().min(1, "Please enter your first name").max(80),
  last: z.string().trim().min(1, "Please enter your last name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  requestType: z.enum(requestTypeValues as [string, ...string[]], {
    errorMap: () => ({ message: "Please choose what we can help you plan" }),
  }),
  travelDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z
    .string()
    .trim()
    .min(10, "Please share a little more so we can help")
    .max(4000, "Message is too long"),
});

type Status = "idle" | "submitting" | "success" | "error";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — YES Experiences Portugal" },
      {
        name: "description",
        content: "Reach the YES team directly — quiet, human replies from local experience designers in Lisbon. WhatsApp, email or a short call.",
      },
      { property: "og:title", content: "Contact — YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Reach the YES team directly — quiet, human replies from local experience designers in Lisbon. WhatsApp, email or a short call.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/contact" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Contact YES Experiences Portugal — a local team in Sesimbra" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/contact" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]),
      ),
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "@id": "https://yesexperiencesportugal.com/contact#contactpage",
        url: "https://yesexperiencesportugal.com/contact",
        name: "Contact — YES Experiences Portugal",
        description: "Reach the YES team directly — quiet, human replies from local experience designers in Lisbon. WhatsApp, email or a short call.",
        inLanguage: "en",
        isPartOf: { "@id": "https://yesexperiencesportugal.com/#website" },
        about: { "@id": "https://yesexperiencesportugal.com/#organization" },
        mainEntity: {
          "@type": "Organization",
          "@id": "https://yesexperiencesportugal.com/#organization",
          name: BUSINESS_LEGAL_NAME,
          url: "https://yesexperiencesportugal.com",
          email: EMAIL,
          telephone: PHONE_DISPLAY,
          address: {
            "@type": "PostalAddress",
            addressLocality: CITY,
            addressCountry: COUNTRY_CODE,
          },
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer service",
              telephone: PHONE_DISPLAY,
              email: EMAIL,
              areaServed: COUNTRY_CODE,
              availableLanguage: ["en", "pt"],
            },
          ],
        },
      }),
    ],
  }),

  component: Page,
});

function Page() {
  useMarketingMotion();
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <SiteLayout>
      <section className="reveal pt-32 pb-12 bg-[color:var(--sand)]">
        <div className="container-x text-center">
          <Eyebrow flank>Talk to a Designer</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Begin Your <SectionTitle.Em>Portugal Story</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            Tell us a little about who you are and what you'd love to experience. A local usually
            replies within a few hours.
          </p>
        </div>
      </section>

      <section className="reveal py-20">
        <div className="container-x grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {sent ? (
              <div className="border-l-4 border-[color:var(--gold)] bg-[color:var(--sand)] p-10">
                <h3 className="serif text-3xl text-[color:var(--teal)]">Thank you.</h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)]">
                  Your message has reached our experience designers. We'll be in touch shortly.
                </p>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setErrorMsg(null);
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const parsed = contactSchema.safeParse({
                    first: String(data.get("first") ?? ""),
                    last: String(data.get("last") ?? ""),
                    email: String(data.get("email") ?? ""),
                    requestType: String(data.get("requestType") ?? ""),
                    travelDate: String(data.get("travelDate") ?? ""),
                    message: String(data.get("message") ?? ""),
                  });
                  if (!parsed.success) {
                    setErrorMsg(parsed.error.issues[0]?.message ?? "Please check the form.");
                    return;
                  }
                  setStatus("submitting");
                  try {
                    const resp = await fetch("/api/public/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        first: parsed.data.first,
                        last: parsed.data.last,
                        email: parsed.data.email,
                        requestType: parsed.data.requestType,
                        travelDate: parsed.data.travelDate ?? null,
                        message: parsed.data.message,
                        source: "contact-page",
                        locale: typeof navigator !== "undefined" ? navigator.language : null,
                        userAgent:
                          typeof navigator !== "undefined"
                            ? navigator.userAgent.slice(0, 500)
                            : null,
                      }),
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    setStatus("success");
                    setSent(true);
                    void import("@/lib/analytics-ga4").then((m) =>
                      m.gaGenerateLead({
                        leadSource: "contact_form",
                        method: "email",
                        requestType: parsed.data.requestType,
                      }),
                    );
                  } catch (err) {
                    console.error("[contact] submit failed", err);
                    setStatus("error");
                    setErrorMsg(
                      `Sorry, something went wrong sending your message. Please email ${EMAIL}.`,
                    );
                  }
                }}
                className="space-y-6"
                noValidate
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="First Name" name="first" />
                  <Field label="Last Name" name="last" />
                </div>
                <Field label="Email" name="email" type="email" />
                <SelectField
                  label="What can we help you plan?"
                  name="requestType"
                  options={REQUEST_TYPES}
                />
                <Field
                  label="When are you travelling? (optional)"
                  name="travelDate"
                  type="date"
                  required={false}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <Field label="What are you dreaming of?" name="message" textarea />
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
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
          <aside className="space-y-7">
            <Info icon={<Mail size={16} />} label="Email" value={EMAIL} />
            <Info icon={<Phone size={16} />} label="Phone" value={PHONE_DISPLAY} />
            <Info
              icon={<MapPin size={16} />}
              label="Based in"
              value="Sesimbra, designing private journeys across Portugal, with pickups from Lisbon, Cascais, Sintra, Sesimbra and Setúbal"
            />

            <div className="gold-divider" />
            <p className="serif italic text-lg text-[color:var(--teal)]">
              "We design Portugal experiences with care. Every reply is personal."
            </p>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea = false,
  required = true,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          rows={5}
          required={required}
          maxLength={4000}
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          min={min}
          maxLength={type === "email" ? 254 : 80}
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
        {label}
      </span>
      <select
        name={name}
        required
        defaultValue=""
        className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors appearance-none"
      >
        <option value="" disabled>
          Choose one…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Info({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-start gap-3">
      <span className="mt-1 h-9 w-9 rounded-full bg-[color:var(--sand)] flex items-center justify-center text-[color:var(--teal)]">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
          {label}
        </p>
        <p className="mt-1 text-[color:var(--charcoal)]">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
      >
        {body}
      </a>
    );
  }
  return body;
}
