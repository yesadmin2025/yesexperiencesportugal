import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Scene } from "@/components/motion/Scene";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { breadcrumbLd, jsonLdScript, organizationLd } from "@/lib/jsonld";
import { PLATFORM_PARTNERS, PARTNERS_BASE_URL, PARTNERS_HUB } from "@/data/platform-partners";
import { abs } from "@/lib/seo";
import heroImg from "@/assets/hero-coast.jpg";

const OG_IMAGE = abs(heroImg);

const TITLE = "Distribution partners — Viator, GetYourGuide, Tripadvisor | YES Experiences Portugal";
const DESCRIPTION =
  "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT nº 31/2023) listed on Viator, GetYourGuide and Tripadvisor. Same guides, same routes, same wineries on every channel.";

function itemListLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PARTNERS_HUB.h1,
    itemListElement: PLATFORM_PARTNERS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${PARTNERS_BASE_URL}/${p.slug}`,
      name: p.name,
    })),
  };
}

export const Route = createFileRoute("/partners/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PARTNERS_BASE_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: PARTNERS_BASE_URL }],
    scripts: [
      jsonLdScript(organizationLd()),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
        ]),
      ),
      jsonLdScript(itemListLd()),
    ],
  }),
  component: PartnersHub,
});

function PartnersHub() {
  return (
    <SiteLayout>
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-14 sm:pt-20">
        <Scene>
          <Eyebrow>{PARTNERS_HUB.eyebrow}</Eyebrow>
          <SectionTitle as="h1" size="anchor" className="mt-4">
            {PARTNERS_HUB.h1}
          </SectionTitle>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[color:var(--charcoal)]/85">
            {PARTNERS_HUB.intro}
          </p>
          <p className="mt-4 max-w-2xl text-[14px] italic leading-relaxed text-[color:var(--charcoal)]/65">
            {PARTNERS_HUB.editorialLine}
          </p>
        </Scene>

        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_PARTNERS.map((p) => (
            <Link
              key={p.slug}
              to="/partners/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col rounded-2xl border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40 p-6 transition hover:-translate-y-0.5 hover:border-[color:var(--gold)]/60 hover:shadow-md"
            >
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold-ink)]">
                {p.eyebrow}
              </span>
              <h2 className="mt-3 font-display text-[22px] leading-snug text-[color:var(--charcoal)]">
                {p.name}
              </h2>
              <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/60">
                {p.category}
                {p.parent ? ` · Part of ${p.parent}` : ""}
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-[color:var(--charcoal)]/80">
                {p.intro}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-[color:var(--gold-ink)] transition group-hover:gap-3">
                Read the partner page
                <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-20 rounded-2xl border border-[color:var(--charcoal)]/10 bg-white/60 p-8">
          <Eyebrow>Book directly</Eyebrow>
          <SectionTitle as="h2" size="compact" className="mt-3">
            Or skip the marketplace — <SectionTitle.Em>design your own day</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
            Booking directly gives you the full catalogue, lightly personalised itineraries and a
            conversation with the guide before confirmation. Marketplace channels are the right
            place for standard Signature days when the marketplace-side cancellation flow matters
            more to you than customisation.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/experiences"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--charcoal)] px-6 py-3 text-[13px] uppercase tracking-[0.18em] text-[color:var(--ivory)] transition hover:bg-[color:var(--teal)]"
            >
              Signature experiences
            </Link>
            <Link
              to="/studio-v3"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--charcoal)]/30 px-6 py-3 text-[13px] uppercase tracking-[0.18em] text-[color:var(--charcoal)] transition hover:border-[color:var(--gold)]"
            >
              Open the Studio
            </Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
