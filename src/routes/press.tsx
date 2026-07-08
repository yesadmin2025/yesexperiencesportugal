import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript, personFounderLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

const TITLE = "Press & Brand Kit — YES Experiences Portugal";
const DESCRIPTION =
  "Press resources, company boilerplate, founder bio, logo kit and citation copy for YES Experiences Portugal — licensed Portuguese tour operator RNAAT 31/2023.";
const URL = "https://yesexperiencesportugal.com/press";
const OG_IMAGE = "https://yesexperiencesportugal.com/brand/yes-brand-board.png";

// Canonical NAP — keep in lockstep with src/lib/jsonld.ts
const NAP = {
  name: "YES Experiences Portugal",
  legal: "Licensed Portuguese tour operator — RNAAT 31/2023",
  founder: "Nídia Almeida (Founder & Lead Travel Designer)",
  founderRole: "Founder & Lead Travel Designer",
  founded: "2022",
  locality: "Sesimbra, Setúbal, Portugal",
  serviceArea: "Lisbon · Sintra · Arrábida · Sesimbra · Alentejo · Costa Vicentina",
  phone: "+351 911 889 992",
  email: "info@yesexperiencesportugal.com",
  website: "https://yesexperiencesportugal.com",
  languages: "English · Portuguese · Spanish",
  hours: "Daily 08:00–20:00 (WET/WEST)",
  responseSla: "Media enquiries answered within 24h on weekdays",
};

// Canonical citation block — directory-style. Keep intact.
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

// Prose citation for editorial partners (articles, roundups, newsletters).
const EDITORIAL_CITATION =
  "Private tours and multi-day journeys by YES Experiences Portugal — a licensed Portuguese travel studio (RNAAT 31/2023) based in Sesimbra: https://yesexperiencesportugal.com";

const COMPANY_SHORT =
  "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT 31/2023) designing private, emotionally intelligent day tours and multi-day journeys across Portugal. Founded in 2022 by Nídia Almeida, the studio works with a curated network of family wineries, chefs and local hosts to deliver experiences you cannot book off a shelf.";

const COMPANY_LONG =
  "YES Experiences Portugal is an independent Portuguese travel studio and licensed tour operator (RNAAT 31/2023), founded in 2022 in Sesimbra by Nídia Almeida. The company designs private day tours, bespoke multi-day journeys and private occasions — proposals, anniversaries, corporate retreats — across Lisbon, Sintra, Arrábida, Sesimbra, the Setúbal Peninsula, the Alentejo and the Costa Vicentina. Every itinerary is built around the guests rather than a fixed catalogue, drawing on long-standing relationships with family wineries, chefs, artisans and cultural hosts. YES has earned hundreds of five-star reviews across Google, Tripadvisor and Viator, and operates in English, Portuguese and Spanish.";

const FOUNDER_BIO_SHORT =
  "Founder and lead travel designer of YES Experiences Portugal — a licensed Portuguese tour operator (RNAAT 31/2023) crafting private, meaningful experiences across Lisbon, Sintra, Arrábida, Sesimbra and the Alentejo.";

const FOUNDER_BIO_LONG =
  "YES Experiences Portugal was founded in 2022 and designed end-to-end by Nídia Almeida — concept, brand, website and every itinerary, with no agency and no team behind the curtain. The aim was to offer travellers something Portugal had long missed: private, emotionally intelligent days shaped by a real host with deep local relationships in wine, gastronomy and culture, not by a marketplace algorithm.";

// Verified from Footer.tsx — single source of truth.
const SOCIAL = [
  {
    label: "Tripadvisor",
    href: "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html",
  },
  { label: "Instagram", href: "https://www.instagram.com/yesexperiencesportugal" },
  { label: "Facebook", href: "https://www.facebook.com/yesexperiencesportugal" },
  { label: "LinkedIn (founder)", href: "https://www.linkedin.com/in/nidiadealmeida" },
];

