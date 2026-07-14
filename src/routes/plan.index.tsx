import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";
import { jsonLdScript, breadcrumbLd, SITE_URL } from "@/lib/jsonld";
import { PLANNING_ITINERARIES } from "@/content/planning/itineraries";
import { PLANNING_DESTINATIONS } from "@/content/planning/destinations";
import { PLAN_HUB } from "@/content/planning/hub";

const PATH = "/plan";
const URL = `${SITE_URL}${PATH}`;

// Includes the flagship 10-day itinerary that already lives outside /plan/*.
const ITINERARY_LINKS = [
  { path: "/plan/5-day-portugal-itinerary", label: "5-day Portugal itinerary", days: "5 days" },
  { path: "/plan/7-day-portugal-itinerary", label: "7-day Portugal itinerary", days: "7 days" },
  {
    path: "/itineraries/10-day-private-portugal-tour",
    label: "10-day Portugal itinerary",
    days: "10 days",
  },
  { path: "/plan/14-day-portugal-itinerary", label: "14-day Portugal itinerary", days: "14 days" },
] as const;

const PILLAR_LINKS = [
  {
    path: "/plan/portugal-wine-and-gastronomy",
    label: "Wine & gastronomy in Portugal",
    detail: "Regional cellars, family tables, vinho de talha.",
  },
] as const;

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${URL}#collection`,
  url: URL,
  name: "Portugal Trip Planning",
  description: PLAN_HUB.metaDescription,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntity: {
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems:
      ITINERARY_LINKS.length + PLANNING_DESTINATIONS.length + PILLAR_LINKS.length,
    itemListElement: [
      ...ITINERARY_LINKS.map((i, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}${i.path}`,
        name: i.label,
      })),
      ...PLANNING_DESTINATIONS.map((d, idx) => ({
        "@type": "ListItem",
        position: ITINERARY_LINKS.length + idx + 1,
        url: `${SITE_URL}${d.path}`,
        name: d.h1,
      })),
      ...PILLAR_LINKS.map((p, idx) => ({
        "@type": "ListItem",
        position: ITINERARY_LINKS.length + PLANNING_DESTINATIONS.length + idx + 1,
        url: `${SITE_URL}${p.path}`,
        name: p.label,
      })),
    ],
  },
};

export const Route = createFileRoute("/plan/")({
  head: () => ({
    meta: [
      { title: PLAN_HUB.metaTitle },
      { name: "description", content: PLAN_HUB.metaDescription },
      { property: "og:title", content: PLAN_HUB.metaTitle },
      { property: "og:description", content: PLAN_HUB.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      jsonLdScript(collectionLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: PATH },
        ]),
      ),
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <header className="pt-32 md:pt-40 pb-16 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>{PLAN_HUB.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display font-bold text-[2rem] md:text-[2.9rem] leading-[1.1] tracking-[-0.01em] text-[color:var(--charcoal)]">
            {PLAN_HUB.h1}
          </h1>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl mx-auto">
            {PLAN_HUB.standfirst}
          </p>
          <div className="mt-10">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Talk to a Travel Designer
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design a private day
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </header>

      {/* Itineraries */}
      <section className="reveal py-20 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x max-w-4xl">
          <Eyebrow>By length of trip</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Private Portugal <SectionTitle.Em>itineraries</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            {PLAN_HUB.itineraryLead}
          </p>
          <ul className="mt-10 divide-y divide-[color:var(--gold-soft)]/50 border-y border-[color:var(--gold-soft)]/50">
            {ITINERARY_LINKS.map((i) => (
              <li key={i.path}>
                <Link
                  to={i.path}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="serif text-[19px] text-[color:var(--charcoal)] group-hover:text-[color:var(--teal)] transition-colors">
                    {i.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)]">
                    {i.days} · Private · Designer-composed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Destinations */}
      <section className="reveal py-20 md:py-24 bg-[color:var(--sand)]">
        <div className="container-x max-w-4xl">
          <Eyebrow>By region</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Portugal <SectionTitle.Em>destination guides</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            {PLAN_HUB.destinationLead}
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {PLANNING_DESTINATIONS.map((d) => (
              <li key={d.slug} className="border-t border-[color:var(--gold-soft)]/50 pt-5">
                <Link to={d.path} className="group block">
                  <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
                    {d.eyebrow}
                  </span>
                  <h3 className="serif text-[20px] mt-1 text-[color:var(--charcoal)] group-hover:text-[color:var(--teal)] transition-colors">
                    {d.h1.replace(/^Planning a Private Trip to /, "")}
                  </h3>
                  <p className="mt-2 text-[13px] text-[color:var(--charcoal-soft)] leading-relaxed line-clamp-3">
                    {d.standfirst}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pillars */}
      <section className="reveal py-20 bg-[color:var(--ivory)]">
        <div className="container-x max-w-4xl">
          <Eyebrow>By interest</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Planning <SectionTitle.Em>pillars</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            {PLAN_HUB.pillarLead}
          </p>
          <ul className="mt-10 divide-y divide-[color:var(--gold-soft)]/50 border-y border-[color:var(--gold-soft)]/50">
            {PILLAR_LINKS.map((p) => (
              <li key={p.path}>
                <Link
                  to={p.path}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="serif text-[19px] text-[color:var(--charcoal)] group-hover:text-[color:var(--teal)] transition-colors">
                    {p.label}
                  </span>
                  <span className="text-[13px] text-[color:var(--charcoal-soft)] sm:text-right sm:max-w-md">
                    {p.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Outro */}
      <section className="reveal py-16 bg-[color:var(--sand)] border-t border-[color:var(--border)]">
        <div className="container-x max-w-2xl text-center">
          <SectionTitle as="h2" size="compact">
            {PLAN_HUB.outroTitle}
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            {PLAN_HUB.outroBody}
          </p>
          <div className="mt-8">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Talk to a Travel Designer
              </CtaButton>
              <CtaButton to="/experiences" variant="ghost">
                Browse Signature days
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
