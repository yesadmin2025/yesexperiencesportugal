import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { breadcrumbLd, corporateServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { ServiceCrossLinks } from "@/components/entity/ServiceCrossLinks";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import {
  MessageCircle,
  Users,
  Compass,
  ClipboardCheck,
  Sparkles,
  Landmark,
  Building2,
} from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CinematicEditorialImage } from "@/components/ui/ResponsiveEditorialImage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEvent } from "@/lib/analytics-events";

import { CORPORATE_SERVICE_IMAGES } from "@/content/editorial-service-images";
import { useEditorialOverrides } from "@/lib/editorial-overrides";

import { CORPORATE_FAQ } from "@/content/seo-faq";
import imgFatimaNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import { CTA_LABELS } from "@/content/cta-vocabulary";
import { whatsappUrl } from "@/config/business-nap";

const TITLE = "Corporate Events & Team Building in Portugal | YES";
const DESCRIPTION =
  "Private corporate events, team building, incentive travel, executive retreats and group experiences across Portugal, designed and coordinated locally.";
const OG_TITLE = "Corporate Experiences Across Portugal | YES";
const OG_DESCRIPTION =
  "Team building, incentives, retreats, executive off-sites and private corporate groups across Portugal, coordinated from brief to delivery.";
const CANONICAL = "https://yesexperiencesportugal.com/corporate";

/**
 * Corporate imagery — real operational group photography only.
 * Every slot (and every crossfade alternate) must read as a *group*:
 * the previous first slot showed two guests in a market, which framed
 * the page as leisure travel rather than corporate work.
 */
const CORPORATE_BLOCK_IMAGES = CORPORATE_SERVICE_IMAGES;

export const Route = createFileRoute("/corporate")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      {
        name: "twitter:image",
        content: `https://yesexperiencesportugal.com${imgFatimaNazare}`,
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "pt_PT" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...localeAlternateLinks("/corporate")],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Corporate Experiences in Portugal", path: "/corporate" },
        ]),
      ),
      jsonLdScript(corporateServiceLd({ path: "/corporate" })),
      jsonLdScript(faqPageLd(CORPORATE_FAQ)),
    ],
  }),
  component: CorporatePage,
});

/** Corporate formats — the full breadth of the offer, large groups included. */
const FORMATS = [
  {
    id: "team-building",
    title: "Team building",
    body: "Private team days built around connection, participation and a genuine sense of place, from hands-on workshops and coastal activities to food, wine and cultural experiences.",
    icon: Users,
  },
  {
    id: "incentives",
    title: "Incentive programmes",
    body: "Single-day and multi-day incentive experiences across Portugal, combining strong local content with carefully managed transport, venues, activities and timing.",
    icon: Sparkles,
  },
  {
    id: "retreats",
    title: "Corporate retreats",
    body: "Multi-day programmes balancing meetings, shared experiences, regional discovery and time to reset, with each part coordinated around the group's objectives.",
    icon: Compass,
  },
  {
    id: "off-sites",
    title: "Executive off-sites",
    body: "Focused programmes for leadership and management teams, with private settings, careful pacing, discreet hosting and practical space for conversation.",
    icon: Landmark,
  },
  {
    id: "client-hosting",
    title: "Client hosting & VIP",
    body: "Discreet private programmes for visiting clients, leadership teams, partners and invited guests, shaped around who is attending and how the day needs to feel.",
    detail: "Private settings · careful pacing · discreet coordination · NDAs welcome",
    icon: ClipboardCheck,
  },
  {
    id: "large-groups",
    title: "Large corporate groups",
    body: "Company-wide experiences and incentive groups of 100+ guests, with transport, staffing, venues, activity rotations and timings scaled to the brief.",
    icon: Building2,
  },
];

/** Fires corporate_format_view once, the first time the card is seen. */
function useFormatView(id: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !sent) {
            sent = true;
            trackEvent("corporate_format_view", {
              experience_type: "corporate",
              placement: id,
            });
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return ref;
}

function FormatCard({ format }: { format: (typeof FORMATS)[number] }) {
  const ref = useFormatView(format.id);
  const Icon = format.icon;
  return (
    <div ref={ref} className="reveal-stagger border-t border-[color:var(--border)] pt-6 md:pt-8">
      <Icon
        size={20}
        strokeWidth={1.6}
        aria-hidden="true"
        className="text-[color:var(--gold-deep,var(--gold))]"
      />
       <h3 className="serif mt-4 text-[24px] leading-[1.08] text-[color:var(--charcoal)] md:text-[26px]">
        {format.title}
      </h3>
      <p className="mt-3 text-[15px] md:text-[16px] leading-[1.75] text-[color:var(--charcoal-soft)]">
        {format.body}
      </p>
      {format.detail ? (
        <p className="mt-4 pl-4 border-l-2 border-[color:var(--gold)] text-[13.5px] md:text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
          {format.detail}
        </p>
      ) : null}
    </div>
  );
}

