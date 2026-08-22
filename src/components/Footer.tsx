import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ShieldCheck, BadgeCheck, Lock, ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PaymentMethodsRow } from "@/components/trust/PaymentMethodsRow";
import { LivroReclamacoesBadge } from "@/components/trust/LivroReclamacoesBadge";
import { TrustindexBadge } from "@/components/trust/TrustindexBadge";
import { TrustindexWidget } from "@/components/trust/TrustindexWidget";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibleIconLink } from "@/components/AccessibleIconLink";
import {
  InstagramIcon,
  FacebookIcon,
  TripadvisorIcon,
  WhatsAppIcon,
  ViatorIcon,
  GetYourGuideIcon,
} from "@/components/BrandIcon";

import { openCookieConsent } from "@/components/CookieConsent";
import {
  BASED_IN,
  BUSINESS_NAME,
  EMAIL,
  EMAIL_HREF,
  LICENSE_NUMBER,
  LICENSE_SHORT,
  PHONE_DISPLAY,
  PHONE_HREF,
  SOCIAL,
  whatsappUrl,
} from "@/config/business-nap";

const LEGAL_META_LINE = BASED_IN;

/* ---------------------------------------------------------------------------
   Footer — three zones, one rhythm.

   A. BRAND    logo · tagline · social
   B. NAVIGATE 4 nav columns + two SEO link groups (collapsible on mobile)
   C. TRUST    credentials · payments · partners · legal bar · official seal

   Design rules enforced here:
   - a single hairline weight, used only between zones (not between sub-blocks)
   - one vertical rhythm: 40px between zones, 24px inside a zone
   - identical eyebrow heading style everywhere
   - left alignment on every breakpoint; only the closing seal is centered
--------------------------------------------------------------------------- */

const EYEBROW_CLASS =
  "font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)]";

const LINK_CLASS =
  "link-hairline-gold tap inline-flex min-h-[28px] items-center text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]";

const ICON_LINK_CLASS =
  "tap inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] hover:ring-[color:var(--gold-warm)]/70 transition-colors duration-[var(--dur-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]";

