import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Scene } from "@/components/motion/Scene";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { breadcrumbLd, jsonLdScript, organizationLd } from "@/lib/jsonld";
import {
  PARTNERS_BASE_URL,
  PLATFORM_PARTNERS,
  partnerBySlug,
  type PlatformPartner,
} from "@/data/platform-partners";
import { AccessibleIconLink } from "@/components/AccessibleIconLink";
import { ViatorIcon, GetYourGuideIcon, TripadvisorIcon } from "@/components/BrandIcon";
import type { ComponentType } from "react";

const PARTNER_ICON: Record<PlatformPartner["slug"], ComponentType<{ size?: number; className?: string }>> = {
  viator: ViatorIcon,
  getyourguide: GetYourGuideIcon,
  tripadvisor: TripadvisorIcon,
};
import { abs } from "@/lib/seo";
import heroImg from "@/assets/hero-coast.jpg";

const OG_IMAGE = abs(heroImg);

/**
 * /partners/:slug — one page per distribution platform.
 * Copy lives in data/platform-partners.ts (unique per platform, no
 * invented facts). This file is the presentation layer only.
 */

function webPageLd(p: PlatformPartner) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.h1,
    url: `${PARTNERS_BASE_URL}/${p.slug}`,
    description: p.intro,
    isPartOf: {
      "@type": "WebSite",
      url: "https://yesexperiencesportugal.com",
      name: "YES Experiences Portugal",
    },
    about: {
      "@type": "Organization",
      name: p.legalName,
      alternateName: p.name,
      url: p.platformHome,
      ...(p.parent
        ? { parentOrganization: { "@type": "Organization", name: p.parent } }
        : {}),
    },
    mainEntity: {
      "@type": "TravelAgency",
      name: "YES Experiences Portugal",
      url: "https://yesexperiencesportugal.com",
      ...(p.yesProfileUrl ? { sameAs: [p.yesProfileUrl] } : {}),
    },
  };
}

export const Route = createFileRoute("/partners/$slug")({
  loader: ({ params }) => {
    const partner = partnerBySlug(params.slug);
    if (!partner) throw notFound();
    return { partner };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Partner not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.partner;
    const url = `${PARTNERS_BASE_URL}/${params.slug}`;
    const title = `${p.h1} — Verified ${p.category.toLowerCase()}`;
    const description = p.intro;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: p.h1 },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "YES Experiences Portugal" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:alt", content: `${p.h1} — YES Experiences Portugal` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: p.h1 },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript(organizationLd()),
        jsonLdScript(webPageLd(p)),
        jsonLdScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Partners", path: "/partners" },
            { name: p.name, path: `/partners/${params.slug}` },
          ]),
        ),
      ],
    };
  },
  notFoundComponent: PartnerNotFound,
  component: PartnerPage,
});

