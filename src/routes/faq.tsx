import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { breadcrumbLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { FAQ_PAGE_GROUPS, FAQ_PAGE_ITEMS } from "@/content/faq-page";
import { EMAIL, EMAIL_HREF, PHONE_DISPLAY, whatsappUrl } from "@/config/business-nap";

const TITLE = "FAQs — Private Tours in Portugal | YES Experiences";
const DESCRIPTION =
  "Answers on our private days in Portugal: how trips are designed, what they cost, cancellation terms, pickups and how to book — written by the local team who run them.";
const PAGE_URL = "https://yesexperiencesportugal.com/faq";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "FAQs", path: "/faq" },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [jsonLdScript(breadcrumbLd(crumbs)), jsonLdScript(faqPageLd(FAQ_PAGE_ITEMS))],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      {/* Hero */}
      <section className="pt-10 pb-14 md:pb-16 bg-[color:var(--sand)] text-center">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Before you book</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Everything worth asking, <SectionTitle.Em>answered honestly</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[15.5px] md:text-[17px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            How our private days are designed, what they cost, where you stand if plans change, and
            the two ways to book. If your question isn&apos;t here, a local answers it personally.
          </p>
          <div className="gold-divider mt-8 mx-auto w-20" />
        </div>
      </section>

      {/* Grouped questions */}
      <section className="py-14 md:py-16">
        <div className="container-x max-w-3xl">
          {FAQ_PAGE_GROUPS.map((group, gi) => (
            <div
              key={group.id}
              id={group.id}
              className={gi === 0 ? "reveal" : "reveal mt-14 md:mt-16"}
              data-testid={`faq-group-${group.id}`}
            >
              <Eyebrow>{group.title}</Eyebrow>
              <SectionTitle as="h2" size="compact" spacing="tight">
                {group.intro}
              </SectionTitle>

              <Accordion type="single" collapsible className="mt-6 space-y-3">
                {group.items.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`${group.id}-${i}`}
                    className="group relative border border-[color:var(--border)] bg-white/80 transition-colors duration-200 hover:border-[color:var(--teal)]/40 [&[data-state=open]]:border-[color:var(--teal)]/55 [&[data-state=open]]:shadow-[var(--shadow-card)]"
                  >
                    <AccordionTrigger className="px-5 md:px-6 py-4 md:py-5 text-left text-[15px] md:text-[17px] serif text-[color:var(--charcoal)] hover:no-underline hover:text-[color:var(--teal)] transition-colors duration-200 [&[data-state=open]]:text-[color:var(--teal)]">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-[14.5px] md:text-[15px] leading-[1.65] text-[color:var(--charcoal)]">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="pb-16 md:pb-20">
        <div className="container-x max-w-3xl">
          <div className="rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-7 md:p-10 text-center">
            <Eyebrow flank>Still deciding?</Eyebrow>
            <SectionTitle as="h2" size="compact" spacing="tight">
              Ask a local, <SectionTitle.Em>not a call centre</SectionTitle.Em>.
            </SectionTitle>
            <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
              Email{" "}
              <a href={EMAIL_HREF} className="underline">
                {EMAIL}
              </a>{" "}
              or WhatsApp{" "}
              <a href={whatsappUrl()} className="underline">
                {PHONE_DISPLAY}
              </a>
              . Or send your dates and we reply personally within 24 hours.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-4 justify-center">
              <CtaButton to="/book" variant="primary">
                Send a booking request
              </CtaButton>
              <CtaButton to="/experiences" variant="ghost">
                Browse Signature days
              </CtaButton>
            </div>
            <p className="mt-5 text-[13px] text-[color:var(--charcoal-soft)]">
              Prefer to read first? <Link to="/about" className="underline">Our story</Link> ·{" "}
              <Link to="/terms" className="underline">Terms</Link>
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
