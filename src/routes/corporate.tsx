import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { MessageCircle, Users, Compass, ClipboardCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { FounderByline } from "@/components/ui/FounderByline";
import { CORPORATE_FAQ } from "@/content/seo-faq";
import imgFatimaNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";

const TITLE = "Corporate and Private Group Experiences in Portugal | YES";
const DESCRIPTION =
  "Private corporate days, team retreats and group experiences across Portugal — designed and hosted by a licensed local operator. Transport, guides and venues coordinated end to end.";


export const Route = createFileRoute("/corporate")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      {
        property: "twitter:image",
        content: `https://yesexperiencesportugal.com${imgFatimaNazare}`,
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/corporate" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/corporate" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Team Building & Corporate Retreats", path: "/corporate" },
        ]),
      ),
      jsonLdScript(faqPageLd(CORPORATE_FAQ)),
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
      "Private groups of any size, scoped around the right transport, guides, suppliers and timing · invoice & DMC support · designed around your goals.",
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
    local: "Coordinated by a local host who knows how each piece of the day connects.",
    image: imgSintraEstates,
    icon: Compass,
  },
  {
    eyebrow: "Client Hosting & VIP",
    title: "Quiet, considered, fully discreet.",
    emotional: "When it matters who's in the room and how the day feels — we shape it accordingly.",
    practical: "Small groups · private settings · careful pacing · NDAs welcome.",
    local: "Planned end to end with our local team — every detail confirmed before the day.",
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
          <Eyebrow flank>Corporate Retreats</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Team building in Portugal, <SectionTitle.Em>designed by locals.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            Private corporate retreats, team building days, incentives and executive off-sites
            across Portugal — from Lisbon and Sintra to the Arrábida coast, the Alentejo, the Douro
            and beyond, with transport, guides and venues coordinated end to end so the day feels{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">effortless</strong>, not
            arranged.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Plan a Group Experience
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
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-2xl">
          <Eyebrow className="mb-4">Questions organisers ask</Eyebrow>
          <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-8">
            Before the proposal.
          </h2>
          <dl className="space-y-8">
            {CORPORATE_FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-display font-semibold text-[1.05rem] md:text-[1.15rem] text-[color:var(--charcoal)] mb-3">
                  {f.q}
                </dt>
                <dd className="text-[15px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.75]">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
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
            Real driving times, real venues, real partners. We shape the proposal around what your
            team actually needs — never a copy-paste template.
          </p>
          <FounderByline
            className="mt-8"
            quote="Every corporate day is scoped around your team's goals — never a copy-paste template."
          />

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Request a Proposal
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
