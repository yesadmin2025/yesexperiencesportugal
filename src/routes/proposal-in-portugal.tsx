import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, faqPageLd, jsonLdScript, momentsServiceLd } from "@/lib/jsonld";
import { ServiceCrossLinks } from "@/components/entity/ServiceCrossLinks";
import { SiteLayout } from "@/components/SiteLayout";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { MessageCircle, Heart, Sparkles, Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CinematicEditorialImage } from "@/components/ui/ResponsiveEditorialImage";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";

import { PROPOSAL_SERVICE_IMAGES } from "@/content/editorial-service-images";
import { useEditorialOverrides } from "@/lib/editorial-overrides";

import { PROPOSAL_FAQ } from "@/content/seo-faq";
import imgRomantic from "@/assets/exp-romantic.jpg";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/proposal-in-portugal";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Proposal & Celebration Experiences in Portugal | YES";
const DESCRIPTION =
  "Private proposals, anniversaries and celebrations across Portugal, discreetly designed by a local team with venues, timing and details coordinated.";

export const Route = createFileRoute("/proposal-in-portugal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${BASE_URL}${imgRomantic}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Plan a proposal in Portugal — private moments, discreetly designed",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: `${BASE_URL}${imgRomantic}` },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Proposal in Portugal", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(momentsServiceLd({ path: PAGE_PATH })),
      jsonLdScript(faqPageLd(PROPOSAL_FAQ)),
    ],
  }),
  component: ProposalInPortugalPage,
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
    image: PROPOSAL_SERVICE_IMAGES[0],
    icon: Heart,
    cta: "Plan a Proposal",
  },
  {
    eyebrow: "Celebrations",
    title: "For days worth remembering.",
    emotional:
      "Birthdays, anniversaries, honeymoons or family moments — shaped around your rhythm, your people and the way you want to feel Portugal.",
    practical: "Private host · any group size · multi-activity planning · flexible scheduling.",
    local: "Coordinated by a local host who knows how each piece of the day connects.",
    image: PROPOSAL_SERVICE_IMAGES[1],
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
    image: PROPOSAL_SERVICE_IMAGES[2],
    icon: Users,
    cta: "Plan a Private Day",
  },
];

export function ProposalInPortugalPage() {
  useMarketingMotion();
  const serviceImages = useEditorialOverrides(
    "proposal_services",
    PROPOSAL_SERVICE_IMAGES.map((image) => ({ ...image, caption: "" })),
  );
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Proposal in Portugal</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            A proposal in Portugal, <SectionTitle.Em>planned discreetly.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            A private moment, shaped end to end by a local team — with the setting, timing and
            surprise handled quietly on your behalf.
          </p>
          <div className="mt-8 flex justify-center">
            <CtaButton to="/contact" variant="primary">
              Plan a Proposal
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
            const image = { ...b.image, ...serviceImages[i] };
            return (
              <article
                key={b.eyebrow}
                className={`reveal-stagger grid lg:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="group overflow-hidden bg-[color:var(--sand)] aspect-[4/5] md:aspect-[5/6]">
                  {i === 0 ? (
                    <ParallaxLayer amount="md" className="h-full w-full">
                      <CinematicEditorialImage
                        image={image}
                        priority
                        className="h-full w-full"
                        phase="a"
                      />
                    </ParallaxLayer>
                  ) : (
                    <CinematicEditorialImage
                      image={image}
                      priority={false}
                      className="h-full w-full"
                      phase={i === 1 ? "b" : "c"}
                    />
                  )}
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

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-2xl">
          <Eyebrow className="mb-4">Questions couples ask</Eyebrow>
          <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-8">
            Before the moment.
          </h2>
          <dl className="space-y-8">
            {PROPOSAL_FAQ.map((f) => (
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
      <ServiceCrossLinks
        tone="ivory"
        eyebrow="Related YES services"
        title="Moments sit inside a wider set of private services."
        links={[
          {
            to: "/experience-studio",
            label: "Design the surrounding private day in the Studio",
            description:
              "Build the day around the moment — region, stops and rhythm, with the route and pricing updating as you choose.",
          },
          {
            to: "/portugal-travel-designer",
            label: "Plan a longer celebration journey across Portugal",
            description:
              "Honeymoons, anniversaries and milestone trips composed as complete multi-day private itineraries.",
          },
          {
            to: "/corporate",
            label: "Company celebrations and client hosting",
            description: "Private celebrations for teams and clients, coordinated across Portugal.",
          },
        ]}
      />
    </SiteLayout>
  );
}
