import { Link } from "@tanstack/react-router";
import { useLocale, useT } from "@/i18n/locale-context";
import { localizedNavigationPath } from "@/i18n/pt-ready";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SITE_RATING_LABEL } from "@/config/trust-certificate";
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
  ADDRESS_LINE,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  NIF_LABEL,
  PHONE_DISPLAY,
  PHONE_HREF,
  SOCIAL,
  whatsappUrl,
} from "@/config/business-nap";


/* ---------------------------------------------------------------------------
   Footer — three zones, one rhythm.

   A. BRAND    logo · tagline · social
   B. NAVIGATE primary service columns + compact secondary navigation (expandable at every width)
   C. TRUST    credentials · payments · partners · legal bar · official seal

   Design rules enforced here:
   - a single hairline weight, used only between zones (not between sub-blocks)
   - one vertical rhythm: 40px between zones, 24px inside a zone
   - identical eyebrow heading style everywhere
   - left alignment on every breakpoint; only the closing seal is centered
--------------------------------------------------------------------------- */

const EYEBROW_CLASS =
  "font-sans text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--gold-warm)]";

const LINK_CLASS =
  "link-hairline-gold tap inline-flex min-h-11 md:min-h-[28px] items-center text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]";

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
      { to: "/experiences", label: "Signature Experiences" },
      { to: "/studio", label: "YES Experience Studio" },
      { to: "/portugal-travel-designer", label: "Portugal Travel Designer" },
    ],
  },
  {
    title: "Occasions",
    links: [
      { to: "/proposal-in-portugal", label: "Proposals & Celebrations" },
      { to: "/corporate", label: "Corporate & Groups" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About YES Experiences Portugal" },
      { to: "/local-stories", label: "Local Stories" },
      { to: "/regions-of-portugal", label: "Regions of Portugal" },
      { to: "/reviews", label: "Guest reviews" },
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

const SIGNATURE_TOURS: FooterLink[] = [
  {
    to: "/tours/$tourId",
    params: { tourId: "arrabida-wine-allinclusive" },
    label: "Arrábida Wine Tour",
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
  { to: "/day-tours", label: "Private Day Tours" },
  { to: "/lisbon-wine-tours", label: "Lisbon Wine Tours" },
  { to: "/portugal-tours", label: "Portugal tours" },
  { to: "/luxury-tours-portugal", label: "Luxury Portugal tours" },
  { to: "/lisbon-private-tours", label: "Private tours from Lisbon" },
  {
    to: "/local-stories/$slug",
    params: { slug: "best-wine-tours-from-lisbon" },
    label: "Best wine tours from Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "sintra-day-tour-from-lisbon" },
    label: "Sintra day tour from Lisbon",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "arrabida-wine-tour-from-lisbon" },
    label: "Private Arrábida wine tour",
  },
  {
    to: "/local-stories/$slug",
    params: { slug: "arrabida-day-trip-from-lisbon" },
    label: "Arrábida day trip from Lisbon",
  },
  { to: "/day-trips-from-lisbon", label: "Day trips from Lisbon" },
  {
    to: "/local-stories/$slug",
    params: { slug: "alentejo-wine-tour-from-lisbon" },
    label: "Alentejo wine tour from Lisbon",
  },
  { to: "/itineraries/10-day-private-portugal-tour", label: "10-day private Portugal tour" },
];


const LEGAL_LINKS: FooterLink[] = [
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/press", label: "Press & brand" },
];

const PT_FOOTER_LABELS: Record<string, string> = {
  "Experiences": "Experiências",
  "Occasions": "Ocasiões",
  "Company": "Empresa",
  "Legal": "Informação legal",
  "Signature Experiences": "Experiências Signature",
  "Discover Portugal": "Descobrir Portugal",
  "Private Day Tours": "Passeios privados de um dia",
  "Portugal Travel Designer": "Travel Designer em Portugal",
  "Lisbon Wine Tours": "Experiências de vinho a partir de Lisboa",
  "Proposals & Celebrations": "Pedidos de casamento e celebrações",
  "Corporate & Groups": "Empresas e grupos",
  "About YES Experiences Portugal": "Sobre a YES Experiences Portugal",
  "Local Stories": "Histórias locais",
  "Regions of Portugal": "Regiões de Portugal",
  "Guest reviews": "Avaliações de clientes",
  "FAQ": "Perguntas frequentes",
  "Contact": "Contacto",
  "Terms & Conditions": "Termos e condições",
  "Privacy Policy": "Política de privacidade",
  "Cookie Policy": "Política de cookies",
  "Press & brand": "Imprensa e marca",
  "Arrábida Wine Tour": "Experiência de vinhos na Arrábida",
  "Wild Beaches & Picnic": "Praias selvagens e piquenique",
  "Arrábida Boat": "Passeio de barco na Arrábida",
  "Tiles Workshop": "Workshop de azulejos",
  "Azeitão Cheese & Wine": "Queijo e vinho de Azeitão",
  "Roman Heritage Alentejo": "Património romano no Alentejo",
  "Southwest Vicentine Coast": "Costa Vicentina",
  "Portugal tours": "Passeios em Portugal",
  "Luxury Portugal tours": "Experiências premium em Portugal",
  "Private tours from Lisbon": "Passeios privados a partir de Lisboa",
  "Best wine tours from Lisbon": "Experiências de vinho a partir de Lisboa",
  "Sintra day tour from Lisbon": "Visita a Sintra a partir de Lisboa",
  "Private Arrábida wine tour": "Experiência privada de vinho na Arrábida",
  "Arrábida day trip from Lisbon": "Visita à Arrábida a partir de Lisboa",
  "Day trips from Lisbon": "Passeios de um dia a partir de Lisboa",
  "Alentejo wine tour from Lisbon": "Experiência de vinho no Alentejo",
  "10-day private Portugal tour": "Viagem privada de 10 dias em Portugal",
  "Portugal travel designer": "Travel Designer em Portugal",
  "Proposal in Portugal": "Pedido de casamento em Portugal"
};
function footerLabel(label: string, locale: "en" | "pt") {
  return locale === "pt" ? PT_FOOTER_LABELS[label] ?? label : label;
}

export function Footer() {
  const t = useT();
  const locale = useLocale();
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

      <div className="container-x py-8 md:py-12">
        {/* ── ZONE A — BRAND ─────────────────────────────────────────── */}
        <div className="grid gap-6 md:gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0 max-w-md">
            <Link
              to={localizedNavigationPath("/", locale)}
               className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              aria-label="YES Experiences Portugal — Home"
            >
              <Logo
                theme="gold-on-charcoal"
                loading="lazy"
                 className="block h-[46px] w-[115px] object-contain md:h-[52px] md:w-[130px] select-none"
              />
            </Link>
            <p
              className="mt-5 font-[family-name:var(--font-sans)] text-[14px] text-[color:var(--ivory)]/85 leading-[1.65]"
              style={{ fontWeight: 400, letterSpacing: "0.005em" }}
            >
              {t("footer.tagline_full")}
            </p>
            <Link to={localizedNavigationPath("/reviews", locale)} className={`${LINK_CLASS} mt-2 gap-2 text-[13px]`}>
              <span aria-hidden="true" className="text-[color:var(--gold-warm)]">★★★★★</span>
              {SITE_RATING_LABEL}
            </Link>
            {/* Canonical NAP — one quiet line, single source of truth. */}
            <address className="mt-4 not-italic font-[family-name:var(--font-sans)] text-[13px] leading-[1.7] text-[color:var(--ivory)]/70">
              <span className="block">{ADDRESS_LINE}</span>
              <span className="mt-1 flex flex-wrap items-center">
                <a href={EMAIL_HREF} className={LINK_CLASS}>
                  {EMAIL}
                </a>
                <span aria-hidden="true" className="mx-2 text-[color:var(--ivory)]/35">
                  ·
                </span>
                <a href={PHONE_HREF} className={LINK_CLASS}>
                  {PHONE_DISPLAY}
                </a>
              </span>
              <a href={whatsappUrl()} className={`${LINK_CLASS} gap-2`} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={16} /> WhatsApp
              </a>
            </address>
          </div>

          <ul className="flex flex-wrap items-center gap-2.5" aria-label="Social channels">
            {[
              { href: SOCIAL.instagram, label: "Instagram", Icon: InstagramIcon },
              { href: SOCIAL.facebook, label: "Facebook", Icon: FacebookIcon },
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
        <nav aria-label="Explore YES Experiences Portugal services and company" className="mt-6 pt-6 border-t border-[color:var(--gold-warm)]/25 md:mt-9 md:pt-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-[color:var(--gold-warm)]/25 pb-6 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 max-w-xl">
              <h2 className={EYEBROW_CLASS}>{locale === "pt" ? "Parcerias com profissionais de turismo" : "Travel trade partnerships"}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ivory)]/85">{locale === "pt" ? "O seu parceiro local em Portugal para experiências privadas, viagens à medida e grupos." : "Your local Portugal partner for private experiences, tailor-made journeys and groups."}</p>
            </div>
            <Link to="/trade" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-sm border border-[color:var(--gold-warm)] px-4 py-2 text-[13px] font-semibold text-[color:var(--gold-soft)] hover:bg-[color:var(--gold-warm)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] md:shrink-0">{locale === "pt" ? "Para consultores de viagens e agências" : "For Travel Advisors & Agencies"} <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-2 md:gap-x-8 md:gap-y-7">
            {NAV_COLUMNS.filter((col) => col.title !== "Company").map((col) => (
              <FooterCol key={col.title} title={col.title} links={col.links} />
            ))}
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {NAV_COLUMNS.filter((col) => col.title === "Company").map((col) => (
              <FooterLinkGroup key={col.title} title={col.title} links={col.links} compact />
            ))}
            <FooterLinkGroup title="Legal" links={LEGAL_LINKS} compact />
            <FooterLinkGroup title="Signature Experiences" links={SIGNATURE_TOURS} />
            <FooterLinkGroup title="Discover Portugal" links={POPULAR_SEARCHES} />
          </div>
        </nav>

        {/* ── ZONE C — TRUST & LEGAL ───────────────────────────────────
            PaymentMethodsRow opens the zone with its own hairline, so the
            wrapper stays border-free — one line, never two. */}
        <div>
          {/* Secure payments */}
          <PaymentMethodsRow />

          {/* Certificates — each seal gets its own space on phones; nothing
              competes with them. */}
          <div
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 sm:gap-10"
            aria-label="Review certificate and official complaints book"
          >
            <TrustindexBadge />
            <LivroReclamacoesBadge />
          </div>

          {/* Vendor verification is layout-free; the visible certificate above
              remains the sole review badge. */}
          <TrustindexWidget />

          {/* Closing band — distribution partners, then the quiet legal
              identity. Address and contacts live once in the brand block
              above, so nothing repeats here. */}
          <div className="mt-8 pt-8 border-t border-[color:var(--gold-warm)]/15">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={`${EYEBROW_CLASS} shrink-0`} style={{ fontWeight: 600 }}>
                {locale === "pt" ? "Também presentes em" : "Also listed on"}
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

            {/* Legal identity — one quiet close (dot separators come from the
                ::after marks from md up). */}
            <div
              className="mt-8 flex min-w-0 flex-col gap-1.5 font-[family-name:var(--font-sans)] text-[12px] font-normal leading-[1.6] text-[color:var(--ivory)]/75 md:flex-row md:flex-wrap md:items-center md:gap-y-0"
            >
              <span className="md:after:mx-2 md:after:content-['·']">
                © {new Date().getFullYear()} Yes Experiences Portugal
              </span>
              <span className="md:after:mx-2 md:after:content-['·']">
                {NIF_LABEL} · {LICENSE_LABEL}
              </span>
              <Link
                to={localizedNavigationPath("/terms", locale)}
                hash="dispute-resolution"
                className={`${LINK_CLASS} text-[12px] text-[color:var(--ivory)]/75`}
              >
                {locale === "pt" ? "Resolução alternativa de litígios (RAL)" : "Dispute resolution (RAL)"}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <LanguageSwitcher variant="footer" className="text-[color:var(--ivory)]/75" />
              <span aria-hidden="true" className="text-[color:var(--text-on-dark-muted)]">
                ·
              </span>
              <button
                type="button"
                onClick={openCookieConsent}
                className={`${LINK_CLASS} text-[12px] text-[color:var(--ivory)]/75`}
              >
                {locale === "pt" ? "Preferências de cookies" : "Cookie preferences"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  const locale = useLocale();
  return (
    <div className="min-w-0">
      <h2 className={`${EYEBROW_CLASS} mb-4`} style={{ fontWeight: 600 }}>
        {footerLabel(title, locale)}
      </h2>
      <ul
        className="space-y-2 font-[family-name:var(--font-sans)] text-[14px]"
        style={{ fontWeight: 400 }}
      >
        {links.map((l) => (
          <li key={`${l.to}:${footerLabel(l.label, locale)}`}>
            <Link to={localizedNavigationPath(l.to, locale)} params={l.params} search={l.search} className={LINK_CLASS}>
              {footerLabel(l.label, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Secondary navigation is collapsed at every viewport. All destinations
 * remain in the initial DOM and can be opened with an accessible button.
 */
function FooterLinkGroup({ title, links, compact = false }: { title: string; links: FooterLink[]; compact?: boolean }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const id = `footer-group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="min-w-0">
      <h2 className={EYEBROW_CLASS} style={{ fontWeight: 600 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border-b border-[color:var(--gold-warm)]/15 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        >
          {footerLabel(title, locale)}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-[color:var(--gold-warm)] transition-transform duration-[var(--dur-quick)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <ul
        id={id}
        className={`mt-4 grid-cols-1 gap-x-6 gap-y-2 font-[family-name:var(--font-sans)] ${compact ? "text-[14px]" : "text-[13px] sm:grid-cols-2"} ${
          open ? "grid" : "hidden"
        }`}
        style={{ fontWeight: 400 }}
      >
        {links.map((l) => (
          <li key={`${l.to}:${footerLabel(l.label, locale)}`}>
            <Link
              to={localizedNavigationPath(l.to, locale)}
              params={l.params}
              search={l.search}
              className={`${LINK_CLASS} text-[color:var(--ivory)]/75`}
            >
              {footerLabel(l.label, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}