import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Clock, MapPin } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { ImageQualityToggle } from "@/components/ImageQualityToggle";
import { ContrastAuditPanel } from "@/components/dev/ContrastAuditPanel";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Signature Tours — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Complete private experiences across Portugal — designed to be enjoyed as they are. Reserve instantly, with real-time confirmation.",
      },
      { property: "og:title", content: "Signature Experiences — YES experiences Portugal" },
      {
        property: "og:description",
        content:
          "Complete, curated private experiences. Reserve instantly — or adjust a few details within the experience to match your rhythm.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/experiences" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/experiences" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Signature Experiences", path: "/experiences" },
        ]),
      ),
    ],
  }),

  component: ExperiencesPage,
});

function ExperiencesPage() {
  const { resolveImg } = useImportedTourImages();
  return (
    <SiteLayout>
      <section
        data-audit="experiences-hero"
        className="pt-32 pb-[var(--section-y-sm)] bg-[color:var(--sand)] text-center"
      >
        <div className="container-x">
          <Eyebrow flank>Signature Collection</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Signature <SectionTitle.Em>Tours</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            Complete private experiences, designed to be enjoyed as they are. Reserve instantly — or
            adjust a few details within the experience to match your rhythm.
          </p>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <div className="flex justify-end mb-6">
            <ImageQualityToggle />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {signatureTours.map((t) => {
              const topHighlights = t.highlights.slice(0, 3);
              return (
                <article key={t.id} className="group flex flex-col text-left" aria-label={t.title}>
                  {/* Cover — clickable to source-of-truth detail page */}
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="lift-layer-sm relative aspect-[4/5] overflow-hidden mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                    aria-label={`Open ${t.title}`}
                  >
                    <img
                      {...resolveImg(t, "lg")}
                      alt={t.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.25em] bg-[color:var(--ivory)]/90 text-[color:var(--teal)] px-3 py-1.5">
                      {t.theme}
                    </span>
                  </Link>

                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="serif text-2xl text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {t.title}
                  </Link>
                  {/* Teaser — emotional lead BEFORE meta/price.
                      Hierarchy: title → story → highlights → fit →
                      duration/price (subdued) → CTAs. Price is
                      preserved for conversion but no longer dominates
                      the read. */}
                  <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed">
                    {t.blurb}
                  </p>

                  {/* Real highlights from `signatureTours[].highlights` —
                      sourced from the matching Viator product page.
                      Never invented. */}
                  {topHighlights.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-1.5 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                      {topHighlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                          />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
                    Fits best · {t.fitsBest}
                  </p>

                  {/* Subdued meta strip — region · duration · from €X.
                      Price kept (conversion) but reduced to body weight
                      so it stops dominating the card read. */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={11} /> {t.region}
                    </span>
                    <span aria-hidden="true" className="h-px w-2 bg-[color:var(--gold)]/55" />
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} /> {t.durationHours}
                    </span>
                    <span aria-hidden="true" className="h-px w-2 bg-[color:var(--gold)]/55" />
                    <span className="text-[color:var(--charcoal)]">From €{t.priceFrom}</span>
                  </div>

                  {/* Dual CTAs — Reserve (confirm as designed) +
                      Make it yours (adjust details inside this same
                      Signature, never a different tour). */}
                  <div className="mt-5 flex flex-col xs:flex-row gap-2.5">
                    <CtaButton
                      to="/tours/$tourId"
                      params={{ tourId: t.id }}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      aria-label={`Reserve ${t.title}`}
                    >
                      Reserve this day
                    </CtaButton>
                    <CtaButton
                      to="/tours/$tourId/tailor"
                      params={{ tourId: t.id }}
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      aria-label={`Make ${t.title} yours`}
                    >
                      Make it yours
                    </CtaButton>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CtaStrip />
      <ContrastAuditPanel label="Experiences Audit" />
    </SiteLayout>
  );
}

function CtaStrip() {
  return (
    <section data-audit="experiences-cta" className="section-y-sm pt-0">
      <div className="container-x">
        <div className="bg-[color:var(--teal)] text-[color:var(--ivory)] p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="serif text-3xl md:text-4xl">
              Want to start from scratch? <span className="italic">Open the Studio.</span>
            </h3>
            <p className="mt-3 text-[color:var(--ivory)]/80 max-w-lg">
              Start your way — with a place, a region or a feeling. We'll guide you as you build,
              shaping it within what works best on the ground.
            </p>
          </div>
          <CtaButton to="/builder" variant="ghostDark" className="flex-shrink-0">
            Start the Studio
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
