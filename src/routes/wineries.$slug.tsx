import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Grape } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";
import { WINERIES, findWinery } from "@/content/wineries";

export const Route = createFileRoute("/wineries/$slug")({
  loader: ({ params }) => {
    const winery = findWinery(params.slug);
    if (!winery) throw notFound();
    return { winery };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Winery not found" }, { name: "robots", content: "noindex" }] };
    const w = loaderData.winery;
    const url = `${WEBSITE_URL}/wineries/${params.slug}`;
    const shortName = w.name.replace(/\s*\(.*\)\s*$/, "");
    const title = `${shortName} · Private Wine Tour from Lisbon`;
    const fullDesc = `${w.summary} Visit on a private wine day from Lisbon with YES Experiences.`;
    const desc = fullDesc.length <= 160 ? fullDesc : w.summary.slice(0, 157).replace(/\s+\S*$/, "") + "…";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Wineries", path: "/wineries" },
            { name: w.name, path: `/wineries/${w.slug}` },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Winery",
          name: w.name,
          description: w.summary,
          url,
        }),
      ],
    };
  },
  component: WineryPage,
});

function WineryPage() {
  const { winery: w } = Route.useLoaderData();
  const others = WINERIES.filter((o) => o.region === w.region && o.slug !== w.slug);
  return (
    <SiteLayout>
      <SiteBreadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Wineries", path: "/wineries" },
          { name: w.name, path: `/wineries/${w.slug}` },
        ]}
      />
      <section className="public-page-header bg-[color:var(--sand)] py-16 md:py-24">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<Grape aria-hidden />}>{w.region}</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">{w.name}</SectionTitle>
          <p className="mt-6 text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">{w.summary}</p>
        </div>
      </section>
      <section className="py-16 md:py-24">
        <div className="container-x max-w-3xl space-y-5 text-[16px] leading-[1.8] text-[color:var(--charcoal)]">
          {w.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <SectionTitle as="h2" className="pt-8">Visit it on a private day</SectionTitle>
          <ul className="space-y-3">
            {w.tours.map((t) => (
              <li key={t.id}>
                <Link to="/tours/$tourId" params={{ tourId: t.id }} className="font-medium text-[color:var(--teal)] underline-offset-4 hover:underline">
                  {t.label}
                </Link>{" "}
                <span className="text-[color:var(--charcoal-soft)]">— {t.role}</span>
              </li>
            ))}
          </ul>
          <p className="text-[14px] text-[color:var(--charcoal-soft)]">
            Wineries are chosen by date and availability. Tell us if you'd like this one and we'll
            confirm it before you book.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <CtaButton to="/tours/$tourId" params={{ tourId: w.tours[0].id }}>Reserve this day</CtaButton>
            <CtaButton to="/wineries" variant="ghost">All wineries</CtaButton>
          </div>
          {others.length > 0 && (
            <div className="pt-10">
              <SectionTitle as="h3">Other wineries in {w.region}</SectionTitle>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link to="/wineries/$slug" params={{ slug: o.slug }} className="text-[color:var(--teal)] underline-offset-4 hover:underline">
                      {o.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
