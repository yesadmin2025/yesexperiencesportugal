import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { breadcrumbLd, jsonLdScript, personFounderLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Scene } from "@/components/motion/Scene";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EMAIL, LICENSE_LABEL, PHONE_DISPLAY } from "@/config/business-nap";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const TITLE = "Press & Brand Kit — YES Experiences Portugal";
const DESCRIPTION =
  "Press resources, company boilerplate, founder bio, logo kit, backlink snippets and citation copy for YES Experiences Portugal — licensed Portuguese tour operator RNAAT nº 31/2023, operating nationwide.";
const URL = "https://yesexperiencesportugal.com/press";
const OG_IMAGE = "https://yesexperiencesportugal.com/brand/yes-brand-board.png";

// Canonical NAP — keep in lockstep with src/lib/jsonld.ts
const NAP = {
  name: "YES Experiences Portugal",
  legal: `Licensed Portuguese tour operator — ${LICENSE_LABEL}`,
  founder: "Nídia Almeida (Founder & Lead Travel Designer)",
  founderRole: "Founder & Lead Travel Designer",
  founded: "2022",
  locality: "Sesimbra, Setúbal, Portugal",
  serviceArea:
    "Nationwide across Portugal — with deep local networks in Lisbon, Sintra, Arrábida, Sesimbra, Alentejo, Costa Vicentina, Comporta, Évora, Douro, Porto, Azores and Madeira",
  phone: PHONE_DISPLAY,
  email: EMAIL,
  partnerships: "partnerships@yesexperiencesportugal.com",
  press: "press@yesexperiencesportugal.com",
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
  `Based in ${NAP.locality} — operating nationwide across Portugal`,
  `Phone: ${NAP.phone}`,
  `Email: ${NAP.email}`,
  `Website: ${NAP.website}`,
  `Languages: ${NAP.languages}`,
  `Hours: ${NAP.hours}`,
].join("\n");

// Prose citation for editorial partners (articles, roundups, newsletters).
const EDITORIAL_CITATION =
  "Private tours and multi-day journeys by YES Experiences Portugal — a licensed Portuguese travel studio (RNAAT nº 31/2023), based in Sesimbra and operating nationwide across Portugal: https://yesexperiencesportugal.com";

const COMPANY_SHORT =
  "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT nº 31/2023) designing private, emotionally intelligent day tours and multi-day journeys nationwide across Portugal. Founded in 2022 by Nídia Almeida, the studio works with a curated network of family wineries, chefs and local hosts to deliver experiences you cannot book off a shelf.";

const COMPANY_LONG =
  "YES Experiences Portugal is an independent Portuguese travel studio and licensed tour operator (RNAAT nº 31/2023), founded in 2022 in Sesimbra by Nídia Almeida. The company designs private day tours, bespoke multi-day journeys and private occasions — proposals, anniversaries, corporate retreats — nationwide across Portugal, from Lisbon, Sintra, Arrábida, Sesimbra, the Setúbal Peninsula, Comporta, the Alentejo and the Costa Vicentina to Évora, the Douro Valley, Porto, the Azores and Madeira. Every itinerary is built around the guests rather than a fixed catalogue, drawing on long-standing relationships with family wineries, chefs, artisans and cultural hosts. YES has earned hundreds of five-star reviews across Google, Tripadvisor and Viator, and operates in English, Portuguese and Spanish.";

const FOUNDER_BIO_SHORT =
  "Founder and lead travel designer of YES Experiences Portugal — a licensed Portuguese tour operator (RNAAT nº 31/2023) crafting private, meaningful experiences nationwide across Portugal.";

const FOUNDER_BIO_LONG =
  "YES Experiences Portugal was founded in 2022 and designed end-to-end by Nídia Almeida — concept, brand, website and every itinerary, with no agency and no team behind the curtain. The aim was to offer travellers something Portugal had long missed: private, emotionally intelligent days shaped by a real host with deep local relationships in wine, gastronomy and culture, not by a marketplace algorithm. The studio designs experiences the length of the country, from the Douro to the Algarve and the islands.";

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

