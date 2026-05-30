import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { MessageCircle, Users, Compass, ClipboardCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import imgFatimaNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";

export const Route = createFileRoute("/corporate")({
  head: () => ({
    meta: [
      { title: "Corporate & Private Groups in Portugal — YES experiences" },
      {
        name: "description",
        content:
          "Private group days in Portugal — local experiences, timing, transport and logistics handled end to end by a local team.",
      },
      { property: "og:title", content: "Corporate & Private Groups in Portugal" },
      {
        property: "og:description",
        content:
          "Private group days, designed end to end by a local team — never the generic formula.",
      },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      { property: "twitter:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      { property: "og:url", content: "https://yesexperiencesportugal.com/corporate" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/corporate" },
    ],

  }),
  component: CorporatePage,
});

const BLOCKS = [
  {
    eyebrow: "Executive & Incentive",
    title: "A day that feels effortless, not arranged.",
    emotional:
      "Your team arrives, the day unfolds, nothing feels stitched together. That's the work behind it.",
    practical:
      "Up to 30 guests · private transport · invoice & DMC support · designed around your goals.",
    local:
      "We handle the moving parts on the ground — real driving times, real venues, real partners.",
    image: imgArrabidaWineLunch,
    icon: Users,
  },
  {
    eyebrow: "Off-sites & Retreats",
    title: "Local Portugal, designed for working groups.",
    emotional:
      "Space to think, eat well, and feel the place — without the conference-hotel feeling.",
    practical:
      "Multi-day flow, regional logistics, meeting-friendly venues, cultural moments built into the rhythm.",
    local:
      "Coordinated by a local host who knows how each piece of the day connects.",
    image: imgSintraEstates,
    icon: Compass,
  },
  {
    eyebrow: "Client Hosting & VIP",
    title: "Quiet, considered, fully discreet.",
    emotional:
      "When it matters who's in the room and how the day feels — we shape it accordingly.",
    practical:
      "Small groups · private settings · careful pacing · NDAs welcome.",
    local:
      "Planned end to end with our local team — every detail confirmed before the day.",
    image: imgFatimaNazare,
    icon: ClipboardCheck,
  },
];

function CorporatePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>For Teams &amp; Private Groups</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Private group days,{" "}
            <SectionTitle.Em>without the generic formula.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            For teams, incentives and private groups, we combine local
            experiences, timing, transport and logistics into a day that feels{" "}
            <span className="kw">effortless</span>.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">Plan a Group Experience</CtaButton>
            <CtaButton
              to="/contact"
              variant="ghost"
              icon={null}
              iconLeading={<MessageCircle size={14} aria-hidden="true" />}
            >
              Talk to a Local
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Service blocks */}
      <section className="py-16 md:py-24">
        <div className="container-x space-y-16 md:space-y-24">
          {BLOCKS.map((b, i) => {
            const Icon = b.icon;
            const reverse = i % 2 === 1;
            return (
              <article
                key={b.eyebrow}
                className={`reveal-stagger grid lg:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="overflow-hidden">
                  <img
                    src={b.image}
                    alt={b.title}
                    loading="lazy"
                    className="w-full aspect-[4/5] md:aspect-[5/6] object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                </div>
                <div>
                  <Eyebrow icon={<Icon strokeWidth={1.8} />}>{b.eyebrow}</Eyebrow>
                  <span className="gold-rule mt-4 max-w-[64px]" aria-hidden="true" />
                  <SectionTitle size="compact" spacing="loose">
                    {b.title}
                  </SectionTitle>
                  <p className="mt-4 font-serif italic text-[1.1rem] md:text-[1.2rem] text-[color:var(--teal)] leading-snug">
                    {b.emotional}
                  </p>
                  <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
                    {b.practical}
                  </p>
                  <div className="mt-5 pl-4 border-l-2 border-[color:var(--gold)] text-sm text-[color:var(--charcoal-soft)] leading-relaxed">
                    {b.local}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-2xl text-center">
          <SectionTitle size="compact">
            Tell us about <SectionTitle.Em>your group.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            Real driving times, real venues, real partners. We shape the
            proposal around what your team actually needs — never a copy-paste
            template.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">Request a Proposal</CtaButton>
            <CtaButton
              to="/contact"
              variant="ghost"
              icon={null}
              iconLeading={<MessageCircle size={14} aria-hidden="true" />}
            >
              Talk to a Local
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
