import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

interface FooterLink {
  to: string;
  label: string;
  external?: boolean;
}

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
            Private Portugal experiences, designed with you and confirmed in minutes — 700+
            five-star reviews, real local hosts, instant booking.
          </p>
        </div>

        {/* 4-column nav grid — gap tightened (gap-10 → gap-8) so the column
            cluster reads as a single block, not four separate posters. */}
        <div className="mt-9 md:mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-8">
          <FooterCol
            title="Experiences"
            links={[
              { to: "/experiences", label: "All Experiences" },
              { to: "/day-tours", label: "Day Experiences" },
              { to: "/multi-day", label: "Bespoke Journeys" },
              { to: "/builder", label: "Experience Studio" },
            ]}
          />
          <FooterCol
            title="Occasions"
            links={[
              { to: "/proposals", label: "Proposals & Celebrations" },
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
              {
                to: "https://www.google.com/maps?cid=03208810033820295776",
                label: "Google Maps",
                external: true,
              },
            ]}
          />
        </div>

        {/* Bottom bar — copyright + discreet legal links. Single quiet line. */}
        <div className="mt-10 md:mt-10 pt-5 border-t border-[color:var(--gold-warm)]/25">
          <div
            className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 font-[family-name:var(--font-sans)] text-[12px] text-[color:var(--ivory)]/80"
            style={{ fontWeight: 400 }}
          >
            <p className="leading-[1.6]">
              © {new Date().getFullYear()} YES experiences Portugal. All rights reserved.
              <span className="hidden md:inline"> · Licensed tour operator (RNAVT) · Lisbon.</span>
            </p>
            <nav aria-label="Legal" className="flex items-center gap-5">
              <Link
                to="/terms"
                className="text-[color:var(--ivory)]/70 hover:text-[color:var(--gold-soft)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                Terms
              </Link>
              <span aria-hidden="true" className="text-[color:var(--ivory)]/55">
                ·
              </span>
              <Link
                to="/privacy"
                className="text-[color:var(--ivory)]/70 hover:text-[color:var(--gold-soft)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                Privacy
              </Link>
            </nav>
          </div>
          <p className="md:hidden mt-3 text-[11px] leading-[1.55] text-[color:var(--ivory)]/55 font-[family-name:var(--font-sans)]">
            Licensed tour operator (RNAVT) · Lisbon, Portugal
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
                className="text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                to={l.to}
                className="text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
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
