import { createFileRoute, Link } from "@tanstack/react-router";
import { Grape } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";
import { WINERIES } from "@/content/wineries";

const PAGE_URL = `${WEBSITE_URL}/wineries/`;
const TITLE = "Wineries We Visit near Lisbon · Arrábida, Azeitão & Évora";
const DESC =
  "The partner wineries on our private wine days from Lisbon: José Maria da Fonseca, Catralvos, Bacalhôa, Cartuxa, Esporão and more — and which day visits each.";
const crumbs = [
  { name: "Home", path: "/" },
  { name: "Lisbon wine tours", path: "/lisbon-wine-tours" },
  { name: "Wineries", path: "/wineries/" },
];

export const Route = createFileRoute("/wineries/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(breadcrumbLd(crumbs)),
      jsonLdScript(
        itemListLd({
          name: "Partner wineries",
          path: "/wineries/",
          items: WINERIES.map((w) => ({ id: w.slug, name: w.name, description: w.summary })),
        }),
      ),
    ],
  }),
  component: WineriesIndex,
});

function WineriesIndex() {
  const regions = ["Arrábida & Azeitão", "Évora & Alentejo"] as const;
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />
      <section className="public-page-header bg-[color:var(--sand)] py-16 md:py-24">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<Grape aria-hidden />}>Arrábida · Azeitão · Alentejo</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            The wineries <SectionTitle.Em>on our wine days.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Each private day picks from a short list of wineries, depending on the date and
            availability. Here is every one, and the day that visits it.
          </p>
        </div>
      </section>
      {regions.map((region) => (
        <section key={region} className="py-16 md:py-24">
          <div className="container-x max-w-4xl">
            <SectionTitle as="h2">{region}</SectionTitle>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {WINERIES.filter((w) => w.region === region).map((w) => (
                <li key={w.slug}>
                  <Link
                    to="/wineries/$slug"
                    params={{ slug: w.slug }}
                    className="block h-full rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60"
                  >
                    <h3 className="font-editorial text-[22px] leading-tight text-[color:var(--charcoal)]">
                      {w.name}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                      {w.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      <section className="pb-20">
        <div className="container-x flex flex-wrap gap-3">
          <CtaButton to="/lisbon-wine-tours">Explore Signature days</CtaButton>
          <CtaButton to="/local-stories/$slug" params={{ slug: "best-wine-tours-from-lisbon" }} variant="ghost">
            Read the wine tours guide
          </CtaButton>
        </div>
      </section>
    </SiteLayout>
  );
}
