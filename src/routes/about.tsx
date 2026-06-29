import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript, personFounderLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import img from "@/assets/why-image.jpg";

const TITLE = "About YES Experiences Portugal — Founder, RNAAT 31/2023";
const DESCRIPTION =
  "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT 31/2023) founded in 2022 by Nidia Almeida. Private Signature days and bespoke journeys in Lisbon, Sintra, Arrábida, Sesimbra and the Alentejo.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/about" },
      { property: "og:type", content: "profile" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/about" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ),
      jsonLdScript(personFounderLd()),
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
          <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
            A licensed Portuguese tour operator (RNAAT 31/2023), founded in 2022 by Nidia Almeida —
            host, designer, and the person who answers when you write to us.
          </p>
        </div>
      </section>

      {/* Founder */}
      <section className="py-20" itemScope itemType="https://schema.org/Person">
        <div className="container-x grid lg:grid-cols-2 gap-14 items-center">
          <img
            src={img}
            alt="Nidia Almeida, founder of YES Experiences Portugal"
            loading="lazy"
            className="w-full aspect-[4/5] object-cover"
            itemProp="image"
          />
          <div>
            <Eyebrow>Founder</Eyebrow>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
              <span itemProp="name">Nidia Almeida</span>
            </h2>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-[color:var(--gold)]" itemProp="jobTitle">
              Founder &amp; Lead Experience Designer
            </p>

            <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed" itemProp="description">
              YES Experiences Portugal started from scratch in 2022, built by a Portuguese host who
              fell for this work and never looked back. The idea was simple and a little stubborn:
              instead of the tours everyone already runs, create something different — intimate, real,
              and honestly Portuguese. Days that show the best of the country the way a local would
              show a close friend, not the way a brochure sells it.
            </p>

            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              Every Signature day, Studio composition and bespoke journey on this site is designed by
              Nidia and her team of local guides, drivers and partners across Lisbon, Sintra, Arrábida,
              Sesimbra and the Alentejo. We only run private experiences. We never resell another
              operator's coach tour as our own.
            </p>

            <a
              href="https://www.linkedin.com/in/nidiadealmeida"
              target="_blank"
              rel="noopener noreferrer me"
              itemProp="sameAs"
              className="mt-6 inline-flex items-center text-sm uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--gold)]"
            >
              Nidia on LinkedIn →
            </a>
          </div>
        </div>
      </section>

      {/* Credentials & trust */}
      <section className="py-16 bg-[color:var(--sand)]">
        <div className="container-x">
          <Eyebrow flank>Credentials &amp; trust</Eyebrow>
          <SectionTitle as="h2" size="default">
            Licensed, insured, <SectionTitle.Em>and signed by a real person</SectionTitle.Em>.
          </SectionTitle>

          <dl className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Licence</dt>
              <dd className="mt-2 font-display text-lg">RNAAT 31/2023</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Registered Portuguese tour operator (Registo Nacional dos Agentes de Viagens e Turismo).
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Founded</dt>
              <dd className="mt-2 font-display text-lg">2022</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Based in Sesimbra, operating across Lisbon, Sintra, Arrábida and the Alentejo.
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Reviews</dt>
              <dd className="mt-2 font-display text-lg">700+ five-star</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Verified guest reviews across Google, Tripadvisor and Viator.
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">Insurance</dt>
              <dd className="mt-2 font-display text-lg">Civil liability</dd>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Vehicles and operations covered under Portuguese tourism law.
              </p>
            </div>
          </dl>
        </div>
      </section>

      {/* How we work + policies */}
      <section className="py-20">
        <div className="container-x grid lg:grid-cols-2 gap-14">
          <div>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Private, designed in real time, signed by Nidia.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Private only.</strong> No shared
                coaches, no strangers in the car — ever.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Instant reservation.</strong> Most
                Signature days and Studio compositions confirm in minutes via secure checkout.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Hotel pickup included.</strong> From
                Lisbon, Cascais, Estoril, Sintra and the Setúbal Peninsula.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Real humans, fast.</strong> WhatsApp
                and email replies usually within the hour, by Nidia or the team.
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
                <strong className="text-[color:var(--charcoal)]">Free cancellation</strong> up to 24h
                before the experience, full refund.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Weather</strong> — outdoor stops can
                be swapped on the day at no cost when safety requires it.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Privacy</strong> — we never sell or
                share guest data. See our{" "}
                <a href="/privacy" className="underline">privacy policy</a>.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Terms</strong> —{" "}
                <a href="/terms" className="underline">full terms &amp; conditions</a>.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-[color:var(--sand)] text-center">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow flank>Talk to us</Eyebrow>
          <SectionTitle as="h2" size="default">
            Reach Nidia <SectionTitle.Em>directly</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            Email{" "}
            <a href="mailto:info@yesexperiencesportugal.com" className="underline">
              info@yesexperiencesportugal.com
            </a>{" "}
            · WhatsApp{" "}
            <a href="https://wa.me/351911889992" className="underline">
              +351 911 889 992
            </a>
            <br />
            Based in Sesimbra, Setúbal — Portugal.
          </p>
          <p className="mt-3 serif italic text-xl text-[color:var(--teal)]">
            Portugal, designed around you.
          </p>
          <CtaButton to="/experiences" variant="primary" className="mt-8">
            Explore Signature days
          </CtaButton>
        </div>
      </section>
    </SiteLayout>
  );
}
