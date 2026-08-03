import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { breadcrumbLd, jsonLdScript, travelDesignerServiceLd } from "@/lib/jsonld";
import { ServiceCrossLinks } from "@/components/entity/ServiceCrossLinks";
import ogImg from "@/assets/hero-coast.jpg";

const CANONICAL = "https://yesexperiencesportugal.com/portugal-travel-designer";
const TITLE = "Portugal Travel Designer | Custom Private Journeys";
const DESC =
  "Design a private Portugal journey with local experts, from tailored day experiences and wine tours to custom multi-day itineraries across the country.";
const OG_IMAGE = `https://yesexperiencesportugal.com${ogImg}`;

export const Route = createFileRoute("/portugal-travel-designer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Portugal Travel Designer — private custom journeys" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Portugal Travel Designer", path: "/portugal-travel-designer" },
        ]),
      ),
      jsonLdScript(
        travelDesignerServiceLd({
          path: "/portugal-travel-designer",
          name: "Portugal Travel Designer — bespoke private itinerary planning",
          description:
            "Personalized Portugal itinerary planning by a local travel designer: complete multi-day private journeys across the country, distinct from a single private day tour. Custom Portugal trips, honeymoons, family journeys and longer bespoke travel planning from Lisbon and Sesimbra to Alentejo, central Portugal, the Douro and the north.",
        }),
      ),
    ],
  }),
  component: PortugalTravelDesignerPage,
});

function Section({
  eyebrow,
  title,
  children,
  tone = "ivory",
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  tone?: "ivory" | "sand";
}) {
  return (
    <section
      className={`reveal py-14 md:py-20 ${tone === "sand" ? "bg-[color:var(--sand)]" : "bg-[color:var(--ivory)]"}`}
    >
      <div className="container-x max-w-3xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && (
          <SectionTitle as="h2" size="default" spacing="loose">
            {title}
          </SectionTitle>
        )}
        <div className="mt-6 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

function PortugalTravelDesignerPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="reveal pt-28 md:pt-36 pb-10 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Portugal Travel Designer</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Portugal Travel Designer
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
        </div>
      </section>

      <Section tone="ivory">
        <p>
          Portugal is not one experience repeated from north to south. Each region has its own
          rhythm, food, landscapes and traditions, and the right journey depends on far more than a
          list of famous places.
        </p>
        <p>
          As a Portugal travel designer, YES Experiences Portugal creates private days and longer
          journeys around the people travelling: what they are curious about, how quickly they like
          to move and what they want to remember when the trip is over.
        </p>
        <p>
          Some guests begin with one of our curated{" "}
          <Link
            to="/experiences"
            className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)]"
          >
            Signatures
          </Link>
          . Others adapt an existing experience or use the{" "}
          <Link
            to="/experience-studio"
            className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)]"
          >
            Studio
          </Link>{" "}
          to build something more personal.{" "}
          <Link
            to="/multi-day"
            className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)]"
          >
            Multi-day journeys
          </Link>{" "}
          can connect different regions while preserving the same private, flexible approach.
        </p>
      </Section>

      <Section
        tone="sand"
        eyebrow="Three ways to shape your Portugal"
        title="Signature, Tailor, Studio."
      >
        <p>
          Our Signatures are complete private experiences designed around a particular region, story
          or tradition. They are ready to reserve, but still feel personal because the guide and
          vehicle are dedicated exclusively to your party.
        </p>
        <p>
          Tailor is for travellers who like the structure of a Signature but want to adjust part of
          the day. A stop may be changed, an activity added or the pace adapted without rebuilding
          the entire journey from the beginning.
        </p>
        <p>
          Studio begins with the traveller rather than with a fixed itinerary. Interests, regions,
          food, wine, coast, heritage and hands-on experiences can be brought together into a day
          designed around individual preferences.
        </p>
      </Section>

      <Section
        tone="ivory"
        eyebrow="From one private day to a complete journey"
        title="A route that makes geographical and emotional sense."
      >
        <p>
          Travel design may begin with a single day from Lisbon or extend across several regions of
          Portugal.
        </p>
        <p>
          A private itinerary can connect Lisbon and Arrábida with Alentejo, the Atlantic coast,
          central Portugal, the Douro or the north. The purpose is not to fit as many places as
          possible into each day. It is to create a route that makes geographical and emotional
          sense.
        </p>
        <p>
          Driving time, meal times, local opening hours and the energy of the travellers all
          influence the final design. A good itinerary leaves room for discovery rather than
          treating Portugal as a collection of boxes to be completed.
        </p>
      </Section>

      <Section
        tone="sand"
        eyebrow="Designed locally, operated personally"
        title="A licensed local operator, not a reseller."
      >
        <p>A beautiful itinerary is only useful when it can work in real life.</p>
        <p>
          YES Experiences Portugal is a licensed Portuguese tour operator based in Sesimbra. The
          same local knowledge used to design a journey also informs the practical details:
          realistic routes, trusted partners, appropriate timing and alternatives when weather or
          availability changes.
        </p>
        <p>
          We work with wineries, artisans, restaurants, boat operators and local hosts across
          different regions. This operational involvement allows the journey to remain personal
          without becoming uncertain or improvised.
        </p>
        <p className="text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/80">
          Licensed Portuguese tour operator · RNAAT nº 31/2023 · Based in Sesimbra, Portugal.
        </p>
      </Section>

      <Section
        tone="ivory"
        eyebrow="Who travel design is for"
        title="Privacy and flexibility, without the coordination."
      >
        <p>
          Travel design is especially valuable for travellers who want privacy and flexibility but
          do not want to spend weeks coordinating every reservation themselves.
        </p>
        <p>
          It suits couples, families, groups of friends, special occasions and guests with very
          specific interests. It is also useful when different people in the same party want
          different things from the journey.
        </p>
        <p>
          The result does not need to feel complicated. It should simply feel considered: the right
          places, in the right order, with enough time to experience them properly.
        </p>
      </Section>

      <ServiceCrossLinks
        tone="ivory"
        eyebrow="Related YES services"
        title="Where travel design sits among our services."
        links={[
          {
            to: "/experience-studio",
            label: "Design a private day in the Experience Studio",
            description:
              "Build your own Portugal day online: choose the region, stops and rhythm and watch the route and pricing evolve, then reserve directly or ask for a local review.",
          },
          {
            to: "/multi-day",
            label: "Private multi-day tours in Portugal",
            description:
              "The multi-day product itself — several regions connected into one private journey with the same guide and vehicle.",
          },
          {
            to: "/trade",
            label: "Portugal ground partner for travel advisors and agencies",
            description:
              "Advisors, travel designers and agencies planning FIT travel in Portugal work with us directly for local itinerary support and private guiding.",
          },
          {
            to: "/corporate",
            label: "Corporate and incentive travel in Portugal",
            description:
              "Company off-sites, incentives and executive retreats coordinated across the country.",
          },
        ]}
      />

      <section className="reveal py-16 md:py-20 bg-[color:var(--sand)]">
        <div className="container-x max-w-2xl text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CtaButton to="/experience-studio" variant="primary">
              Open the Studio
            </CtaButton>
            <CtaButton to="/experiences" variant="ghost">
              Explore our Signatures
            </CtaButton>
          </div>
          <p className="mt-6 text-[13px] tracking-[0.02em] text-[color:var(--charcoal-soft)]">
            <Link
              to="/multi-day"
              className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors"
            >
              Plan a multi-day journey →
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
