import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { TRAVEL_DESIGNER_FAQ } from "@/content/seo-faq";
import { SiteLayout } from "@/components/SiteLayout";
import {
  MessageCircle,
  Compass,
  MapPin,
  Calendar,
  FileText,
  Heart,
  Users,
  Sparkles,
  Route as RouteIcon,
  LifeBuoy,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { whatsappHref } from "@/components/WhatsAppFab";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";
import samplePage01 from "@/assets/travel-file-sample/page-01.jpg.asset.json";
import samplePage02 from "@/assets/travel-file-sample/page-02.jpg.asset.json";
import samplePage03 from "@/assets/travel-file-sample/page-03.jpg.asset.json";
import samplePage04 from "@/assets/travel-file-sample/page-04.jpg.asset.json";
import samplePage05 from "@/assets/travel-file-sample/page-05.jpg.asset.json";
import samplePage06 from "@/assets/travel-file-sample/page-06.jpg.asset.json";
import samplePdf from "@/assets/travel-file-sample/sample.pdf.asset.json";

export const Route = createFileRoute("/multi-day")({
  head: () => ({
    meta: [
      { title: "Travel Designer Portugal | Private Journeys by YES" },
      {
        name: "description",
        content:
          "Private Portugal journeys designed by a local Travel Designer. Multi-day itineraries, honeymoons, family trips and special occasions, delivered as a travel file.",
      },
      { property: "og:title", content: "Travel Designer Portugal | Private Journeys by YES" },
      {
        property: "og:description",
        content:
          "Multi-day private journeys across Portugal, designed by a local Travel Designer and delivered as a complete travel file.",
      },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgSintraEstates}` },
      {
        property: "twitter:image",
        content: `https://yesexperiencesportugal.com${imgSintraEstates}`,
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/multi-day" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/multi-day" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Travel Designer", path: "/multi-day" },
        ]),
      ),
      jsonLdScript(faqPageLd(TRAVEL_DESIGNER_FAQ)),
    ],
  }),
  component: MultiDayPage,
});

const WHO_ITS_FOR: string[] = [
  "Multi-day Portugal journeys",
  "Honeymoons and anniversary trips",
  "Family journeys",
  "Private celebrations",
  "First-time Portugal trips",
  "Regional routes across Portugal",
  "Guests who want a complete proposal before committing",
  "Travellers who want local guidance without losing personal freedom",
];

const WHAT_WE_SHAPE: string[] = [
  "The route",
  "The number of nights",
  "The pace of each day",
  "Private experiences",
  "Wine, food, culture and coast moments",
  "Transfers and driving logic",
  "Trusted local partners",
  "Hotel and stay suggestions where relevant",
  "Restaurant and timing guidance",
  "Support before and during the journey",
];

const PROCESS = [
  {
    n: "01",
    title: "Tell us the shape",
    body:
      "Dates, group, pace, interests, occasion, budget range and what Portugal should feel like for you.",
  },
  {
    n: "02",
    title: "We design the route",
    body:
      "Your Travel Designer builds the journey around realistic driving times, region flow, private experiences, meals, stays and local timing.",
  },
  {
    n: "03",
    title: "You receive the travel file",
    body:
      "A curated proposal with the day-by-day rhythm, routes, experiences, selected details and confirmed elements where relevant.",
  },
  {
    n: "04",
    title: "We refine and support",
    body:
      "The journey is adjusted with you before travelling, then supported locally while you are in Portugal.",
  },
];

const FILE_CONTENTS: string[] = [
  "Day-by-day route",
  "Regional rhythm",
  "Private experiences",
  "Driving times and transfers",
  "Stays and overnight logic",
  "Local contacts",
  "Restaurant and timing notes where relevant",
  "Confirmed reservations where applicable",
  "Practical details guests usually forget until too late",
];

const SAMPLE_PAGES = [
  { src: samplePage01.url, alt: "Travel Designer Portugal sample itinerary file — cover page" },
  { src: samplePage02.url, alt: "Private multi-day Portugal itinerary — welcome page" },
  { src: samplePage03.url, alt: "Private Portugal journey — confirmed reservations page" },
  { src: samplePage04.url, alt: "Portugal Travel Designer journey across regions — route map" },
  { src: samplePage05.url, alt: "Private multi-day Portugal itinerary with local route planning" },
  { src: samplePage06.url, alt: "Travel Designer Portugal — day-by-day itinerary card" },
];

