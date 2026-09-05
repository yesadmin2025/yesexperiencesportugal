import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { EMAIL, EMAIL_HREF } from "@/config/business-nap";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Cookie Policy — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "How YES Experiences Portugal uses cookies and similar technologies to run the site, remember your preferences and measure performance.",
      },
      { property: "og:title", content: "Cookie Policy — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "How YES Experiences Portugal uses cookies to run the site, remember preferences and measure performance.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/cookies" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/cookies" },
      ...localeAlternateLinks("/cookies"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Cookie Policy", path: "/cookies" },
        ]),
      ),
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <SiteLayout>
      <section className="bg-[color:var(--ivory)] py-20 md:py-28">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow className="mb-5">Legal</Eyebrow>
          <h1 className="serif mt-3 text-[2rem] md:text-[2.8rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            Cookie <span className="italic font-normal text-[color:var(--teal)]">policy.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              This site uses a small number of cookies and similar technologies so the experience
              works reliably and so we can keep improving it. We do not use cookies to build
              advertising profiles.
            </p>

            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Strictly necessary
            </h2>
            <p>
              Required for the site to function — remembering your session while you design a
              journey in the Studio, keeping your basket during checkout, and protecting the site
              from abuse. These cannot be turned off.
            </p>

            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Preferences
            </h2>
            <p>
              Store choices such as your language and any accessibility settings so we do not have
              to ask again on your next visit.
            </p>

            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Analytics
            </h2>
            <p>
              Aggregated, privacy-respecting measurement so we can understand which pages help
              travellers most. Data is not sold and is not used to identify you personally.
            </p>

            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Third-party services
            </h2>
            <p>
              Some pages embed content from trusted partners — payment processing (Stripe), maps
              (Mapbox) and review platforms (Tripadvisor, Viator). Those services may set their own
              cookies when their content loads.
            </p>

            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Managing cookies
            </h2>
            <p>
              You can clear or block cookies at any time from your browser settings. Blocking
              strictly-necessary cookies may prevent parts of the site from working.
            </p>

            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              Questions? Write to us at{" "}
              <a
                href={EMAIL_HREF}
                className="text-[color:var(--teal)] underline underline-offset-4"
              >
                {EMAIL}
              </a>{" "}
              — or see our{" "}
              <Link to="/privacy" className="text-[color:var(--teal)] underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
