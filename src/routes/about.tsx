import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import img from "@/assets/why-image.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — YES experiences Portugal" },
      {
        name: "description",
        content: "We design private, meaningful Portugal experiences — not tours. Get to know YES.",
      },
      { property: "og:title", content: "About — YES experiences Portugal" },
      {
        property: "og:description",
        content: "We design private, meaningful Portugal experiences — not tours. Get to know YES.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/about" }],
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
  return (
    <SiteLayout>
      <section className="pt-32 pb-12 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Eyebrow flank>About YES</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            We design <SectionTitle.Em>meaningful Portugal</SectionTitle.Em>.
          </SectionTitle>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x grid lg:grid-cols-2 gap-14 items-center">
          <img src={img} alt="" loading="lazy" className="w-full aspect-[4/5] object-cover" />
          <div>
            <p className="text-[color:var(--charcoal-soft)] leading-relaxed">
              YES Experiences Portugal started from scratch, built by a Portuguese host who fell for
              this work and never looked back. The idea was simple and a little stubborn: instead of
              the tours everyone already runs, create something different — intimate, real, and
              honestly Portuguese. Days that show the best of the country the way a local would show a
              close friend, not the way a brochure sells it.
            </p>
            <p className="mt-8 serif italic text-2xl text-[color:var(--teal)]">
              Portugal, designed around you.
            </p>
            <CtaButton to="/builder" variant="primary" className="mt-8">
              Begin Your Story
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
