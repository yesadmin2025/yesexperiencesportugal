import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

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
  }),

  component: Page,
});

function Page() {
  const [sent, setSent] = useState(false);
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
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-6"
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="First Name" name="first" />
                  <Field label="Last Name" name="last" />
                </div>
                <Field label="Email" name="email" type="email" />
                <Field label="What are you dreaming of?" name="message" textarea />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
          <aside className="space-y-7">
            <Info icon={<Mail size={16} />} label="Email" value="hello@yesexperiences.pt" />
            <Info icon={<Phone size={16} />} label="Phone" value="+351 910 000 000" />
            <Info icon={<MapPin size={16} />} label="Based in" value="Lisbon, Portugal" />
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
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          required
          className="mt-2 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors"
        />
      )}
    </label>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
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
}
