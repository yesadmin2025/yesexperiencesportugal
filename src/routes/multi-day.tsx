import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { TRAVEL_DESIGNER_FAQ } from "@/content/seo-faq";
import { SiteLayout } from "@/components/SiteLayout";
import { MessageCircle, Compass, MapPin, Calendar } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { whatsappHref } from "@/components/WhatsAppFab";
import imgTroiaBeach from "@/assets/tours/troia-comporta/beach.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";
import pageCover from "@/assets/travel-file/cover.jpg";
import pageRoute from "@/assets/travel-file/route.jpg";
import pageDay from "@/assets/travel-file/day.jpg";
import pageReservations from "@/assets/travel-file/reservations.jpg";
import pageAccommodations from "@/assets/travel-file/accommodations.jpg";

export const Route = createFileRoute("/multi-day")({
  head: () => ({
    meta: [
      { title: "Travel Designer — Private Portugal Journeys | YES Experiences" },
      {
        name: "description",
        content:
          "A full private Portugal journey, written around you. Any length, any shape — composed by a designer, supported on the ground every day.",
      },
      { property: "og:title", content: "Travel Designer — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Honeymoons, family journeys, multi-region itineraries — composed by a designer, supported on the ground.",
      },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgTroiaBeach}` },
      { property: "twitter:image", content: `https://yesexperiencesportugal.com${imgTroiaBeach}` },
      { property: "og:url", content: "https://yesexperiencesportugal.com/multi-day" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/multi-day" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Travel Designer", path: "/multi-day" },
        ]),
      ),
    ],
  }),
  component: MultiDayPage,
});

const BLOCKS = [
  {
    eyebrow: "How it connects",
    title: "Days that lead into each other.",
    emotional:
      "Not a checklist of regions — a real rhythm, with the right pacing between each day.",
    practical:
      "Any length, from a long weekend to a multi-week journey · realistic driving times · curated overnight stops · transitions designed around your pace.",
    local: "Designed in conversation with a local team — never a copy-paste itinerary.",
    image: imgTroiaBeach,
    icon: Calendar,
  },
  {
    eyebrow: "Where it goes",
    title: "Across Portugal, with intention.",
    emotional:
      "Lisbon, Arrábida, Alentejo, Douro — chosen because they belong in your story, not because they're on a list.",
    practical:
      "Region selection based on your interests, season and time available. We tell you honestly what fits and what doesn't.",
    local:
      "Routed by people who know which villages welcome guests and which roads are worth the drive.",
    image: imgSintraEstates,
    icon: MapPin,
  },
  {
    eyebrow: "Who's behind it",
    title: "Local support, every day.",
    emotional:
      "You're never on your own. There's always someone reachable when something needs to shift.",
    practical:
      "Daily local contact · in-country adjustments · transport coordination · trusted partners on the ground.",
    local:
      "We handle the moving parts so the trip feels effortless — even when plans change mid-journey.",
    image: imgArrabidaWineLunch,
    icon: Compass,
  },
];

function MultiDayPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Travel Designer</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            A full private journey, <SectionTitle.Em>written around you.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            Any length, any shape — honeymoons, family journeys and multi-region itineraries,
            composed by a designer, supported on the ground every day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Begin with a designer
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

      {/* Travel Designer sample — same dossier shown on the homepage */}
      <section className="py-14 md:py-20 bg-[color:var(--ivory)] border-y border-[color:var(--border)] reveal">
        <div className="container-x max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
            <Eyebrow flank>Delivered as a travel file</Eyebrow>
            <SectionTitle size="compact">
              A journey you can <SectionTitle.Em>hold in your hands.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              Every multi-day design is delivered as a curated dossier — days, stays, route and local contacts in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[pageCover, pageRoute, pageReservations, pageDay, pageAccommodations].map((src, i) => (
              <div
                key={src}
                className={`overflow-hidden border border-[color:var(--border)] shadow-[0_12px_30px_-16px_rgba(46,46,46,0.28)] ${i === 0 ? "col-span-2 md:col-span-2 row-span-2" : ""}`}
              >
                <img
                  src={src}
                  alt={`Travel file page ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700"
                />
              </div>
            ))}
          </div>
          <p className="mt-5 text-center font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
            From one of our bespoke journeys — names removed
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-2xl text-center">
          <SectionTitle size="compact">
            Begin with <SectionTitle.Em>a designer.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            Tell us what you have in mind and we'll shape the journey with you, day by day.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Begin with a designer
            </CtaButton>
            <a
              href={whatsappHref("Hi! I'm interested in a multi-day Travel Designer journey with YES Experiences.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] text-[color:var(--charcoal)] px-6 py-3 text-sm tracking-wide transition-all"
            >
              <MessageCircle size={14} aria-hidden="true" /> Talk to a Local
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
