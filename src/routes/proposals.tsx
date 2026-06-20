import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { MessageCircle, Heart, Sparkles, Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";
import imgTroiaBeach from "@/assets/tours/troia-comporta/beach.jpg";

export const Route = createFileRoute("/proposals")({
  head: () => ({
    meta: [
      { title: "Proposals & Celebrations in Portugal — YES experiences" },
      {
        name: "description",
        content:
          "Proposals, anniversaries, birthdays and private celebrations in Portugal — shaped quietly with local knowledge.",
      },
      { property: "og:title", content: "Proposals & Celebrations in Portugal" },
      {
        property: "og:description",
        content: "Private moments, shaped with care. Local knowledge behind every detail.",
      },
      {
        property: "og:image",
        content: `https://yesexperiencesportugal.com${imgArrabidaWineLunch}`,
      },
      {
        property: "twitter:image",
        content: `https://yesexperiencesportugal.com${imgArrabidaWineLunch}`,
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/proposals" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/proposals" }],
  }),
  component: ProposalsPage,
});

const BLOCKS = [
  {
    eyebrow: "Proposals",
    title: "A private moment, shaped with care.",
    emotional:
      "From the setting to the timing, we help shape the moment discreetly, with local knowledge behind every detail.",
    practical:
      "Discreet location · careful timing · surprise logistics · planned with full discretion.",
    local: "Planned end to end with our local team — every detail confirmed before the day.",
    image: imgArrabidaWineLunch,
    icon: Heart,
    cta: "Plan a Proposal",
  },
  {
    eyebrow: "Celebrations",
    title: "For days worth remembering.",
    emotional:
      "Birthdays, anniversaries, honeymoons or family moments — shaped around your rhythm, your people and the way you want to feel Portugal.",
    practical: "Up to 14 guests · private host · multi-activity planning · flexible scheduling.",
    local: "Coordinated by a local host who knows how each piece of the day connects.",
    image: imgSintraEstates,
    icon: Sparkles,
    cta: "Plan a Celebration",
  },
  {
    eyebrow: "Family & Friends",
    title: "Your people, your pace, your Portugal.",
    emotional:
      "When it's the people that matter most, the day shouldn't feel like a tour. It should feel like yours.",
    practical: "Small group days · private transport · personal touches · adjusted to your rhythm.",
    local:
      "We work with people we trust on the ground — places that welcome you as guests, not bookings.",
    image: imgTroiaBeach,
    icon: Users,
    cta: "Plan a Private Day",
  },
];

function ProposalsPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Proposals &amp; Celebrations</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Moments worth <SectionTitle.Em>saying yes to.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            A private moment, shaped with <span className="kw">care</span> — with local knowledge
            behind every detail.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Plan a Proposal
            </CtaButton>
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
                  <CtaButton to="/contact" variant="ghost" size="sm" className="mt-6">
                    {b.cta}
                  </CtaButton>
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
            Tell us about <SectionTitle.Em>the moment.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            We'll help you shape it — discreetly, with people who know the place. No pressure.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Plan with us
            </CtaButton>
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