function MultiDayPage() {
  return (
    <SiteLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Travel Designer Portugal</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            A private Portugal journey,{" "}
            <SectionTitle.Em>written around you.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            For multi-day travel, honeymoons, family journeys, celebrations and complex itineraries
            — designed by a local Travel Designer from real routes, trusted partners, timings,
            stays and details that actually work on the ground.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Begin with a Designer
            </CtaButton>
            <CtaButton to="#sample-file" variant="ghost">
              See Sample Travel File
            </CtaButton>
          </div>
          <p className="mt-5 font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            Designed locally · Delivered as a travel file · Supported on the ground
          </p>
        </div>
      </section>

      {/* ── Who it is for ────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow icon={<Users strokeWidth={1.8} />}>
              For journeys that need more than a booking
            </Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              When the trip matters,{" "}
              <SectionTitle.Em>the structure matters too.</SectionTitle.Em>
            </SectionTitle>
            <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              Travel Designer is for guests who want Portugal planned with care from beginning to
              end — not just a hotel list, a transfer and a few tours dropped into a calendar.
            </p>
          </div>

          <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {WHO_ITS_FOR.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] text-[color:var(--charcoal)] leading-relaxed"
              >
                <span className="mt-2 h-[6px] w-[6px] shrink-0 rounded-full bg-[color:var(--gold)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── What we design ────────────────────────────────── */}
      <section className="py-16 md:py-20 reveal">
        <div className="container-x max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow icon={<Sparkles strokeWidth={1.8} />}>What we design</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              A journey with rhythm,{" "}
              <SectionTitle.Em>not a list of places.</SectionTitle.Em>
            </SectionTitle>
            <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              Portugal is small on a map, but it is not small in rhythm. A good journey depends on
              knowing what belongs together, what needs space, what is worth the drive and what
              should be left for another day.
            </p>
          </div>

          <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {WHAT_WE_SHAPE.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] text-[color:var(--charcoal)] leading-relaxed"
              >
                <span className="mt-2 h-[6px] w-[6px] shrink-0 rounded-full bg-[color:var(--gold)]" />
                {item}
              </li>
            ))}
          </ul>

          <blockquote className="mt-12 max-w-2xl mx-auto text-center font-serif italic text-[1.15rem] md:text-[1.3rem] text-[color:var(--teal)] leading-snug">
            “Not every beautiful place belongs in the same trip.”
          </blockquote>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow icon={<Compass strokeWidth={1.8} />}>How it works</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              From idea to <SectionTitle.Em>complete travel file.</SectionTitle.Em>
            </SectionTitle>
            <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          </div>
          <ol className="mt-10 md:mt-14 grid md:grid-cols-2 gap-6 md:gap-8">
            {PROCESS.map((s) => (
              <li
                key={s.n}
                className="reveal-stagger bg-white border border-[color:var(--border)] p-6 md:p-8"
              >
                <div className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
                  {s.n}
                </div>
                <h3 className="mt-3 serif text-[1.25rem] md:text-[1.4rem] text-[color:var(--charcoal)] leading-tight">
                  {s.title}
                </h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The travel file (moved up) ────────────────────── */}
      <section
        id="sample-file"
        className="py-16 md:py-24 bg-[color:var(--ivory)] border-y border-[color:var(--border)] reveal"
      >
        <div className="container-x max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <Eyebrow icon={<FileText strokeWidth={1.8} />}>The travel file</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              Delivered as a{" "}
              <SectionTitle.Em>private travel file.</SectionTitle.Em>
            </SectionTitle>
            <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              A journey you can understand before you live it. Every Travel Designer journey is
              delivered as a curated dossier, not a generic itinerary — the moving parts brought
              together in one place so the trip feels clear before it begins.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-start">
            {/* Lead spread */}
            <div className="md:col-span-7">
              <div className="overflow-hidden border border-[color:var(--border)] shadow-[0_24px_60px_-24px_rgba(46,46,46,0.32)] bg-white">
                <img
                  src={SAMPLE_PAGES[0].src}
                  alt={SAMPLE_PAGES[0].alt}
                  loading="lazy"
                  className="w-full h-auto object-contain"
                />
              </div>
              <p className="mt-4 font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
                From a real Travel Designer file — guest details removed
              </p>
            </div>

            {/* What's inside */}
            <div className="md:col-span-5">
              <h3 className="serif text-[1.25rem] md:text-[1.45rem] text-[color:var(--charcoal)] leading-tight">
                What&rsquo;s inside your file
              </h3>
              <span className="gold-rule mt-4 max-w-[48px]" aria-hidden="true" />
              <ul className="mt-5 space-y-2.5">
                {FILE_CONTENTS.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-3 text-[15px] text-[color:var(--charcoal)] leading-relaxed"
                  >
                    <span className="mt-2 h-[6px] w-[6px] shrink-0 rounded-full bg-[color:var(--gold)]" />
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <CtaButton
                  href={samplePdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                >
                  Open Sample Travel File
                </CtaButton>
              </div>
            </div>
          </div>

          {/* Additional sample pages */}
          <div className="mt-10 md:mt-14">
            <p className="text-center font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)]">
              Sample pages
            </p>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
              {SAMPLE_PAGES.slice(1).map((p) => (
                <div
                  key={p.src}
                  className="overflow-hidden border border-[color:var(--border)] shadow-[0_12px_30px_-16px_rgba(46,46,46,0.28)] bg-white"
                >
                  <img
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Where it can go ──────────────────────────────── */}
      <section className="py-16 md:py-24 reveal">
        <div className="container-x grid lg:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="overflow-hidden">
            <img
              src={imgSintraEstates}
              alt="Private Portugal journey designed by YES Experiences Portugal"
              loading="lazy"
              className="w-full aspect-[4/5] md:aspect-[5/6] object-cover"
            />
          </div>
          <div>
            <Eyebrow icon={<RouteIcon strokeWidth={1.8} />}>Where it can go</Eyebrow>
            <span className="gold-rule mt-4 max-w-[64px]" aria-hidden="true" />
            <SectionTitle size="compact" spacing="loose">
              Across Portugal,{" "}
              <SectionTitle.Em>shaped around your pace.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              A Travel Designer journey can connect Lisbon, Sintra, Cascais, Arrábida, Sesimbra,
              Setúbal, Comporta, Tróia, Évora, Alentejo, Central Portugal, Porto, Douro, the
              Algarve and the Atlantic coast — when they make sense for your time, season and
              rhythm.
            </p>
            <blockquote className="mt-6 pl-4 border-l-2 border-[color:var(--gold)] font-serif italic text-[1.05rem] md:text-[1.15rem] text-[color:var(--teal)] leading-snug">
              Chosen because it belongs in your story, not because it is on a list.
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Local support ────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow icon={<LifeBuoy strokeWidth={1.8} />}>Local support</Eyebrow>
          <SectionTitle size="compact" spacing="loose">
            Supported <SectionTitle.Em>on the ground.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 font-serif italic text-[1.1rem] md:text-[1.2rem] text-[color:var(--teal)] leading-snug">
            Designed before you arrive. Adjusted while you travel.
          </p>
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            A private journey should not leave you alone with a PDF and good luck. During the
            journey, YES coordinates with local guides, drivers, partners and hosts so the moving
            parts feel effortless. When weather, timing or energy shifts, the route is adjusted
            with local judgement — not call-centre scripts.
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
            Daily local contact · In-country adjustments · Transport coordination · Trusted
            partners on the ground
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-[color:var(--ivory)] reveal" aria-labelledby="td-faq">
        <div className="container-x max-w-3xl">
          <div className="text-center">
            <Eyebrow flank>Before you begin</Eyebrow>
            <SectionTitle id="td-faq" size="compact" spacing="loose">
              Travel Designer, <SectionTitle.Em>answered.</SectionTitle.Em>
            </SectionTitle>
            <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          </div>
          <Accordion type="single" collapsible defaultValue="td-0" className="mt-8 space-y-3">
            {TRAVEL_DESIGNER_FAQ.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`td-${i}`}
                className="border border-[color:var(--border)] bg-white/80"
              >
                <AccordionTrigger className="px-5 md:px-6 py-4 md:py-5 text-left text-[15px] md:text-[17px] serif text-[color:var(--charcoal)] hover:no-underline hover:text-[color:var(--teal)] [&[data-state=open]]:text-[color:var(--teal)]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-[14.5px] md:text-[15px] leading-[1.65] text-[color:var(--charcoal)]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-2xl text-center">
          <Eyebrow icon={<Heart strokeWidth={1.8} />}>Begin</Eyebrow>
          <SectionTitle size="compact" spacing="loose">
            Begin with <SectionTitle.Em>a designer.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            Tell us what you have in mind. We will shape the journey with you, day by day, route
            by route, until Portugal feels like yours.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/contact" variant="primary">
              Begin with a Designer
            </CtaButton>
            <a
              href={whatsappHref(
                "Hi! I'm interested in a private multi-day Travel Designer journey with YES Experiences.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] text-[color:var(--charcoal)] px-6 py-3 text-sm tracking-wide transition-all"
            >
              <MessageCircle size={14} aria-hidden="true" /> Talk to a Local
            </a>
          </div>
          <p className="mt-6 font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            Licensed Portuguese tour operator · Local support · Private journeys only
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
