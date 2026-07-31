import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { ServiceCrossLinks } from "@/components/entity/ServiceCrossLinks";
import { Scene } from "@/components/motion/Scene";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import founderAsset from "@/assets/about-founder-wine-experience.jpg.asset.json";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import {
  BASED_IN_SHORT,
  CANCELLATION,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  PHONE_DISPLAY,
  whatsappUrl,
} from "@/config/business-nap";

const TITLE = "About YES Experiences Portugal | Local Travel Designers";
const DESCRIPTION =
  "Meet YES Experiences Portugal, a licensed private tour operator and local travel design company creating personal journeys from Lisbon and Sesimbra.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/about" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${founderAsset.url}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "YES Experiences Portugal — founder-led private travel",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${founderAsset.url}` },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/about" },
      // Reciprocal hreflang — the PT twin at /pt/about points back with the
      // identical set. Emitted from the shared helper so both stay in sync.
      ...localeAlternateLinks("/about"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ),
    ],
  }),

  component: Page,
});

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="reveal pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <ParallaxLayer amount="sm">
            <Scene>
              <div className="scene-atmosphere">
                <Eyebrow flank>About YES</Eyebrow>
              </div>
              <div className="scene-title">
                <SectionTitle as="h1" size="anchor" spacing="loose">
                  About YES Experiences Portugal:{" "}
                  <SectionTitle.Em>local travel designers</SectionTitle.Em>.
                </SectionTitle>
              </div>
              <p className="scene-body mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
                YES Experiences Portugal is a licensed Portuguese private tour operator, founder-led
                since 2022 and built around one idea: Portugal should feel personal, local and
                genuinely yours.
              </p>
              <p className="scene-body mt-4 max-w-2xl mx-auto text-sm text-[color:var(--charcoal-soft)]/85 leading-relaxed">
                Private days, live-designed experiences and full journeys, created from real routes,
                real guests and real local knowledge.
              </p>
            </Scene>
          </ParallaxLayer>
        </div>
      </section>

      {/* Created from real travel */}
      <section className="reveal py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Created from real travel</Eyebrow>
          <SectionTitle as="h2" size="default">
            Built from the road, <SectionTitle.Em>not a template</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              YES did not begin as an agency concept, a marketplace idea or a travel-tech trend.
            </p>
            <p>
              It began on the road, guiding guests through Portugal and seeing the same need appear
              again and again: travellers wanted more than another fixed tour. They wanted freedom,
              but not confusion. They wanted to shape the day themselves, while still feeling guided
              by someone local.
            </p>
            <p>They wanted to understand the route, the rhythm and the price before committing.</p>
            <p>That is where the Experience Studio came from.</p>
          </div>
        </div>
      </section>

      {/* Founder-built */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-[1.15fr_1fr] gap-14 items-start">
          <div>
            <Eyebrow>Founder-built</Eyebrow>
            <SectionTitle as="h2" size="default">
              Built by the person <SectionTitle.Em>who saw the problem</SectionTitle.Em>.
            </SectionTitle>
            <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              <p>
                The Experience Studio was not added because "custom travel" sounded good on a
                website.
              </p>
              <p>
                It was built because, after years designing and guiding private guests across
                Portugal, the same need became impossible to ignore: people wanted to choose,
                compare, shape and book a private day without endless forms, waiting or
                back-and-forth emails.
              </p>
              <p>The idea was too specific to hand over as a standard agency brief.</p>
            </div>

            <figure className="mt-10 lg:hidden">
              <img
                src={founderAsset.url}
                alt="Nídia Almeida hosting a private wine experience with YES Experiences Portugal guests."
                loading="lazy"
                decoding="async"
                sizes="100vw"
                className="w-full aspect-[4/3] object-cover"
              />
              <figcaption className="mt-3 text-xs text-[color:var(--charcoal-soft)]/80 leading-relaxed italic">
                Nídia Almeida, founder of YES Experiences Portugal, hosting a private wine
                experience in Portugal.
              </figcaption>
            </figure>

            <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              <p>
                To make it real, the founder learned to translate travel experience into product
                structure, booking logic and digital flow — how a guest chooses, how a route
                changes, how a private day is priced, and how all of that could become a live
                experience-building system.
              </p>
              <p>
                The website, Studio flow and booking model were conceived, structured, written and
                built in-house, shaped from real conversations, itinerary changes, guest hesitation
                and operational constraints.
              </p>
              <p>
                That is why YES is not just a catalogue of tours. It is a founder-built private
                travel platform, created from the road and still refined through every booking.
              </p>
            </div>
          </div>

          <figure className="hidden lg:block lg:sticky lg:top-28">
            <img
              src={founderAsset.url}
              alt="Nídia Almeida hosting a private wine experience with YES Experiences Portugal guests."
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full aspect-[4/3] object-cover"
            />
            <figcaption className="mt-3 text-xs text-[color:var(--charcoal-soft)]/80 leading-relaxed italic">
              Nídia Almeida, founder of YES Experiences Portugal, hosting a private wine experience
              in Portugal.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Founder-led */}
      <section className="reveal py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Founder-led</Eyebrow>
          <SectionTitle as="h2" size="default">
            Designed with care. <SectionTitle.Em>Delivered by trusted locals</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              YES was created by Nídia Almeida, a Portuguese host and experience designer, after
              years of designing and leading private experiences across Portugal.
            </p>
            <p>
              Every Signature day, Studio composition and Travel Designer journey begins with local
              knowledge, real routes and carefully chosen details. The experiences are then
              delivered with a trusted circle of local guides, drivers, wineries, boats,
              restaurants, hosts and partners across the country.
            </p>
            <p>
              From Lisbon, Sintra and Arrábida to the Alentejo, Douro, Algarve and Atlantic coast,
              the principle stays the same: private Portugal, designed with intention and delivered
              by people who know the places they are showing.
            </p>
            <p>
              This is not anonymous reselling. It is not another operator's coach tour with a
              different logo. Read more about{" "}
              <a
                href="/portugal-travel-designer"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                our approach to Portugal travel design
              </a>
              ,{" "}
              <a
                href="/studio-v3"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                build through the YES Studio
              </a>{" "}
              or explore{" "}
              <a
                href="/multi-day"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                private multi-day journeys
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* What we create */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x">
          <Eyebrow flank>What we create</Eyebrow>
          <SectionTitle as="h2" size="default">
            Private days, live-designed experiences{" "}
            <SectionTitle.Em>and full journeys</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Signature Experiences
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Ready private days shaped from real routes, trusted partners and guest feedback.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Experience Studio
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Design a private day in real time, choose the rhythm and route, see the price live
                and book securely.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Travel Designer
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Full Portugal journeys, multi-day itineraries, honeymoons, family trips,
                celebrations and complex private travel.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Moments &amp; Corporate
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Proposals, birthdays, anniversaries, incentives, client hospitality and private
                group days.
              </p>
            </div>
          </div>
          <p className="mt-10 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            Different formats. Same principle: Portugal should be designed around the people living
            it.
          </p>
        </div>
      </section>

      {/* Credentials & trust */}
      <section className="reveal py-16">
        <div className="container-x">
          <Eyebrow flank>Credentials &amp; trust</Eyebrow>
          <SectionTitle as="h2" size="default">
            Licensed, insured <SectionTitle.Em>and personally accountable</SectionTitle.Em>.
          </SectionTitle>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Licence
              </div>
              <p className="mt-2 font-display text-lg">{LICENSE_LABEL}</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Registered Portuguese tourism operator (Registo Nacional dos Agentes de Animação
                Turística).
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Founded
              </div>
              <p className="mt-2 font-display text-lg">2022</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Based in Sesimbra, designing private journeys across Portugal.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Reviews
              </div>
              <p className="mt-2 font-display text-lg">700+ five-star</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Verified guest reviews across Tripadvisor, Viator, Google, GetYourGuide and other
                major travel platforms.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Insurance
              </div>
              <p className="mt-2 font-display text-lg">Civil liability</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Vehicles, guests and operations covered under Portuguese tourism law.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How we work + policies */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-2 gap-14">
          <div>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Private, local and accountable from start to finish.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Private only.</strong> No shared
                coaches, no strangers in the car.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Designed around you.</strong>{" "}
                Choose a Signature, shape a Studio day in real time, or let a Travel Designer
                compose the full journey.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Instant reservation.</strong> Most
                Signature days and Studio compositions confirm in minutes through secure checkout.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Hotel pickup included.</strong>{" "}
                Available from Lisbon, Cascais, Estoril, Sintra, Sesimbra, Setúbal and other
                locations depending on the experience.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Legal base, wider reach.</strong>{" "}
                Registered in Sesimbra, with most pickups from the Lisbon area, and operating
                private experiences across Portugal — Sintra, Arrábida, Alentejo, the Vicentine
                Coast, central Portugal and beyond.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Local replies, fast.</strong>{" "}
                WhatsApp and email replies usually within the hour when the team is available.
              </li>
            </ul>
          </div>

          <div>
            <Eyebrow>Policies, briefly</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Clear, fair, written down.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Cancellation (Signature)</strong> —{" "}
                {CANCELLATION.signature.en}
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">
                  Cancellation (Studio, Travel Designer, Corporate, Moments)
                </strong>{" "}
                — {CANCELLATION.custom.en}
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Weather</strong> — outdoor stops
                can be swapped on the day at no cost when safety or comfort requires it.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Privacy</strong> — we never sell or
                share guest data. See our{" "}
                <a href="/privacy" className="underline">
                  privacy policy
                </a>
                .
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Terms</strong> —{" "}
                <a href="/terms" className="underline">
                  full terms &amp; conditions
                </a>{" "}
                are available before booking.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="reveal py-20 text-center">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow flank>Talk to YES</Eyebrow>
          <SectionTitle as="h2" size="default">
            Talk directly to <SectionTitle.Em>a local designer</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            Email{" "}
            <a href={EMAIL_HREF} className="underline">
              {EMAIL}
            </a>
            <br />
            WhatsApp{" "}
            <a href={whatsappUrl()} className="underline">
              {PHONE_DISPLAY}
            </a>
            <br />
            {BASED_IN_SHORT}
          </p>
          <p className="mt-5 serif italic text-xl text-[color:var(--teal)]">
            Portugal, designed around you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <CtaButton to="/experiences" variant="primary">
              Start Your Private Experience
            </CtaButton>
            <CtaButton to="/studio-v3" variant="ghost">
              Open the Studio
            </CtaButton>
          </div>
        </div>
      </section>
      <ServiceCrossLinks
        tone="ivory"
        eyebrow="What we do"
        title="Six distinct services, one local team."
        links={[
          {
            to: "/experiences",
            label: "Signature Experiences across Portugal",
            description:
              "Curated private days, ready to reserve with a dedicated guide and vehicle.",
          },
          {
            to: "/studio-v3",
            label: "Experience Studio — build your own Portugal experience",
            description:
              "Design a private day online and watch the route and pricing evolve before you reserve.",
          },
          {
            to: "/portugal-travel-designer",
            label: "Portugal travel designer for complete journeys",
            description:
              "Custom multi-day private itineraries across the country, not a single day trip.",
          },
          {
            to: "/proposal-in-portugal",
            label: "Moments — proposals, anniversaries and celebrations",
            description: "Private occasions planned discreetly, anywhere we operate.",
          },
          {
            to: "/corporate",
            label: "Corporate events, incentives and retreats",
            description:
              "From leadership teams to corporate groups of 100+, coordinated across Portugal.",
          },
          {
            to: "/trade",
            label: "Travel advisors, designers and agency partners",
            description:
              "Local Portugal supplier and destination support for FIT travel and private guiding.",
          },
        ]}
      />
    </SiteLayout>
  );
}