interface FooterLink {
  to: string;
  label: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

const NAV_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Experiences",
    links: [
      { to: "/experiences", label: "All Experiences" },
      { to: "/day-tours", label: "Day Experiences" },
      { to: "/portugal-travel-designer", label: "Travel Designer" },
      { to: "/multi-day", label: "Multi-Day Journeys" },
      { to: "/studio-v3", label: "Experience Studio" },
    ],
  },
  {
    title: "Occasions",
    links: [
      { to: "/proposal-in-portugal", label: "Moments" },
      { to: "/corporate", label: "Corporate" },
      { to: "/contact", search: { type: "corporate" }, label: "Private Groups" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About YES" },
      { to: "/local-stories", label: "Local Stories" },
      { to: "/trade", label: "For Travel Advisors & Agencies" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

const SIGNATURE_TOURS: FooterLink[] = [
  {
    to: "/tours/$tourId",
    params: { tourId: "arrabida-wine-allinclusive" },
    label: "Arrábida Wine & Coast",
  },
  {
    to: "/tours/$tourId",
    params: { tourId: "wild-beaches-picnic" },
    label: "Wild Beaches & Picnic",
  },
  { to: "/tours/$tourId", params: { tourId: "arrabida-boat" }, label: "Arrábida Boat" },
  { to: "/tours/$tourId", params: { tourId: "tiles-workshop" }, label: "Tiles Workshop" },
  { to: "/tours/$tourId", params: { tourId: "azeitao-cheese" }, label: "Azeitão Cheese & Wine" },
  { to: "/tours/$tourId", params: { tourId: "sintra-cascais" }, label: "Sintra & Cascais" },
  { to: "/tours/$tourId", params: { tourId: "troia-comporta" }, label: "Tróia & Comporta" },
  { to: "/tours/$tourId", params: { tourId: "evora-alentejo" }, label: "Évora & Alentejo" },
  { to: "/tours/$tourId", params: { tourId: "tomar-coimbra" }, label: "Tomar & Coimbra" },
  {
    to: "/tours/$tourId",
    params: { tourId: "fatima-nazare-obidos" },
    label: "Fátima, Nazaré & Óbidos",
  },
  {
    to: "/tours/$tourId",
    params: { tourId: "roman-heritage-alentejo" },
    label: "Roman Heritage Alentejo",
  },
  {
    to: "/tours/$tourId",
    params: { tourId: "southwest-vicentine-coast" },
    label: "Southwest Vicentine Coast",
  },
];

const POPULAR_SEARCHES: FooterLink[] = [
  { to: "/portugal-tours", label: "Portugal tours" },
  { to: "/luxury-tours-portugal", label: "Luxury Portugal tours" },
  { to: "/private-tours-portugal", label: "Private tours Portugal" },
  {
    to: "/local-stories/$slug",
    params: { slug: "portugal-wine-tours" },
    label: "Portugal wine tours",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "sintra-day-tour-from-lisbon" },
    label: "Sintra day tour from Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "private-wine-tour-lisbon" },
    label: "Private wine tour Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "arrabida-day-trip-from-lisbon" },
    label: "Arrábida day trip from Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "best-day-trips-from-lisbon" },
    label: "Day trips from Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "alentejo-wine-tour-from-lisbon" },
    label: "Alentejo wine tour from Lisbon",
  },
  { to: "/itineraries/10-day-private-portugal-tour", label: "10-day private Portugal tour" },
  { to: "/portugal-travel-designer", label: "Portugal travel designer" },
  { to: "/proposal-in-portugal", label: "Proposal in Portugal" },
];

const CREDENTIALS: { Icon: typeof BadgeCheck; label: ReactNode }[] = [
  {
    Icon: BadgeCheck,
    label: (
      <>
        {LICENSE_SHORT} <span className="tabular-nums">nº {LICENSE_NUMBER}</span>
      </>
    ),
  },
  { Icon: ShieldCheck, label: "Turismo de Portugal" },
  { Icon: Lock, label: "Secure checkout · Stripe" },
];

const LEGAL_LINKS: FooterLink[] = [
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/press", label: "Press & brand" },
];

export function Footer() {
  return (
    <footer className="relative bg-[color:var(--charcoal)] text-[color:var(--ivory)]">
      {/* Champagne hairline — handoff from the ivory section above. */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--gold-warm) 80%, transparent) 50%, transparent)",
        }}
      />

      <div className="container-x py-12 md:py-14">
        {/* ── ZONE A — BRAND ─────────────────────────────────────────── */}
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0 max-w-md">
            <Link
              to="/"
              className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              aria-label="YES experiences PORTUGAL — Home"
            >
              <Logo
                theme="gold-on-charcoal"
                loading="lazy"
                className="block h-[46px] md:h-[52px] w-auto select-none"
              />
            </Link>
            <p
              className="mt-5 font-[family-name:var(--font-sans)] text-[14px] text-[color:var(--ivory)]/85 leading-[1.65]"
              style={{ fontWeight: 400, letterSpacing: "0.005em" }}
            >
              Private Portugal, shown the way a local shows a friend. Intimate, real, and genuinely
              different — designed with you and confirmed in minutes. 700+ five-star reviews.
            </p>
            {/* Canonical NAP — one quiet line, single source of truth. */}
            <address className="mt-4 not-italic font-[family-name:var(--font-sans)] text-[13px] leading-[1.7] text-[color:var(--ivory)]/70">
              <a href={EMAIL_HREF} className={LINK_CLASS}>
                {EMAIL}
              </a>
              <span aria-hidden="true" className="mx-2 text-[color:var(--ivory)]/35">
                ·
              </span>
              <a href={PHONE_HREF} className={LINK_CLASS}>
                {PHONE_DISPLAY}
              </a>
            </address>
          </div>

          <ul className="flex flex-wrap items-center gap-2.5" aria-label="Social channels">
            {[
              { href: SOCIAL.instagram, label: "Instagram", Icon: InstagramIcon },
              { href: SOCIAL.facebook, label: "Facebook", Icon: FacebookIcon },
              { href: SOCIAL.tripadvisor, label: "Tripadvisor", Icon: TripadvisorIcon },
              { href: whatsappUrl(), label: "WhatsApp", Icon: WhatsAppIcon },
            ].map(({ href, label, Icon }) => (
              <li key={label}>
                <AccessibleIconLink
                  href={href}
                  external
                  label={label}
                  tooltip={label}
                  className={ICON_LINK_CLASS}
                >
                  <Icon size={16} />
                </AccessibleIconLink>
              </li>
            ))}
          </ul>
        </div>

        {/* ── ZONE B — NAVIGATE ──────────────────────────────────────── */}
        <div className="mt-10 pt-10 border-t border-[color:var(--gold-warm)]/15">
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4">
            {NAV_COLUMNS.map((col) => (
              <FooterCol key={col.title} title={col.title} links={col.links} />
            ))}
            <FooterCol title="Legal" links={LEGAL_LINKS} />
          </div>

          <div className="mt-9 grid gap-6 md:mt-10 md:grid-cols-2 md:gap-10">
            <FooterLinkGroup title="Signature Experiences" links={SIGNATURE_TOURS} />
            <FooterLinkGroup title="Popular searches" links={POPULAR_SEARCHES} />
          </div>
        </div>

        {/* ── ZONE C — TRUST & LEGAL ─────────────────────────────────── */}
        <div className="mt-10 pt-10 border-t border-[color:var(--gold-warm)]/15">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            {/* Credentials */}
            <ul
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6"
              aria-label="Credentials and secure checkout"
            >
              {CREDENTIALS.map(({ Icon, label }, i) => (
                <li key={i} className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--gold-warm)]">
                    <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span
                    className={`${EYEBROW_CLASS} text-[10.5px] tracking-[0.2em] leading-[1.5]`}
                    style={{ fontWeight: 600 }}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            {/* Also listed on */}
            <div className="min-w-0">
              <h2 className={`${EYEBROW_CLASS} mb-3`} style={{ fontWeight: 600 }}>
                Also listed on
              </h2>
              <ul className="flex items-center gap-2.5" aria-label="Distribution partners">
                {[
                  {
                    href: "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
                    label: "Viator",
                    Icon: ViatorIcon,
                  },
                  {
                    href: "https://www.getyourguide.com/yesexperiences-portugal-s249432/",
                    label: "GetYourGuide",
                    Icon: GetYourGuideIcon,
                  },
                  { href: SOCIAL.tripadvisor, label: "Tripadvisor", Icon: TripadvisorIcon },
                ].map(({ href, label, Icon }) => (
                  <li key={label}>
                    <AccessibleIconLink
                      href={href}
                      external
                      label={`Also listed on ${label}`}
                      tooltip={label}
                      className={ICON_LINK_CLASS}
                    >
                      <Icon size={16} />
                    </AccessibleIconLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payments */}
          <div className="mt-8">
            <PaymentMethodsRow />
          </div>

          {/* Legal bar */}
          <div className="mt-8 pt-6 border-t border-[color:var(--gold-warm)]/15">
            <div
              className="flex flex-col gap-4 font-[family-name:var(--font-sans)] text-[12px] text-[color:var(--ivory)]/75 md:flex-row md:items-center md:justify-between"
              style={{ fontWeight: 400 }}
            >
              <p className="leading-[1.6] text-[color:var(--ivory)]/75">
                © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved. ·{" "}
                {LEGAL_META_LINE}.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <LanguageSwitcher variant="footer" className="text-[color:var(--ivory)]/75" />
                <span aria-hidden="true" className="text-[color:var(--text-on-dark-muted)]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={openCookieConsent}
                  className={`${LINK_CLASS} text-[12px] text-[color:var(--ivory)]/75`}
                >
                  Cookie preferences
                </button>
              </div>
            </div>

            {/* Trust seals — review certificate + official complaints book,
                side by side on one line at every width (scaled down on very
                narrow phones instead of wrapping). */}
            <div className="mt-6 flex w-full min-w-0 flex-nowrap items-center justify-center gap-x-3 text-center max-[359px]:scale-[0.86] sm:gap-x-6">
              <TrustindexBadge />
              <LivroReclamacoesBadge />
            </div>

            {/* Vendor loader — verifies the domain with Trustindex. Renders no
                layout of its own; the visible seal above stays ours. */}
            <TrustindexWidget />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-0">
      <h2 className={`${EYEBROW_CLASS} mb-4`} style={{ fontWeight: 600 }}>
        {title}
      </h2>
      <ul
        className="space-y-2 font-[family-name:var(--font-sans)] text-[14px]"
        style={{ fontWeight: 400 }}
      >
        {links.map((l) => (
          <li key={`${l.to}:${l.label}`}>
            <Link to={l.to} params={l.params} search={l.search} className={LINK_CLASS}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * SEO link group. Collapsed behind a toggle on mobile, always expanded from
 * md up. Links stay in the DOM at every width, so crawlers see the full index.
 */
function FooterLinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);
  const id = `footer-group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-3 py-2 text-left md:pointer-events-none md:py-0"
      >
        <h2 className={EYEBROW_CLASS} style={{ fontWeight: 600 }}>
          {title}
        </h2>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-[color:var(--gold-warm)] transition-transform duration-[var(--dur-quick)] md:hidden ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <ul
        id={id}
        className={`mt-3 grid-cols-1 gap-x-6 gap-y-2 font-[family-name:var(--font-sans)] text-[13px] sm:grid-cols-2 md:grid ${
          open ? "grid" : "hidden"
        }`}
        style={{ fontWeight: 400 }}
      >
        {links.map((l) => (
          <li key={`${l.to}:${l.label}`}>
            <Link
              to={l.to}
              params={l.params}
              search={l.search}
              className={`${LINK_CLASS} text-[color:var(--ivory)]/75`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