// Backlink / HTML snippets partners can paste directly.
const HTML_TEXT_LINK = `<a href="https://yesexperiencesportugal.com" rel="noopener" target="_blank">YES Experiences Portugal</a> — licensed Portuguese travel studio (RNAAT nº 31/2023) designing private tours nationwide.`;

const HTML_LOGO_LINK = `<a href="https://yesexperiencesportugal.com" rel="noopener" target="_blank" aria-label="YES Experiences Portugal">
  <img src="https://yesexperiencesportugal.com/brand/png/yes-experiences-portugal-horizontal-full@2x.png"
       alt="YES Experiences Portugal"
       width="240" height="60" loading="lazy" />
</a>`;

const MARKDOWN_LINK = `[YES Experiences Portugal](https://yesexperiencesportugal.com) — licensed Portuguese travel studio (RNAAT nº 31/2023), private tours nationwide.`;

const BIBTEX = `@misc{yesexperiencesportugal,
  title  = {YES Experiences Portugal — Private Portugal Tours & Journeys},
  author = {{YES Experiences Portugal}},
  year   = {2022},
  note   = {Licensed tour operator RNAAT nº 31/2023, Sesimbra, Portugal},
  url    = {https://yesexperiencesportugal.com}
}`;

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

// Partnership CTAs — three lanes with distinct mailto subjects.
const PARTNERSHIP_LANES: Array<{
  title: string;
  body: string;
  cta: string;
  subject: string;
  to: string;
}> = [
  {
    title: "Hotels, villas & concierge",
    body: "Offer guests a private, licensed operator with 24h response and instant confirmation. Commercial terms, commission and rate cards on request.",
    cta: "Become a partner",
    subject: "Partnership — Hotel / Villa / Concierge",
    to: "partnerships",
  },
  {
    title: "Travel agencies, DMCs & TMCs",
    body: "White-label private day tours and multi-day journeys nationwide across Portugal. Net rates, dedicated designer, full liability cover.",
    cta: "Request net rates",
    subject: "Partnership — Agency / DMC / TMC",
    to: "partnerships",
  },
  {
    title: "Media, publishers & creators",
    body: "Press trips, on-the-record quotes from the founder, high-resolution imagery, expert commentary on Portugal travel trends.",
    cta: "Pitch a story or request assets",
    subject: "Press — Story / Assets / Interview",
    to: "press",
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
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
          {label}
        </p>
        <CopyButton value={children} />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--charcoal)]/85">{children}</p>
    </div>
  );
}

function FactPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/50 px-3 py-1.5 text-[12px] leading-none tracking-wide text-[color:var(--charcoal)]/80">
      {children}
    </span>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/75 transition hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)]"
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Snippet({ label, code, filename }: { label: string; code: string; filename?: string }) {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {filename && (
            <a
              className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--teal)] underline underline-offset-4"
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(code)}`}
              download={filename}
            >
              Download
            </a>
          )}
          <CopyButton value={code} />
        </div>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/40 p-5 font-mono text-[13px] leading-relaxed text-[color:var(--charcoal)]">
        {code}
      </pre>
    </div>
  );
}

function PressPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Scene>
          <div className="scene-atmosphere">
            <Eyebrow>Press &amp; brand kit</Eyebrow>
          </div>
          <div className="scene-title">
            <SectionTitle>
              Resources for journalists, <em className="font-serif italic">editors and partners</em>
            </SectionTitle>
          </div>
          <p className="scene-body mt-5 max-w-2xl text-[15px] leading-relaxed text-[color:var(--charcoal)]/80">
            A single source of truth for citing YES Experiences Portugal. Please use the exact
            spelling, phone and address below to keep listings consistent across Google, Tripadvisor,
            Visit Portugal and travel publications. Every text block, HTML snippet and logo file on
            this page is copy-and-paste ready.
          </p>
        </Scene>

        {/* Fact strip — scannable trust cues. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <FactPill>Founded 2022</FactPill>
          <FactPill>RNAAT nº 31/2023</FactPill>
          <FactPill>Hundreds of 5★ reviews</FactPill>
          <FactPill>EN · PT · ES</FactPill>
          <FactPill>Nationwide across Portugal</FactPill>
        </div>

        {/* Partnerships — three lanes with distinct mailto subjects. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Work with us</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Three ways to partner. Emails go straight to a human — no forms, no queues.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PARTNERSHIP_LANES.map((lane) => (
              <li
                key={lane.title}
                className="flex flex-col rounded-md border border-[color:var(--charcoal)]/10 bg-[color:var(--sand)]/40 p-5"
              >
                <p className="font-display text-[15px] text-[color:var(--charcoal)]">{lane.title}</p>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[color:var(--charcoal)]/75">
                  {lane.body}
                </p>
                <a
                  className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[color:var(--teal)] underline underline-offset-4"
                  href={`mailto:${
                    lane.to === "press" ? NAP.press : NAP.partnerships
                  }?subject=${encodeURIComponent(lane.subject)}`}
                >
                  {lane.cta} →
                </a>
              </li>
            ))}
          </ul>
        </section>

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
          <Snippet label="Editorial one-liner" code={EDITORIAL_CITATION} />
        </section>

        {/* Backlink & HTML snippets — for hoteliers, DMCs, bloggers. */}
        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Backlink &amp; embed snippets</h2>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/70">
            Paste any of these into your CMS. Please link to{" "}
            <code>https://yesexperiencesportugal.com</code> (or a relevant deeper page such as{" "}
            <code>/portugal-tours</code>) using a <code>dofollow</code> link — no{" "}
            <code>rel=&quot;nofollow&quot;</code>, no <code>rel=&quot;sponsored&quot;</code>, no
            URL shorteners. Preferred anchor text: <em>YES Experiences Portugal</em>,{" "}
            <em>private Portugal tours</em>, or <em>licensed Portuguese travel studio</em>.
          </p>
          <Snippet label="HTML — text link" code={HTML_TEXT_LINK} filename="yes-text-link.html" />
          <Snippet label="HTML — logo + link" code={HTML_LOGO_LINK} filename="yes-logo-link.html" />
          <Snippet label="Markdown" code={MARKDOWN_LINK} filename="yes-link.md" />
          <Snippet label="BibTeX (academic / long-form)" code={BIBTEX} filename="yes.bib" />
        </section>

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Name, address &amp; phone (NAP)</h2>
          <dl className="mt-4">
            <Row label="Brand name" value={NAP.name} />
            <Row label="Legal status" value={NAP.legal} />
            <Row label="Founder" value={NAP.founderRole} />
            <Row label="Founded" value={NAP.founded} />
            <Row label="Based in" value={NAP.locality} />
            <Row label="Service area" value={NAP.serviceArea} />
            <Row label="Phone" value={NAP.phone} />
            <Row label="Email" value={NAP.email} />
            <Row label="Press" value={NAP.press} />
            <Row label="Partnerships" value={NAP.partnerships} />
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
          <Snippet label="Directory citation" code={CITATION_BLOCK} filename="yes-citation.txt" />
        </section>

        <section className="reveal mt-14">
          <h2 className="font-display text-xl font-semibold">Founder bio — Nídia Almeida</h2>
          <CopyBlock label="Short (≤ 60 words)">{FOUNDER_BIO_SHORT}</CopyBlock>
          <CopyBlock label="Long">{FOUNDER_BIO_LONG}</CopyBlock>
          <p className="mt-4 text-xs text-[color:var(--charcoal)]/60">
            High-resolution founder headshot available on request —{" "}
            <a className="underline" href={`mailto:${NAP.press}`}>
              {NAP.press}
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
              Primary palette: teal <code>var(--teal)</code>, gold <code>var(--gold)</code>, charcoal{" "}
              <code>var(--charcoal)</code>, ivory <code>var(--ivory)</code>. Full palette on the brand board.
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
              href={`mailto:${NAP.press}`}
            >
              {NAP.press}
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