function PartnerPage() {
  const { partner: p } = Route.useLoaderData();

  return (
    <SiteLayout>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-14 sm:pt-20">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/55">
          <Link to="/" className="hover:text-[color:var(--gold-ink)]">Home</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link to="/partners" className="hover:text-[color:var(--gold-ink)]">Partners</Link>
          <span className="mx-2" aria-hidden>·</span>
          <span className="text-[color:var(--charcoal)]/80">{p.name}</span>
        </nav>

        <Scene>
          <div className="mt-8 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-[color:var(--gold)]/50 text-[color:var(--gold-ink)]"
            >
              {(() => { const Icon = PARTNER_ICON[p.slug as PlatformPartner["slug"]]; return <Icon size={18} />; })()}
            </span>
            <Eyebrow>{p.eyebrow}</Eyebrow>
          </div>
          <SectionTitle as="h1" size="anchor" className="mt-4">
            {p.h1}
          </SectionTitle>
          <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[color:var(--charcoal)]/55">
            {p.category} · Founded {p.founded}
            {p.parent ? ` · Part of ${p.parent}` : ""}
          </p>
          <p className="mt-6 text-[17px] leading-relaxed text-[color:var(--charcoal)]/85">
            {p.intro}
          </p>
        </Scene>

        <section className="mt-12 space-y-6 text-[16px] leading-relaxed text-[color:var(--charcoal)]/85">
          {p.paragraphs.map((para: string) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/45 p-7">
          <Eyebrow>What verification means</Eyebrow>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
            {p.verifiedFacts.map((f: string) => (
              <li key={f} className="flex gap-3">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--gold)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 border-l-2 border-[color:var(--gold)]/70 pl-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold-ink)]">For editors & curators</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
            {p.editorialNote}
          </p>
        </section>

        <section className="mt-10">
          <Eyebrow>The relationship, both ways</Eyebrow>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
            {p.reciprocalNote}
          </p>
        </section>

        {p.yesProfileUrl ? (
          <section className="mt-12 flex flex-wrap items-center gap-4 border-t border-[color:var(--charcoal)]/10 pt-8">
            <a
              href={p.yesProfileUrl}
              target="_blank"
              rel="noopener external"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--charcoal)] px-6 py-3 text-[13px] uppercase tracking-[0.18em] text-[color:var(--ivory)] transition hover:bg-[color:var(--teal)]"
            >
              View YES on {p.name}
              <span aria-hidden>↗</span>
            </a>
            <a
              href={p.platformHome}
              target="_blank"
              rel="noopener"
              className="text-[13px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60 hover:text-[color:var(--gold-ink)]"
            >
              About {p.name}
            </a>
          </section>
        ) : (
          <section className="mt-12 rounded-xl border border-[color:var(--charcoal)]/10 bg-white/60 p-5 text-[13px] leading-relaxed text-[color:var(--charcoal)]/70">
            Search "YES Experiences Portugal" on{" "}
            <a
              href={p.platformHome}
              target="_blank"
              rel="noopener"
              className="underline decoration-[color:var(--gold)] underline-offset-2 hover:text-[color:var(--gold-ink)]"
            >
              {p.name}
            </a>{" "}
            to reach the current listings — product URLs change as the catalogue evolves.
          </section>
        )}

        <section className="mt-16 rounded-2xl border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-7">
          <Eyebrow>Prefer to book directly</Eyebrow>
          <SectionTitle as="h2" size="compact" className="mt-3">
            The full catalogue — <SectionTitle.Em>only on this site</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
            Marketplaces list a selection of our Signature days. Multi-day journeys, the Vinho de
            Talha route in the Alentejo, the Southwest Vicentine Coast and any lightly personalised
            itinerary are booked directly.
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
              Design your own day
            </Link>
          </div>
        </section>

        <section className="mt-16 border-t border-[color:var(--charcoal)]/10 pt-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/55">
            Also listed on
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {PLATFORM_PARTNERS.filter((x) => x.slug !== p.slug).map((x) => {
              const Icon = PARTNER_ICON[x.slug as PlatformPartner["slug"]];
              return (
              <li key={x.slug}>
                <AccessibleIconLink
                  to="/partners/$slug"
                  params={{ slug: x.slug }}
                  label={`Also listed on ${x.name}`}
                  tooltip={x.name}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/50 px-4 py-2 text-[13px] text-[color:var(--charcoal)]/85 transition hover:border-[color:var(--gold)] hover:text-[color:var(--gold-ink)]"
                >
                  <Icon size={14} />
                  {x.name}
                </AccessibleIconLink>
              </li>
              );
            })}
          </ul>
        </section>
      </main>
    </SiteLayout>
  );
}

function PartnerNotFound() {
  return (
    <SiteLayout>
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Eyebrow>Not found</Eyebrow>
        <SectionTitle as="h1" size="default" className="mt-4">
          That partner page does not exist
        </SectionTitle>
        <p className="mt-6 text-[15px] text-[color:var(--charcoal)]/70">
          Visit the{" "}
          <Link to="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
            partners hub
          </Link>{" "}
          for the full list.
        </p>
      </main>
    </SiteLayout>
  );
}