function CorporatePage() {
  useMarketingMotion();
  const serviceImages = useEditorialOverrides(
    "corporate_services",
    CORPORATE_BLOCK_IMAGES.map((image) => ({ ...image, caption: "" })),
  );
  const positioningImage = { ...CORPORATE_BLOCK_IMAGES[0], ...serviceImages[0] };
  const reachImage = { ...CORPORATE_BLOCK_IMAGES[1], ...serviceImages[1] };
  const closingImage = { ...CORPORATE_BLOCK_IMAGES[2], ...serviceImages[2] };

  return (
    <SiteLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="page-hero public-page-header reveal">
        <div className="container-x max-w-3xl text-center header-seq">
          <Eyebrow flank>Corporate &amp; incentives</Eyebrow>
           <SectionTitle as="h1" size="anchor" spacing="loose" className="text-[40px] leading-[1.08] md:text-[60px] md:leading-[1.02]">
            Corporate experiences in Portugal,{" "}
            <SectionTitle.Em>designed by locals.</SectionTitle.Em>
          </SectionTitle>
          <p className="page-header-support mt-6 mx-auto max-w-[46ch] md:max-w-[62ch] text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)]">
            Private team days, incentives and company celebrations{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">across Portugal</strong> —
            coordinated from brief to delivery.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton
              to="/contact"
              search={{ type: "corporate" }}
              variant="primary"
              onClick={() =>
                trackEvent("corporate_hero_proposal_click", {
                  experience_type: "corporate",
                  placement: "hero",
                })
              }
            >
              {CTA_LABELS.corporate}
            </CtaButton>
            <CtaButton
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              icon={null}
              iconLeading={<MessageCircle size={14} aria-hidden="true" />}
              onClick={() =>
                trackEvent("corporate_whatsapp_click", {
                  experience_type: "corporate",
                  placement: "hero",
                })
              }
            >
              Talk to a local
            </CtaButton>
          </div>
        </div>
      </section>

      {/* ── Positioning: built around the team ───────────── */}
      <section className="section-y-major chapter-flow">
        <div className="container-x grid lg:grid-cols-2 gap-10 md:gap-14 items-center reveal-stagger">
          <div className="group overflow-hidden bg-[color:var(--sand)] aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/6]">
            <CinematicEditorialImage
              image={positioningImage}
              priority
              className="h-full w-full"
              phase="a"
            />
          </div>

          <div className="section-seq">
            <Eyebrow>Designed for the purpose</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              Built around the team. <SectionTitle.Em>Scaled around the group.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 font-serif italic text-[1.1rem] md:text-[1.2rem] text-[color:var(--teal)] leading-snug">
              An executive off-site and a 100-person incentive should never feel like the same
              programme enlarged or reduced.
            </p>
            <p className="mt-5 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              We design each corporate experience around the people, objective and pace of the
              group — team-building days, incentive programmes, corporate retreats, executive
              off-sites, client hosting and company celebrations, from leadership teams to groups of
              100+. Every route is grounded in real timings, suitable venues, local knowledge and
              practical delivery.
            </p>
            <div className="mt-6 pl-4 border-l-2 border-[color:var(--gold)] text-[14.5px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-relaxed">
              Transport, venues, activities, guides, staffing and on-the-ground coordination are
              brought together through one local point of contact.
            </div>
          </div>
        </div>
      </section>

      {/* ── Nationwide reach ─────────────────────────────── */}
      <section className="section-y-major chapter-flow bg-[color:var(--ivory)]">
        <div className="container-x grid lg:grid-cols-2 gap-10 md:gap-14 items-center reveal-stagger lg:[&>*:first-child]:order-2">
          <div className="group overflow-hidden bg-[color:var(--sand)] aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/6]">
            <CinematicEditorialImage
              image={reachImage}
              priority={false}
              className="h-full w-full"
              phase="b"
            />
          </div>

          <div className="section-seq">
            <Eyebrow>Beyond the meeting room</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              Local knowledge, <SectionTitle.Em>across the country.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              We operate across Portugal, combining the places a group may already know with the
              producers, landscapes, traditions and settings that give each region its character. A
              programme can include Portugal's recognised highlights, quieter local encounters or a
              considered balance of both.
            </p>
            <p className="mt-5 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              Wine estates, coastal settings, historic towns, boats, workshops, gastronomy, outdoor
              challenges and private venues are selected according to the group, not taken from a
              fixed corporate catalogue. Many draw on the same ground as our{" "}
              <Link
                to="/experiences"
                className="underline decoration-[color:var(--gold)] underline-offset-4 text-[color:var(--charcoal)] hover:text-[color:var(--teal)]"
                onClick={() =>
                  trackEvent("corporate_signature_click", {
                    experience_type: "corporate",
                    placement: "nationwide_reach",
                  })
                }
              >
                Signature experiences across Portugal
              </Link>
              , adapted to a corporate brief.
            </p>
          </div>
        </div>
      </section>

      {/* ── Corporate formats ────────────────────────────── */}
      <section className="section-y chapter-flow">
        <div className="container-x">
          <div className="max-w-2xl reveal">
            <Eyebrow>What we design</Eyebrow>
            <SectionTitle spacing="loose">
              Different briefs. <SectionTitle.Em>One local team.</SectionTitle.Em>
            </SectionTitle>
          </div>

          <div className="mt-10 md:mt-14 grid md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-10 md:gap-y-14">
            {FORMATS.map((f) => (
              <FormatCard key={f.id} format={f} />
            ))}
          </div>

          {/* Scale statement — visible above the FAQ */}
           <p className="mt-14 md:mt-20 text-center serif text-[24px] leading-[1.25] text-[color:var(--charcoal)] md:text-[30px] reveal">
            From small leadership teams to{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              corporate groups of 100+.
            </span>
          </p>
          <p className="mt-5 mx-auto max-w-[54ch] text-center text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)] reveal">
            Multi-day programmes are built with the same team behind our{" "}
            <Link
              to="/portugal-travel-designer"
              className="underline decoration-[color:var(--gold)] underline-offset-4 text-[color:var(--charcoal)] hover:text-[color:var(--teal)]"
              onClick={() =>
                trackEvent("corporate_travel_designer_click", {
                  experience_type: "corporate",
                  placement: "formats",
                })
              }
            >
              Portugal Travel Designer
            </Link>
            , and company celebrations can borrow from our{" "}
            <Link
              to="/proposal-in-portugal"
              className="underline decoration-[color:var(--gold)] underline-offset-4 text-[color:var(--charcoal)] hover:text-[color:var(--teal)]"
            >
              private celebration moments
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="section-y chapter-flow bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-3xl">
          <Eyebrow>Corporate FAQ</Eyebrow>
          <SectionTitle as="h2" size="compact" spacing="loose">
            Practical answers <SectionTitle.Em>before the proposal.</SectionTitle.Em>
          </SectionTitle>

          <div className="mt-8 md:mt-12">
            <Accordion
              type="single"
              collapsible
              className="space-y-3"
              onValueChange={(v) => {
                if (v) trackEvent("corporate_faq_open", { placement: v });
              }}
            >
              {CORPORATE_FAQ.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`corporate-faq-${i}`}
                  className="reveal-stagger border border-[color:var(--border)] bg-[color:var(--ivory)]/80 transition-colors duration-200 hover:border-[color:var(--teal)]/40 [&[data-state=open]]:border-[color:var(--teal)]/55"
                >
                  <AccordionTrigger className="px-5 md:px-6 py-5 min-h-[56px] text-left serif text-[15.5px] md:text-[17px] leading-snug text-[color:var(--charcoal)] hover:no-underline hover:text-[color:var(--teal)] [&[data-state=open]]:text-[color:var(--teal)]">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 md:px-6 pt-1 pb-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Crawlable copy of the same Q&A — visible in the initial HTML. */}
          <dl className="sr-only">
            {CORPORATE_FAQ.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Final conversion ─────────────────────────────── */}
      <section className="section-y chapter-flow bg-[color:var(--sand)] reveal">
        <div className="container-x grid lg:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="group overflow-hidden bg-[color:var(--ivory)] aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/6] order-2 lg:order-1">
            <CinematicEditorialImage
              image={closingImage}
              priority={false}
              className="h-full w-full"
              phase="c"
            />
          </div>

          <div className="order-1 lg:order-2">
            <Eyebrow>Start with the brief</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              Tell us about <SectionTitle.Em>your group.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              Share the group size, dates, objectives and the kind of experience you want to create.
              We will shape a realistic proposal around the people, purpose and place.
            </p>
            <p className="mt-5 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              From leadership teams to groups of 100+, every proposal is developed around the actual
              brief, never copied from a standard package.
            </p>
            <div className="mt-6 pl-4 border-l-2 border-[color:var(--gold)] text-[13.5px] md:text-sm text-[color:var(--charcoal-soft)] leading-relaxed">
              Real driving times, real venues, real partners.
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <CtaButton
                to="/contact"
                search={{ type: "corporate" }}
                variant="primary"
                onClick={() =>
                  trackEvent("corporate_form_started", {
                    experience_type: "corporate",
                    placement: "closing",
                  })
                }
              >
                {CTA_LABELS.corporate}
              </CtaButton>
              <CtaButton
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                icon={null}
                iconLeading={<MessageCircle size={14} aria-hidden="true" />}
                onClick={() =>
                  trackEvent("corporate_whatsapp_click", {
                    experience_type: "corporate",
                    placement: "closing",
                  })
                }
              >
                Talk to a local
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      <ServiceCrossLinks
        tone="ivory"
        eyebrow="Related YES services"
        title="Corporate travel connects to the rest of what we do."
        links={[
          {
            to: "/trade",
            label: "Portugal ground partner for agencies and travel advisors",
            description:
              "Agencies, incentive houses and travel advisors planning corporate programmes in Portugal work with us as their local supplier and destination support.",
          },
          {
            to: "/portugal-travel-designer",
            label: "Portugal travel designer for multi-day programmes",
            description:
              "When an off-site extends into a full journey across regions, the same team plans the complete private itinerary.",
          },
          {
            to: "/proposal-in-portugal",
            label: "Private celebrations and milestone moments",
            description:
              "Company milestones, client hosting and private celebrations planned with the same local coordination.",
          },
        ]}
      />
    </SiteLayout>
  );
}
