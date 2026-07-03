import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

const contactSchema = z.object({
  first: z.string().trim().min(1, "Please enter your first name").max(80),
  last: z.string().trim().min(1, "Please enter your last name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
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
      { title: "Contact — YES experiences Portugal" },
      {
        name: "description",
        content: "Speak directly with our YES Portugal experience designers.",
      },
      { property: "og:title", content: "Contact — YES experiences Portugal" },
      {
        property: "og:description",
        content: "Speak directly with our YES Portugal experience designers.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/contact" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]),
      ),
    ],
  }),

  component: Page,
});

function Page() {
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <SiteLayout>
      <section className="pt-32 pb-12 bg-[color:var(--sand)]">
        <div className="container-x text-center">
          <Eyebrow flank>Talk to a Designer</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Begin Your <SectionTitle.Em>Portugal Story</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            Tell us a little about who you are and what you'd love to experience. We'll respond
            within one business day.
          </p>
        </div>
      </section>

      <section className="py-20">
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
                    message: String(data.get("message") ?? ""),
                  });
                  if (!parsed.success) {
                    setErrorMsg(parsed.error.issues[0]?.message ?? "Please check the form.");
                    return;
                  }
                  setStatus("submitting");
                  try {
                    const { error } = await supabase.from("contact_messages").insert({
                      first_name: parsed.data.first,
                      last_name: parsed.data.last,
                      email: parsed.data.email,
                      message: parsed.data.message,
                      source: "contact-page",
                      locale: typeof navigator !== "undefined" ? navigator.language : null,
                      user_agent:
                        typeof navigator !== "undefined"
                          ? navigator.userAgent.slice(0, 500)
                          : null,
                    });
                    if (error) throw error;
                    setStatus("success");
                    setSent(true);
                  } catch (err) {
                    console.error("[contact] insert failed", err);
                    setStatus("error");
                    setErrorMsg(
                      "Sorry, something went wrong sending your message. Please email info@yesexperiencesportugal.com.",
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
            <Info icon={<Mail size={16} />} label="Email" value="info@yesexperiencesportugal.com" />
            <Info icon={<Phone size={16} />} label="Phone" value="+351 911 889 992" />
            <Info
              icon={<MapPin size={16} />}
              label="Based in"
              value="Lisbon · Sintra · Arrábida, Portugal"
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
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
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
          required
          maxLength={4000}
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          required
          maxLength={type === "email" ? 254 : 80}
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors"
        />
      )}
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