// Logo kit — real files present under /public/brand/.
const LOGO_LOCKUPS: Array<{ name: string; slug: string; use: string }> = [
  {
    name: "Centered — full colour",
    slug: "yes-experiences-portugal-centered-full",
    use: "Default. Light backgrounds (ivory, white).",
  },
  {
    name: "Centered — mono charcoal",
    slug: "yes-experiences-portugal-centered-mono-dark",
    use: "Single-colour print on light backgrounds.",
  },
  {
    name: "Centered — mono ivory",
    slug: "yes-experiences-portugal-centered-mono-light",
    use: "Reversed on dark backgrounds.",
  },
  {
    name: "Horizontal — full colour",
    slug: "yes-experiences-portugal-horizontal-full",
    use: "Headers, signage, wide layouts.",
  },
  {
    name: "Horizontal — mono charcoal",
    slug: "yes-experiences-portugal-horizontal-mono-dark",
    use: "Single-colour print on light backgrounds.",
  },
  {
    name: "Horizontal — mono ivory",
    slug: "yes-experiences-portugal-horizontal-mono-light",
    use: "Reversed on dark backgrounds.",
  },
];

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
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

function CopyBlock({ label, children }: { label: string; children: string }) {
  return (
    <>
      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
        {label}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
        {children}
      </p>
    </>
  );
}

function FactPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/50 px-3 py-1.5 text-[12px] leading-none tracking-wide text-[color:var(--charcoal)]/80">
      {children}
    </span>
  );
}

