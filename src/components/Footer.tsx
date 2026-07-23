import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { ShieldCheck, BadgeCheck, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PaymentMethodsRow } from "@/components/trust/PaymentMethodsRow";
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
  LICENSE_NUMBER,
  LICENSE_SHORT,
  SOCIAL,
  whatsappUrl,
} from "@/config/business-nap";




const LEGAL_META_LINE = BASED_IN;

interface FooterLink {
  to: string;
  label: string;
  external?: boolean;
}

const SIGNATURE_TOURS: { slug: string; label: string }[] = [
  { slug: "arrabida-wine-allinclusive", label: "Arrábida Wine & Coast" },
  { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
  { slug: "arrabida-boat", label: "Arrábida Boat" },
  { slug: "tiles-workshop", label: "Tiles Workshop" },
  { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
  { slug: "sintra-cascais", label: "Sintra & Cascais" },
  { slug: "troia-comporta", label: "Tróia & Comporta" },
  { slug: "evora-alentejo", label: "Évora & Alentejo" },
  { slug: "tomar-coimbra", label: "Tomar & Coimbra" },
  { slug: "fatima-nazare-obidos", label: "Fátima, Nazaré & Óbidos" },
  { slug: "roman-heritage-alentejo", label: "Roman Heritage Alentejo" },
  { slug: "southwest-vicentine-coast", label: "Southwest Vicentine Coast" },
];

export function Footer() {
  return (
    <footer className="relative bg-[color:var(--charcoal)] text-[color:var(--ivory)]">
      {/* Thin champagne-gold top hairline — visual handoff from the
          ivory final-CTA section into the footer. Decorative.
          Bumped to --gold-warm so the rim reads as champagne, not grey. */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--gold-warm) 80%, transparent) 50%, transparent)",
        }}
      />
      {/* Compact pass: vertical rhythm tightened (py-14/16 → py-10/12) so
          the footer reads as a refined close, not a heavy template block. */}
      <div className="container-x py-10 md:py-12">
        {/* Brand row — logo + tagline. Sits above the column grid so
            the 4 nav columns can breathe at desktop. */}
        <div className="max-w-3xl">
          <Link
            to="/"
            className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
            aria-label="YES experiences PORTUGAL — Home"
          >
            {/* Logo height tightened (56/60 → 48/52) so the brand row reads
                as a quiet sign-off rather than a second hero. */}
            <Logo
              theme="gold-on-charcoal"
              loading="lazy"
              className="block h-[48px] md:h-[52px] w-auto select-none"
            />
          </Link>
          <p
            className="mt-5 font-[family-name:var(--font-sans)] text-[14px] text-[color:var(--ivory)]/85 leading-[1.65] max-w-md"
            style={{ fontWeight: 400, letterSpacing: "0.005em" }}
          >
            Private Portugal, shown the way a local shows a friend. Intimate, real, and genuinely
            different — designed with you and confirmed in minutes. 700+ five-star reviews.
          </p>

        </div>

        {/* 4-column nav grid — gap tightened (gap-10 → gap-8) so the column
            cluster reads as a single block, not four separate posters. */}
        <div className="mt-9 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-8">
          <FooterCol
            title="Experiences"
            links={[
              { to: "/experiences", label: "All Experiences" },
              { to: "/day-tours", label: "Day Experiences" },
              { to: "/multi-day", label: "Travel Designer" },
              { to: "/studio-v3", label: "Experience Studio" },
            ]}
          />
          <FooterCol
            title="Occasions"
            links={[
              { to: "/proposal-in-portugal", label: "Moments" },
              { to: "/corporate", label: "Corporate" },
              { to: "/contact", label: "Private Groups" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: "/about", label: "About YES" },
              { to: "/local-stories", label: "Local Stories" },
              { to: "/contact", label: "Contact" },
            ]}
          />
          <div>
            <h4
              className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5"
              style={{ fontWeight: 600 }}
            >
              Connect
            </h4>
            <ul className="flex flex-wrap items-center gap-3" aria-label="Social channels">
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
                    className="tap inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] hover:ring-[color:var(--gold-warm)]/70 transition-colors duration-[var(--dur-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                  >
                    <Icon size={16} />
                  </AccessibleIconLink>
                </li>
              ))}
            </ul>
          </div>

        </div>



        {/* Payment-provider names intentionally hidden — guests see only
            "Instant confirmation" and "Secure checkout" copy throughout. */}

        {/* Popular searches — high-intent US/Canada queries. Moved out of
            the homepage in the declutter pass so SEO surface survives. */}
        <div className="mt-10 pt-8 border-t border-[color:var(--gold-warm)]/15">
          <h4
            className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5"
            style={{ fontWeight: 600 }}
          >
            Popular searches
          </h4>
          <ul
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 font-[family-name:var(--font-sans)] text-[13px]"
            style={{ fontWeight: 400 }}
          >
            {[
              { to: "/portugal-tours", label: "Portugal tours" },
              { to: "/luxury-tours-portugal", label: "Luxury Portugal tours" },
              { to: "/private-tours-portugal", label: "Private tours Portugal" },
              { to: "/local-stories/$slug", params: { slug: "portugal-wine-tours" }, label: "Portugal wine tours" },
              { to: "/local-stories/$slug", params: { slug: "sintra-day-tour-from-lisbon" }, label: "Sintra day tour from Lisbon" },
              { to: "/local-stories/$slug", params: { slug: "private-wine-tour-lisbon" }, label: "Private wine tour Lisbon" },
              { to: "/local-stories/$slug", params: { slug: "arrabida-day-trip-from-lisbon" }, label: "Arrábida day trip from Lisbon" },
              { to: "/local-stories/$slug", params: { slug: "best-day-trips-from-lisbon" }, label: "Day trips from Lisbon" },
              { to: "/local-stories/$slug", params: { slug: "alentejo-wine-tour-from-lisbon" }, label: "Alentejo wine tour from Lisbon" },
              {
                to: "/itineraries/10-day-private-portugal-tour",
                label: "10-day private Portugal tour",
              },
              { to: "/multi-day", label: "Portugal Travel Designer" },
              { to: "/proposal-in-portugal", label: "Proposal in Portugal" },
            ].map((l) => (
              <li key={`${l.to}:${l.label}`}>
                <Link
                  to={l.to}
                  params={"params" in l ? l.params : undefined}
                  className="link-hairline-gold tap text-[color:var(--ivory)]/80 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                >
                  {l.label}
                </Link>
              </li>

            ))}
          </ul>
        </div>

        {/* Signature Experiences — full tour index. Every page links to every
            tour, so crawlers discover the whole catalog from a single hop. */}
        <div className="mt-10 pt-8 border-t border-[color:var(--gold-warm)]/15">
          <h4
            className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5"
            style={{ fontWeight: 600 }}
          >
            Signature Experiences
          </h4>
          <ul
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 font-[family-name:var(--font-sans)] text-[13px]"
            style={{ fontWeight: 400 }}
          >
            {SIGNATURE_TOURS.map((t) => (
              <li key={t.slug}>
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: t.slug }}
                  className="link-hairline-gold tap text-[color:var(--ivory)]/80 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Also listed on — distribution partners trust strip.
            Links to the /partners hub and each platform subpage. */}
        <div className="mt-10 pt-8 border-t border-[color:var(--gold-warm)]/15">
          <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center md:items-start gap-1">
              <h4
                className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)]"
                style={{ fontWeight: 600 }}
              >
                Also listed on
              </h4>
              <Link
                to="/partners"
                className="link-hairline-gold tap text-[12px] text-[color:var(--ivory)]/75 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                View all distribution partners
              </Link>
            </div>
            <ul
              className="flex flex-wrap items-center justify-center gap-3"
              aria-label="Distribution partners"
            >
              {[
                { to: "/partners/viator", label: "Viator", Icon: ViatorIcon },
                { to: "/partners/getyourguide", label: "GetYourGuide", Icon: GetYourGuideIcon },
                { to: "/partners/tripadvisor", label: "Tripadvisor", Icon: TripadvisorIcon },
              ].map(({ to, label, Icon }) => (
                <li key={label}>
                  <AccessibleIconLink
                    to={to}
                    label={`Also listed on ${label}`}
                    tooltip={label}
                    className="tap inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] hover:ring-[color:var(--gold-warm)]/70 transition-colors duration-[var(--dur-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                  >
                    <Icon size={16} />
                  </AccessibleIconLink>
                </li>
              ))}
            </ul>
          </div>
        </div>



        {/* Trust strip — official credentials + secure checkout signals.
            Sits above the payment brands so the footer closes with a
            calm, verifiable trust anchor (not marketing copy). */}
        <div className="mt-10 pt-8 border-t border-[color:var(--gold-warm)]/15">
          <ul
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 list-none p-0"
            aria-label="Credentials and secure checkout"
          >
            <li className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--gold-warm)]">
                <BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--gold-warm)]"
                style={{ fontWeight: 600 }}
              >
                {LICENSE_SHORT} <span className="tabular-nums">nº {LICENSE_NUMBER}</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--gold-warm)]">
                <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--gold-warm)]"
                style={{ fontWeight: 600 }}
              >
                Turismo de Portugal
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-[color:var(--gold-warm)]/40 text-[color:var(--gold-warm)]">
                <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--gold-warm)]"
                style={{ fontWeight: 600 }}
              >
                Secure checkout · Stripe
              </span>
            </li>
          </ul>
        </div>

        {/* Accepted payment methods — visual reassurance strip. */}
        <PaymentMethodsRow />

        {/* Bottom bar — copyright + discreet legal links. Single quiet line. */}
        <div className="mt-8 md:mt-10 pt-5 border-t border-[color:var(--gold-warm)]/15">
          <div
            className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 font-[family-name:var(--font-sans)] text-[12px] text-[color:var(--ivory)]/80"
            style={{ fontWeight: 400 }}
          >
            <p className="leading-[1.6] text-[color:var(--ivory)]/80">
              © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
              <span className="hidden md:inline text-[color:var(--ivory)]/80"> · {LEGAL_META_LINE}.</span>
            </p>
            <nav
              aria-label="Legal and contact"
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              {[
                { to: "/terms", label: "Terms & Conditions" },
                { to: "/privacy", label: "Privacy Policy" },
                { to: "/cookies", label: "Cookie Policy" },
                { to: "/press", label: "Press & brand" },
              ].map((l, i, arr) => (
                <span key={l.to} className="inline-flex items-center gap-4">
                  <Link
                    to={l.to}
                    className="inline-flex items-center min-h-[24px] py-1 link-hairline-gold tap text-[color:var(--ivory)]/75 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                  >
                    {l.label}
                  </Link>
                  {i < arr.length - 1 && (
                    <span aria-hidden="true" className="text-[color:var(--text-on-dark-muted)]">
                      ·
                    </span>
                  )}
                </span>
              ))}
              <span aria-hidden="true" className="text-[color:var(--text-on-dark-muted)]">·</span>
              <button
                type="button"
                onClick={openCookieConsent}
                className="inline-flex items-center min-h-[24px] py-1 link-hairline-gold tap text-[color:var(--ivory)]/75 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                Cookie preferences
              </button>
            </nav>
          </div>
          <div className="mt-5 pt-5 border-t border-[color:var(--gold-warm)]/10 flex flex-wrap items-center justify-between gap-4">
            <LanguageSwitcher variant="footer" className="text-[color:var(--ivory)]/75" />
          </div>

          <p className="md:hidden mt-3 text-[11px] leading-[1.55] text-[color:var(--text-on-dark-muted)] font-[family-name:var(--font-sans)]">
            {LEGAL_META_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h4
        className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h4>
      <ul
        className="space-y-3 font-[family-name:var(--font-sans)] text-[14px]"
        style={{ fontWeight: 400 }}
      >
        {links.map((l) => (
          <li key={l.to}>
            {l.external ? (
              <a
                href={l.to}
                target="_blank"
                rel="noopener noreferrer"
                className="link-hairline-gold tap text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                to={l.to}
                className="link-hairline-gold tap text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
