import { socialImageMeta } from "@/lib/seo";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { PORTUGAL_REGION_GUIDES } from "@/content/portugal-region-guides";
import douroImage from "@/assets/drift/dawn-douro.jpg";
import { DirectAnswer } from "@/components/DirectAnswer";

const title = "Best Places to Visit in Portugal, Region by Region";
const description = "The best places to visit in Portugal, region by region: Porto and the Douro, Lisbon and Sintra, Évora, the Algarve, Madeira and the Azores — with local guides.";
const url = "https://yesexperiencesportugal.com/regions-of-portugal";

export const Route = createFileRoute("/regions-of-portugal")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...socialImageMeta(),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Regions of Portugal", path: "/regions-of-portugal" },
        ]),
      ),
    ],
  }),
  component: RegionsPage,
});

const chapters = [
  { name: "The North", note: "Porto, the Douro and the green Minho", slugs: ["porto-and-the-douro-valley-guide", "minho-geres-braga-guimaraes-guide"] },
  { name: "Centro", note: "The central coast, Coimbra and the high mountains", slugs: ["aveiro-and-the-central-coast-guide", "serra-da-estrela-guide", "leiria-and-the-pine-coast-guide"] },
  { name: "Lisbon & the coast", note: "City streets, Sintra and the Atlantic south of the Tagus", slugs: [] },
  { name: "Alentejo", note: "Évora, cork country, Comporta and the Atlantic coast", slugs: ["marvao-castelo-de-vide-guide"] },
  { name: "Algarve", note: "The western cliffs and the Ria Formosa lagoon", slugs: ["western-algarve-lagos-sagres-guide", "eastern-algarve-ria-formosa-tavira-guide"] },
  { name: "Madeira", note: "Atlantic island landscapes and levada paths", slugs: ["madeira-travel-guide"] },
  { name: "The Azores", note: "Volcanic islands, crater lakes and ocean crossings", slugs: ["azores-sao-miguel-pico-guide"] },
] as const;

function RegionsPage() {
  return (
    <SiteLayout>
      <main>
        <header className="bg-[color:var(--ivory)] pb-12 pt-28 md:pb-20 md:pt-36">
          <div className="container-x max-w-4xl">
            <Eyebrow>Portugal · Place by place</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">Regions of <SectionTitle.Em>Portugal</SectionTitle.Em></SectionTitle>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[color:var(--charcoal-soft)]">From the Douro terraces to the Atlantic islands, each region asks for a different pace. Choose a place, then follow the local stories that bring it into focus.</p>
            <DirectAnswer>
              The best places to visit in Portugal are Lisbon and Sintra, Porto and the Douro Valley, Évora and the Alentejo, the Algarve coast, and the islands of Madeira and the Azores. A first trip usually pairs Lisbon with Porto; a longer one adds the Alentejo and the Algarve.
            </DirectAnswer>
            <p className="mt-5 text-sm text-[color:var(--charcoal-soft)]">
              Short on time? See the <Link to="/day-trips-from-lisbon" className="text-[color:var(--teal)] underline underline-offset-4">best day trips from Lisbon</Link> or our <Link to="/how-many-days-in-portugal" className="text-[color:var(--teal)] underline underline-offset-4">guide to how many days you need</Link>.
            </p>
          </div>
        </header>
        <figure className="container-x max-w-6xl">
          <img src={douroImage} alt="Morning light across the Douro Valley" width={1600} height={900} loading="lazy" fetchPriority="low" decoding="async" className="aspect-[16/9] w-full object-cover md:aspect-[18/8]" />
          <figcaption className="mt-2 text-xs text-[color:var(--charcoal-soft)]">The Douro Valley · Northern Portugal</figcaption>
        </figure>
        <div className="container-x max-w-6xl py-16 md:py-24">
          {chapters.map((chapter, index) => {
            const guides = chapter.slugs.map((slug) => PORTUGAL_REGION_GUIDES.find((guide) => guide.slug === slug)).filter((guide) => guide !== undefined);
            return (
              <section key={chapter.name} className="grid gap-5 border-t border-[color:var(--border)] py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-12 md:py-14">
                <div>
                  <Eyebrow>{String(index + 1).padStart(2, "0")} / 07</Eyebrow>
                  <h2 className="mt-4 font-serif text-3xl text-[color:var(--charcoal)] md:text-4xl">{chapter.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">{chapter.note}</p>
                </div>
                <div className="self-center divide-y divide-[color:var(--border)]">
                  {guides.map((guide) => (
                    <Link key={guide.slug} to="/local-stories/$slug" params={{ slug: guide.slug }} className="flex min-h-16 items-center justify-between gap-5 py-3 text-sm text-[color:var(--teal)] hover:text-[color:var(--charcoal)]">
                      <span>{guide.h1}</span><span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                  {chapter.name === "Lisbon & the coast" && <Link to="/private-tours-sintra-cascais" className="flex min-h-16 items-center justify-between gap-5 py-3 text-sm text-[color:var(--teal)] hover:text-[color:var(--charcoal)]">Sintra & Cascais <span aria-hidden="true">↗</span></Link>}
                  {chapter.name === "Alentejo" && (
                    <>
                      <Link to="/local-stories/$slug" params={{ slug: "troia-comporta-guide" }} className="flex min-h-16 items-center justify-between gap-5 py-3 text-sm text-[color:var(--teal)] hover:text-[color:var(--charcoal)]">
                        Comporta & Tróia — local guide <span aria-hidden="true">↗</span>
                      </Link>
                      <Link to="/private-tours-alentejo-evora" className="flex min-h-16 items-center justify-between gap-5 py-3 text-sm text-[color:var(--teal)] hover:text-[color:var(--charcoal)]">
                        Évora & Alentejo <span aria-hidden="true">↗</span>
                      </Link>
                    </>
                  )}
                </div>
              </section>
            );
          })}
          <div className="border-t border-[color:var(--border)] pt-12">
            <Eyebrow>Across Portugal</Eyebrow>
            <h2 className="mt-4 font-serif text-3xl text-[color:var(--charcoal)]">Stay longer. See more slowly.</h2>
            <div className="mt-7"><CtaButton to="/portugal-travel-designer" variant="primary">Design my journey</CtaButton></div>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}