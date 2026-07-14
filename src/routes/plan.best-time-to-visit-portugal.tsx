import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";
import {
  jsonLdScript,
  breadcrumbLd,
  faqPageLd,
  touristDestinationLd,
  imageGalleryLd,
  absUrl,
  SITE_URL,
} from "@/lib/jsonld";
import { RelatedExperiencesRail } from "@/components/RelatedExperiencesRail";
import { rankRelatedTours } from "@/lib/related-experiences";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

import guestArrabidaViewpoint from "@/assets/guests/arrabida-viewpoint-group.jpg.asset.json";
import guestVineyardCouple from "@/assets/guests/vineyard-couple.jpg.asset.json";
import guestQuintaGroup from "@/assets/guests/quinta-group.jpg.asset.json";
import guestBubblingTasting from "@/assets/guests/bubbling-wine-tasting.jpg.asset.json";
import imgArrabidaLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraCascais from "@/assets/tours/sintra-cascais.jpg";

/**
 * /plan/best-time-to-visit-portugal
 *
 * Tier-3 US-intent editorial pillar. Targets "best time to visit portugal"
 * (US, ~8.1K/mo, KDI 19). Written by the operator team — no invented
 * temperatures, no generic month-by-month cliché. Woven anchors:
 *   1. Local & hidden Portugal
 *   2. Personalized private + Travel Designer
 *   3. Real-time itinerary builder + instant confirmation
 *   4. Unique and only in Portugal
 * Never invents wineries, dishes, temperatures beyond common knowledge,
 * or partners.
 */

const PATH = "/plan/best-time-to-visit-portugal";
const URL = `${SITE_URL}${PATH}`;
const TITLE = "Best Time to Visit Portugal — A Local Operator's Guide for US Travelers";
const DESCRIPTION =
  "When to visit Portugal, by a Sesimbra-based private tour team — the real trade-offs of spring, summer, harvest and winter, plus the private days that work best in each season.";

const HERO = {
  src: guestArrabidaViewpoint.url,
  alt: "American travelers at the Arrábida coastal viewpoint on a clear late-spring afternoon, south of Lisbon",
};

const GALLERY = [
  {
    src: guestVineyardCouple.url,
    alt: "A couple walking between the vine rows of a family Arrábida winery in early spring",
  },
  {
    src: imgArrabidaLunch,
    alt: "A private wine-country lunch table on the Arrábida coast in shoulder season",
  },
  {
    src: imgSintraCascais,
    alt: "Sintra's forested hills on a soft autumn morning, seen from the Pena palace terraces",
  },
  {
    src: guestQuintaGroup.url,
    alt: "A small private group at an Alentejo family quinta during the September wine harvest",
  },
  {
    src: guestBubblingTasting.url,
    alt: "A winter tasting of Setúbal Catralvos Bubbling sparkling wine at a quiet quinta",
  },
];

const FAQ = [
  {
    q: "What is overall the best time to visit Portugal?",
    a: "For most American travelers, mid-May to mid-June and mid-September to mid-October are the two sweet spots. Cellars are open, Sintra and the Douro are photogenic, the Atlantic is swimmable in the south, and the crowds that arrive in July and August are gone. Our Travel Designers book more private days in those two windows than the rest of the year combined.",
  },
  {
    q: "When is the cheapest time to visit Portugal?",
    a: "November through early March. Hotel rates in Lisbon and Porto drop noticeably, private drivers are easier to hold on short notice, and the light in the Alentejo is some of the best of the year. The trade-off is coastal days — Arrábida boat trips and Comporta beaches are shoulder-only.",
  },
  {
    q: "Is Portugal too hot in July and August?",
    a: "In Lisbon and along the coast, high summer sits comfortably in the high 80s°F (30–33°C) with reliable sea breeze. Inland — Évora, the Douro, the Alentejo — regularly clears 100°F (38°C+) in the afternoon. We reshape private days around it: earlier winery starts, longer lunches, no midday driving. Nothing on our Signature days breaks in summer, but a Travel Designer will pace it differently than a May trip.",
  },
  {
    q: "When is the Portuguese wine harvest?",
    a: "Roughly the second week of September through mid-October, depending on region and year. Arrábida and the Alentejo start first; the Douro finishes latest. A harvest visit means active cellars, foot-treading in some family quintas, and shorter tasting windows — worth booking 6–8 weeks ahead, and something we can wire into a real-time itinerary in the Studio.",
  },
  {
    q: "Is Christmas or New Year a good time to visit Portugal?",
    a: "Lisbon and Porto are lovely and calm; the Douro is quiet; the Alentejo villages feel local rather than touristic. Almost no coastal activity works. Family cellars often close for a few days around the holidays — a private Travel Designer will confirm each one before you fly, which a standard OTA booking cannot.",
  },
  {
    q: "How far ahead should Americans book a private Portugal trip?",
    a: "For May, June, September and October: 3–4 months out for full multi-day journeys, 6–8 weeks for a single Signature day. Winter and early spring are workable inside 2–3 weeks. Every Signature day on the site is instantly confirmable — you'll see the exact date lock in real time as you build.",
  },
];