function PressPage() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Eyebrow>Press &amp; brand kit</Eyebrow>
        <SectionTitle>
          Resources for journalists, <em className="font-serif italic">editors and partners</em>
        </SectionTitle>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
          A single source of truth for citing YES Experiences Portugal. Please use the exact
          spelling, phone, and address below to keep listings consistent across Google, Tripadvisor,
          Visit Portugal and travel publications.
        </p>

        {/* Fact strip — scannable trust cues. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <FactPill>Founded 2022</FactPill>
          <FactPill>RNAAT 31/2023</FactPill>
          <FactPill>Hundreds of 5★ reviews</FactPill>
          <FactPill>EN · PT · ES</FactPill>
          <FactPill>Across Portugal</FactPill>
        </div>

        {/* About the company — the #1 gap: partners had no company boilerplate. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">About YES Experiences Portugal</h2>
          <CopyBlock label="Short (≤ 60 words)">{COMPANY_SHORT}</CopyBlock>
          <CopyBlock label="Long">{COMPANY_LONG}</CopyBlock>
        </section>

        {/* Editorial partner citation — prose one-liner. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Suggested wording for partners</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            When mentioning us in an article, roundup or newsletter, please copy this line.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/40 p-5 font-mono text-[13px] leading-relaxed text-[color:var(--charcoal)]">
            {EDITORIAL_CITATION}
          </pre>
        </section>

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Name, address &amp; phone (NAP)</h2>
          <dl className="mt-4">
            <Row label="Brand name" value={NAP.name} />
            <Row label="Legal status" value={NAP.legal} />
            <Row label="Founder" value={NAP.founderRole} />
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

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">
            Copy-ready citation block (directories)
          </h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Use this exact block when submitting to directories or press lists.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/40 p-5 font-mono text-[13px] leading-relaxed text-[color:var(--charcoal)]">
            {CITATION_BLOCK}
          </pre>
        </section>

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Founder bio — Nídia Almeida</h2>
          <CopyBlock label="Short (≤ 60 words)">{FOUNDER_BIO_SHORT}</CopyBlock>
          <CopyBlock label="Long">{FOUNDER_BIO_LONG}</CopyBlock>
          <p className="mt-4 text-xs text-[color:var(--charcoal)]/60">
            High-resolution founder headshot available on request —{" "}
            <a className="underline" href={`mailto:${NAP.email}`}>
              {NAP.email}
            </a>
            .
          </p>
        </section>

        {/* Verification links for journalists. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Find us online</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Verified profiles for reviews, reach and fact-checking.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[15px]">
            {SOCIAL.map((s) => (
              <li key={s.href}>
                <a
                  className="text-[color:var(--teal)] underline underline-offset-4"
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Logo kit — real files. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Logo kit</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Six official lockups. Each ships as vector (SVG, PDF) plus @1x/@2x/@3x PNG with a
            transparent background.
          </p>
          <ul className="mt-5 space-y-4 text-[15px]">
            {LOGO_LOCKUPS.map((lk) => (
              <li
                key={lk.slug}
                className="border-b border-[color:var(--charcoal)]/10 pb-4 last:border-b-0"
              >
                <p className="font-display text-[15px] text-[color:var(--charcoal)]">{lk.name}</p>
                <p className="mt-1 text-xs text-[color:var(--charcoal)]/60">{lk.use}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <a
                    className="text-[color:var(--teal)] underline underline-offset-4"
                    href={`/brand/svg/${lk.slug}.svg`}
                    download
                  >
                    SVG
                  </a>
                  <a
                    className="text-[color:var(--teal)] underline underline-offset-4"
                    href={`/brand/pdf/${lk.slug}.pdf`}
                    download
                  >
                    PDF
                  </a>
                  <a
                    className="text-[color:var(--teal)] underline underline-offset-4"
                    href={`/brand/png/${lk.slug}@1x.png`}
                    download
                  >
                    PNG @1x
                  </a>
                  <a
                    className="text-[color:var(--teal)] underline underline-offset-4"
                    href={`/brand/png/${lk.slug}@2x.png`}
                    download
                  >
                    PNG @2x
                  </a>
                  <a
                    className="text-[color:var(--teal)] underline underline-offset-4"
                    href={`/brand/png/${lk.slug}@3x.png`}
                    download
                  >
                    PNG @3x
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
            <a
              className="text-[color:var(--teal)] underline underline-offset-4"
              href="/brand/yes-brand-board.pdf"
              download
            >
              Brand board (PDF)
            </a>
            <a
              className="text-[color:var(--teal)] underline underline-offset-4"
              href="/brand/manifest.json"
              download
            >
              manifest.json
            </a>
            <a
              className="text-[color:var(--teal)] underline underline-offset-4"
              href="/favicon.svg"
              download
            >
              Favicon (SVG)
            </a>
          </div>
        </section>

        {/* Logo usage rules. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Logo usage</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
            <li>Use the official lockups above without modification.</li>
            <li>Maintain clear space equal to the height of the letter &ldquo;Y&rdquo; on all sides.</li>
            <li>Minimum width: 120px on screen, 30mm in print.</li>
            <li>Use the mono-light lockup on dark backgrounds; mono-dark on light backgrounds.</li>
            <li>
              Do not recolour, stretch, rotate, add drop shadows, or place the logo on low-contrast
              imagery.
            </li>
            <li>
              Primary palette: teal <code>#295B61</code>, gold <code>#C9A96A</code>, charcoal{" "}
              <code>#2E2E2E</code>, ivory <code>#FAF8F3</code>. Full palette on the brand board.
            </li>
          </ul>
        </section>

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Press contact</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">
            {NAP.founderRole}
            <br />
            <a
              className="text-[color:var(--teal)] underline underline-offset-4"
              href={`mailto:${NAP.email}`}
            >
              {NAP.email}
            </a>
            <br />
            <a
              className="text-[color:var(--teal)] underline underline-offset-4"
              href={`tel:${NAP.phone.replace(/\s/g, "")}`}
            >
              {NAP.phone}
            </a>
          </p>
          <p className="mt-3 text-xs text-[color:var(--charcoal)]/60">{NAP.responseSla}.</p>
          <p className="mt-6 text-sm">
            <Link to="/about" className="text-[color:var(--teal)] underline underline-offset-4">
              More about the studio →
            </Link>
          </p>
        </section>
      </article>
    </SiteLayout>
  );
}
