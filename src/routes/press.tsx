import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript, personFounderLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

const TITLE = "Press & Brand Kit — YES Experiences Portugal";
const DESCRIPTION =
  "Press resources, NAP citation block, founder bio and brand assets for YES Experiences Portugal — licensed Portuguese tour operator RNAAT 31/2023.";
const URL = "https://yesexperiencesportugal.com/press";

// Canonical NAP — keep in lockstep with src/lib/jsonld.ts
const NAP = {
  name: "YES Experiences Portugal",
  legal: "Licensed Portuguese tour operator — RNAAT 31/2023",
  founder: "Nidia Almeida (Founder & Lead Travel Designer)",
  founded: "2022",
  locality: "Sesimbra, Setúbal, Portugal",
  serviceArea: "Lisbon · Sintra · Arrábida · Sesimbra · Alentejo · Évora",
  phone: "+351 911 889 992",
  email: "info@yesexperiencesportugal.com",
  website: "https://yesexperiencesportugal.com",
  languages: "English · Portuguese · Spanish · French",
  hours: "Daily 08:00–20:00 (WET/WEST)",
};

const CITATION_BLOCK = [
  NAP.name,
  NAP.legal,
  `Founded ${NAP.founded} by ${NAP.founder}`,
  NAP.locality,
  `Phone: ${NAP.phone}`,
  `Email: ${NAP.email}`,
  `Website: ${NAP.website}`,
  `Languages: ${NAP.languages}`,
  `Hours: ${NAP.hours}`,
].join("\n");

const FOUNDER_BIO_SHORT =
  "Nidia Almeida is the founder and lead travel designer of YES Experiences Portugal — a licensed Portuguese tour operator (RNAAT 31/2023) crafting private, meaningful experiences across Lisbon, Sintra, Arrábida, Sesimbra and the Alentejo.";

const FOUNDER_BIO_LONG =
  "YES Experiences Portugal was founded in 2022 and designed end-to-end by one person — concept, brand, website and every itinerary, with no agency and no team behind the curtain. The aim was to offer travellers something Portugal had long missed: private, emotionally intelligent days shaped by a real host with deep local relationships in wine, gastronomy and culture, not by a marketplace algorithm.";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Press", path: "/press" },
        ]),
      ),
      jsonLdScript(personFounderLd()),
    ],
  }),
  component: PressPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-[color:var(--charcoal)]/10 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
        {label}
      </dt>
      <dd className="font-display text-[15px] text-[color:var(--charcoal)]">{value}</dd>
    </div>
  );
}

function PressPage() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Eyebrow>Press &amp; brand kit</Eyebrow>
        <SectionTitle>
          Resources for journalists, <em className="font-serif italic">editors and directories</em>
        </SectionTitle>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
          A single source of truth for citing YES Experiences Portugal. Please use the exact spelling, phone, and address below to keep
          listings consistent across Google, Tripadvisor, Visit Portugal and travel publications.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Name, address &amp; phone (NAP)</h2>
          <dl className="mt-4">
            <Row label="Brand name" value={NAP.name} />
            <Row label="Legal status" value={NAP.legal} />
            <Row label="Founder" value={NAP.founder} />
            <Row label="Founded" value={NAP.founded} />
            <Row label="Location" value={NAP.locality} />
            <Row label="Service area" value={NAP.serviceArea} />
            <Row label="Phone" value={NAP.phone} />
            <Row label="Email" value={NAP.email} />
            <Row label="Website" value={NAP.website} />
            <Row label="Languages" value={NAP.languages} />
            <Row label="Hours" value={NAP.hours} />
          </dl>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Copy-ready citation block</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Use this exact block when submitting to directories or press lists.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/40 p-5 font-mono text-[13px] leading-relaxed text-[color:var(--charcoal)]">
{CITATION_BLOCK}
          </pre>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Founder bio</h2>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">Short (≤ 60 words)</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">{FOUNDER_BIO_SHORT}</p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">Long</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">{FOUNDER_BIO_LONG}</p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Brand assets</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li>
              <a className="text-[color:var(--teal)] underline underline-offset-4" href="/brand/logo-script.svg" download>
                Logo — script (SVG)
              </a>
            </li>
            <li>
              <a className="text-[color:var(--teal)] underline underline-offset-4" href="/brand/logo-script.png" download>
                Logo — script (PNG, transparent)
              </a>
            </li>
            <li>
              <a className="text-[color:var(--teal)] underline underline-offset-4" href="/favicon.svg" download>
                Favicon (SVG)
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-[color:var(--charcoal)]/60">
            If an asset 404s, request the latest pack at <a className="underline" href={`mailto:${NAP.email}`}>{NAP.email}</a>.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Press contact</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
            {NAP.founder}
            <br />
            <a className="text-[color:var(--teal)] underline underline-offset-4" href={`mailto:${NAP.email}`}>
              {NAP.email}
            </a>
            <br />
            <a className="text-[color:var(--teal)] underline underline-offset-4" href={`tel:${NAP.phone.replace(/\s/g, "")}`}>
              {NAP.phone}
            </a>
          </p>
        </section>
      </article>
    </SiteLayout>
  );
}