export const Route = createFileRoute("/plan/best-time-to-visit-portugal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "og:image", content: absUrl(HERO.src) },
      { property: "twitter:image", content: absUrl(HERO.src) },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      jsonLdScript(
        touristDestinationLd({
          path: PATH,
          name: "Best time to visit Portugal",
          description: DESCRIPTION,
          hero: HERO,
          gallery: GALLERY,
        }),
      ),
      jsonLdScript(
        imageGalleryLd({
          pageUrl: URL,
          name: "Portugal through the seasons — real photos from our private days",
          photos: [HERO, ...GALLERY],
        }),
      ),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: "/plan" },
          { name: "Best time to visit Portugal", path: PATH },
        ]),
      ),
      jsonLdScript(faqPageLd(FAQ)),
    ],
  }),
  component: BestTimePage,
});

const SEASONS = [
  {
    label: "Mar – May · Spring",
    title: "The quiet reveal",
    body:
      "Cellars reopen, wildflowers cover the Alentejo, and Sintra's forests are at their greenest. Days are 65–75°F, evenings still cool. The best window for a private wine day in Arrábida before the summer crowd finds it — and for a Travel Designer to hold family-table lunches on short notice.",
    best: "Private wine days · Sintra · Alentejo villages · slow driving routes",
  },
  {
    label: "Jun – Aug · Summer",
    title: "Coast, sea and long light",
    body:
      "The reason most first-time visitors come: Comporta, the Arrábida Marine Reserve, hidden coves off Sesimbra, the Vicentine Coast. Interior heat is real (100°F+ in Évora and the Douro), so a personalized private itinerary shifts the pace — earlier starts, later returns, one anchor experience per day instead of three.",
    best: "Arrábida boat · Comporta & Tróia · Costa Vicentina · coastal Signature days",
  },
  {
    label: "Sep – Oct · Harvest & shoulder",
    title: "Our team's favourite window",
    body:
      "Active cellars, warm water still, no crowds after the third week of September, and the Douro at its most cinematic. Almost every experience on the site runs at its best right now. A real-time itinerary builder matters most this month — cellars book out unevenly and confirmation windows are short.",
    best: "Douro Valley · Alentejo harvest · full multi-day private journeys",
  },
  {
    label: "Nov – Feb · Winter",
    title: "Local and undiscovered",
    body:
      "Lisbon and Porto are alive but calm, the Alentejo villages feel local rather than touristic, and small family cellars often pour library vintages you'd never see in summer. Cold-Atlantic days rule out boats — everything inland is open. The quietest way to see hidden Portugal.",
    best: "City stays · Alentejo villages · winter tastings · Travel Designer full journeys",
  },
];

