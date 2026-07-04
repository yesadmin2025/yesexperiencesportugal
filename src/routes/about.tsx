import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import founderAsset from "@/assets/about-founder-wine-experience.jpg.asset.json";

const TITLE = "About YES Experiences Portugal | Founder-Built Private Travel Platform";
const DESCRIPTION =
  "YES Experiences Portugal is a licensed private travel platform, founder-built from real guest behaviour, live-designed experiences and local expertise across Portugal.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/about" },
      { property: "og:type", content: "website" },
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
      {/* Hero */}
      <section className="pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Eyebrow flank>About YES</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            We design <SectionTitle.Em>meaningful Portugal</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
            YES Experiences Portugal is a licensed Portuguese private tour operator,
            founder-led since 2022 and built around one idea: Portugal should feel
            personal, local and genuinely yours.
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-sm text-[color:var(--charcoal-soft)]/85 leading-relaxed">
            Private days, live-designed experiences and full journeys, created from
            real routes, real guests and real local knowledge.
          </p>
        </div>
      </section>

      {/* Created from real travel */}
      <section className="py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Created from real travel</Eyebrow>
          <SectionTitle as="h2" size="default">
            Built from the road, <SectionTitle.Em>not a template</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              YES did not begin as an agency concept, a marketplace idea or a
              travel-tech trend.
            </p>
            <p>
              It began on the road, guiding real guests through Portugal and seeing
              the same need appear again and again: travellers wanted more than
              another fixed tour. They wanted freedom, but not confusion. They
              wanted to shape the day themselves, but still feel guided by someone
              local. They wanted to understand the route, the rhythm and the price
              before committing.
            </p>
            <p>That is where the Experience Studio came from.</p>
          </div>
        </div>
      </section>

      {/* Founder-built */}
      <section className="py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-[1.15fr_1fr] gap-14 items-start">
          <div>
            <Eyebrow>Founder-built</Eyebrow>
            <SectionTitle as="h2" size="default">
              Built by the person <SectionTitle.Em>who saw the problem</SectionTitle.Em>.
            </SectionTitle>
            <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              <p>
                The Experience Studio was not added because "custom travel"
                sounded good on a website.
              </p>
              <p>
                It was built because, after years designing and guiding private
                guests across Portugal, the same need became impossible to ignore:
                people wanted to choose, compare, shape and book a private day
                without endless forms, waiting or back-and-forth emails.
              </p>
              <p>
                The idea was too specific to hand over as a standard agency brief.
              </p>
              <p>
                To make it real, the founder learned to translate travel experience
                into product structure, booking logic and digital flow: how a
                guest chooses, how a private day is priced, how a route changes,
                how availability works, how a booking flow should feel, and how
                all of that could become a live experience-building system.
              </p>
              <p>
                The website, Studio flow and booking model were conceived,
                structured, written and built in-house — shaped from real
                conversations in the car, real itinerary changes, real guest
                hesitation and real operational constraints.
              </p>
              <p>
                That is why YES is not just a catalogue of tours. It is a
                founder-built private travel platform, created from the road and
                still refined through every real booking.
              </p>
            </div>
          </div>

          <figure className="lg:sticky lg:top-28">
            <img
              src={founderAsset.url}
              alt="Nídia Almeida hosting a private wine experience with YES Experiences Portugal guests."
              loading="lazy"
              className="w-full aspect-[4/3] object-cover"
            />
            <figcaption className="mt-3 text-xs text-[color:var(--charcoal-soft)]/80 leading-relaxed italic">
              Nídia Almeida, founder of YES Experiences Portugal, hosting a
              private wine experience in Portugal.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Founder-led */}
      <section className="py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Founder-led</Eyebrow>
          <SectionTitle as="h2" size="default">
            Designed with care. <SectionTitle.Em>Delivered by trusted locals</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              YES was created by Nídia Almeida, a Portuguese host and experience
              designer, after years of designing and leading private experiences
              across Portugal.
            </p>
            <p>
              Every Signature day, Studio composition and Travel Designer journey
              begins with local knowledge, real routes and carefully chosen
              details. The experiences are then delivered with a trusted circle of
              local guides, drivers, wineries, boats, restaurants, hosts and
              partners across Lisbon, Sintra, Cascais, Arrábida, Sesimbra,
              Setúbal, Comporta, Tróia, Évora and the wider Alentejo, Central
              Portugal, Porto, the Douro, the Algarve and the Atlantic coast.
            </p>
            <p>
              This is not anonymous reselling. It is not another operator's coach
              tour with a different logo. It is private Portugal, designed with
              intention and delivered by people who actually know the places they
              are showing.
            </p>
          </div>
        </div>
      </section>

      {/* What we create */}
      <section className="py-20 bg-[color:var(--sand)]">
        <div className="container-x">
          <Eyebrow flank>What we create</Eyebrow>
          <SectionTitle as="h2" size="default">
            Private days, live-designed experiences <SectionTitle.Em>and full journeys</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-10 grid md:grid-cols-2 gap-10 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              <strong className="text-[color:var(--charcoal)]">Signature Experiences</strong>{" "}
              are ready private days, already shaped from real routes, trusted
              partners and guest feedback.
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">The Experience Studio</strong>{" "}
              lets travellers design a private day in real time, choose the
              rhythm and route, see the price live and book securely when it
              feels right.
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">Travel Designer</strong>{" "}
              is for full Portugal journeys, multi-day itineraries, honeymoons,
              family trips, celebrations and complex private travel that
              deserves a complete proposal.
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">Moments and Corporate &amp; Groups</strong>{" "}
              bring the same approach to proposals, birthdays, anniversaries,
              incentives, client hospitality and private group days.
            </p>
          </div>
          <p className="mt-10 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            Different formats. Same principle: Portugal should be designed around
            the people living it.
          </p>
        </div>
      </section>

      {/* Credentials & trust */}
      <section className="py-16">
        <div className="container-x">
          <Eyebrow flank>Credentials &amp; trust</Eyebrow>
          <SectionTitle as="h2" size="default">
            Licensed, insured <SectionTitle.Em>and personally accountable</SectionTitle.Em>.
          </SectionTitle>

          <dl className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Licence</dt>
              <dd className="mt-2 font-display text-lg">RNAAT 31/2023</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Registered Portuguese tourism operator (Registo Nacional dos
                Agentes de Animação Turística).
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Founded</dt>
              <dd className="mt-2 font-display text-lg">2022</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Based in Sesimbra, Setúbal, operating across Portugal.
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Reviews</dt>
              <dd className="mt-2 font-display text-lg">700+ five-star</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Verified guest reviews across Tripadvisor, Viator, Google,
                GetYourGuide and other major travel platforms.
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Insurance</dt>
              <dd className="mt-2 font-display text-lg">Civil liability</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Vehicles, guests and operations covered under Portuguese
                tourism law.
              </p>
            </div>
          </dl>
        </div>
      </section>

      {/* How we work + policies */}
      <section className="py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-2 gap-14">
          <div>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Private, local and accountable from start to finish.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Private only.</strong>{" "}
                No shared coaches, no strangers in the car.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Designed around you.</strong>{" "}
                Choose a Signature, shape a Studio day in real time, or let a
                Travel Designer compose the full journey.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Instant reservation.</strong>{" "}
                Most Signature days and Studio compositions confirm in minutes
                through secure checkout.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Hotel pickup included.</strong>{" "}
                Available from Lisbon, Cascais, Estoril, Sintra, Sesimbra,
                Setúbal and other locations depending on the experience.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Real replies, fast.</strong>{" "}
                WhatsApp and email replies usually within the hour when the
                team is available.
              </li>
            </ul>
          </div>

          <div>
            <Eyebrow>Policies, briefly</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Clear, fair, written down.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Free cancellation</strong>{" "}
                up to 24h before the experience, full refund.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Weather</strong> —
                outdoor stops can be swapped on the day at no cost when safety
                or comfort requires it.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Privacy</strong> —
                we never sell or share guest data. See our{" "}
                <a href="/privacy" className="underline">privacy policy</a>.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Terms</strong> —{" "}
                <a href="/terms" className="underline">full terms &amp; conditions</a>{" "}
                are available before booking.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow flank>Talk to YES</Eyebrow>
          <SectionTitle as="h2" size="default">
            Talk directly to <SectionTitle.Em>a local designer</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            Email{" "}
            <a href="mailto:hello@yesexperiencesportugal.com" className="underline">
              hello@yesexperiencesportugal.com
            </a>
            <br />
            WhatsApp{" "}
            <a href="https://wa.me/351911889992" className="underline">
              +351 911 889 992
            </a>
            <br />
            Based in Sesimbra, Setúbal — Portugal.
          </p>
          <p className="mt-5 serif italic text-xl text-[color:var(--teal)]">
            Portugal, designed around you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <CtaButton to="/experiences" variant="primary">
              Start your private experience
            </CtaButton>
            <CtaButton to="/studio-v3" variant="ghost">
              Open the Studio
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
