import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { MessageCircle, Heart, Sparkles, Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { PROPOSAL_LANDSCAPES } from "@/components/ui/AmbientLandscapeStrip";
import { AmbientLandscapeReveal } from "@/components/ui/AmbientLandscapeReveal";


import { PROPOSAL_FAQ } from "@/content/seo-faq";
import imgRomantic from "@/assets/exp-romantic.jpg";
import coupleVineyardAsset from "@/assets/owner-photos/couple-vineyard.jpeg.asset.json";
import wineCheersAsset from "@/assets/owner-photos/wine-cheers-arch.jpeg.asset.json";
import tastingCakeAsset from "@/assets/owner-photos/tasting-cake-moment.jpeg.asset.json";
const imgCoupleVineyard = coupleVineyardAsset.url;
const imgWineCheers = wineCheersAsset.url;
const imgTastingCake = tastingCakeAsset.url;

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/proposal-in-portugal";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Proposal in Portugal — Private Moments, Planned Discreetly";
const DESCRIPTION =
  "Plan a proposal in Portugal — Sintra cliffs, Arrábida coves, Lisbon rooftops. A private moment shaped end to end by a local team, discreet from first email to last detail.";

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
      { property: "og:image:alt", content: "Plan a proposal in Portugal — private moments, discreetly designed" },
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
    image: imgCoupleVineyard,
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
    image: imgWineCheers,
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
    image: imgTastingCake,
    icon: Users,
    cta: "Plan a Private Day",
  },
];

export function ProposalInPortugalPage() {
  useMarketingMotion();
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
            return (
              <article
                key={b.eyebrow}
                className={`reveal-stagger grid lg:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="overflow-hidden">
                  <img
                    src={b.image}
                    alt={b.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    sizes="(min-width: 1024px) 50vw, 100vw"
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

      <AmbientLandscapeReveal
        eyebrow="Where it can happen"
        title={<>The settings we <SectionTitle.Em>work with.</SectionTitle.Em></>}
        intro="Cliffs at sunset, a quiet cove, a private terrace. Real places along Portugal's Atlantic coast — chosen for the moment, never off a menu."
        photos={PROPOSAL_LANDSCAPES}
        moduleKey="proposal_ambient"
      />

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