function BestTimePage() {
  const tours = rankRelatedTours(
    {
      region: "Lisbon · Arrábida · Alentejo · Sintra",
      styles: ["wine", "gastronomy", "coast", "heritage"],
      highlights: ["tasting", "viewpoint", "family-table"],
    },
    3,
  );
  const stories = [
    "best-day-trips-from-lisbon",
    "portugal-wine-tours",
    "evora-alentejo-wine-tour",
  ]
    .map((slug) => LOCAL_STORIES_ARTICLES.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SiteLayout>
      <header className="pt-32 md:pt-40 pb-14 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Portugal · Trip planning</Eyebrow>
          <h1 className="mt-5 font-display font-bold text-[2rem] md:text-[2.8rem] leading-[1.12] tracking-[-0.01em] text-[color:var(--charcoal)]">
            The Best Time to Visit Portugal
          </h1>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl mx-auto">
            An operator's guide for American travelers — the real trade-offs of each season,
            written by the team that designs private days here every week. No month-by-month
            weather chart; only what changes for a personalized private trip.
          </p>
          <div className="mt-10">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Talk to a Travel Designer
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design a private day
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </header>

      {/* Hero image — real, seasonal, never stock */}
      <section className="bg-[color:var(--sand)] pb-14 md:pb-20">
        <div className="container-x max-w-5xl">
          <figure className="overflow-hidden rounded-sm">
            <img
              src={HERO.src}
              alt={HERO.alt}
              loading="eager"
              decoding="async"
              className="w-full aspect-[16/9] object-cover"
            />
          </figure>
        </div>
      </section>

      {/* Short answer up top — US readers scan for it */}
      <section className="reveal py-16 md:py-20 bg-[color:var(--ivory)]">
        <div className="container-x max-w-2xl">
          <Eyebrow>The short answer</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Two windows do most of the <SectionTitle.Em>work</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-[1.8]">
            <strong className="font-medium text-[color:var(--charcoal)]">
              Mid-May to mid-June
            </strong>{" "}
            and{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">
              mid-September to mid-October
            </strong>{" "}
            are the two windows we design most trips in. Cellars are open, coasts are warm,
            interior heat is bearable, and the July–August crowd is elsewhere. Everything below
            is a case for or against those two — and what a private Portugal trip looks like in
            each season if you can't move your dates.
          </p>
        </div>
      </section>

      {/* Season cards */}
      <section className="reveal py-16 md:py-20 bg-[color:var(--sand)]">
        <div className="container-x max-w-5xl">
          <Eyebrow>Season by season</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Portugal <SectionTitle.Em>through the year</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-10 grid md:grid-cols-2 gap-6 md:gap-8">
            {SEASONS.map((s) => (
              <article
                key={s.label}
                className="bg-[color:var(--ivory)] border border-[color:var(--gold-soft)]/40 rounded-sm p-7 md:p-8"
              >
                <div className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--teal)]">
                  {s.label}
                </div>
                <h3 className="serif text-[1.4rem] md:text-[1.55rem] leading-tight text-[color:var(--charcoal)] mt-3">
                  {s.title}
                </h3>
                <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.75]">{s.body}</p>
                <div className="mt-5 pt-4 border-t border-[color:var(--gold-soft)]/40 text-[13px] text-[color:var(--charcoal-soft)]">
                  <span className="text-[color:var(--charcoal)] font-medium">Best for: </span>
                  {s.best}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial gallery strip */}
      <section className="reveal py-14 md:py-20 bg-[color:var(--ivory)] border-t border-[color:var(--border)]">
        <div className="container-x">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {GALLERY.slice(0, 3).map((p) => (
              <figure key={p.src} className="overflow-hidden rounded-sm">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-[4/5] md:aspect-[3/4] object-cover"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Why book with a private operator (positioning anchors) */}
      <section className="reveal py-20 md:py-24 bg-[color:var(--sand)]">
        <div className="container-x max-w-2xl space-y-10">
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              Why the season matters more with a private team
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              A generic day tour runs the same shape in every season. A{" "}
              <strong className="font-medium text-[color:var(--charcoal)]">
                personalized private day
              </strong>{" "}
              reshapes around the weather, the harvest, and which family cellars are actually
              pouring that week. Our Travel Designers live here — Sesimbra, Lisbon, Évora — and
              confirm each stop the week you land.
            </p>
          </div>
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              Real-time itinerary, instant confirmation
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              The{" "}
              <Link to="/studio-v3" className="text-[color:var(--teal)] hover:underline">
                YES Experience Studio
              </Link>{" "}
              lets you compose a private day on any date and lock it in real time — no
              request-and-wait, no OTA middleman. It's the only real-time private tour builder in
              Portuguese tourism, and it matters most in the harvest weeks, when a family
              cellar's availability changes by the day.
            </p>
          </div>
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              Local, hidden, and only in Portugal
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              Vinho de talha in the Alentejo — wine still fermented in Roman-style clay
              amphorae — happens in almost no other country. Sintra's fog off the Atlantic, the
              Arrábida marine reserve, and the Vicentine Coast cliffs are Portugal-only
              experiences. The right season lets you actually see them.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/plan"
              className="text-[13px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
            >
              ← Back to Trip planning hub
            </Link>
          </div>
        </div>
      </section>

      {/* Intent-aware internal links — Studio + Signature + matching plan */}
      <RelatedExperiencesRail
        tours={tours}
        stories={stories}
        toursEyebrow="Signature days by season"
        toursTitle={
          <>
            Private days that fit <SectionTitle.Em>your window</SectionTitle.Em>
          </>
        }
        background="ivory"
      />

      {/* Related plans strip */}
      <section className="reveal py-16 bg-[color:var(--sand)] border-t border-[color:var(--border)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>Keep planning</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Turn the <SectionTitle.Em>right window</SectionTitle.Em> into a trip
          </SectionTitle>
          <ul className="mt-10 divide-y divide-[color:var(--gold-soft)]/50 border-y border-[color:var(--gold-soft)]/50">
            {[
              { path: "/plan/5-day-portugal-itinerary", label: "5-day Portugal itinerary" },
              { path: "/plan/7-day-portugal-itinerary", label: "7-day Portugal itinerary" },
              {
                path: "/plan/portugal-wine-and-gastronomy",
                label: "Portugal wine & gastronomy trip",
              },
              { path: "/plan/alentejo", label: "Private trip to the Alentejo" },
              { path: "/plan/sintra", label: "Private trip to Sintra" },
            ].map((i) => (
              <li key={i.path}>
                <Link
                  to={i.path}
                  className="group flex items-baseline justify-between py-5 gap-6"
                >
                  <span className="serif text-[19px] text-[color:var(--charcoal)] group-hover:text-[color:var(--teal)] transition-colors">
                    {i.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)]">
                    Private · Designer-composed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="reveal py-20 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Frequently asked</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            When to <SectionTitle.Em>visit Portugal</SectionTitle.Em>
          </SectionTitle>
          <dl className="mt-10 space-y-8">
            {FAQ.map((f) => (
              <div key={f.q} className="border-t border-[color:var(--gold-soft)]/40 pt-5">
                <dt className="serif text-[19px] text-[color:var(--charcoal)]">{f.q}</dt>
                <dd className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-14 text-center">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Talk to a Travel Designer
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design a private day
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
