import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

/**
 * Footer — 3-column nav with logo + tagline on desktop, stacked on
 * mobile. Per Phase 1 ajuste: Connect column removed (no confirmed
 * social handles yet). Cols: Experiences · Occasions · Company.
 */


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
            Private Portugal experiences, designed with you and confirmed in minutes —
            700+ five-star reviews, real local hosts, instant booking.
          </p>
        </div>

        {/* 4-column nav grid — gap tightened (gap-10 → gap-8) so the column
            cluster reads as a single block, not four separate posters. */}
        <div className="mt-9 md:mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-8">
          <FooterCol
            title="Experiences"
            links={[
              { to: "/experiences", label: "All Experiences" },
              { to: "/day-tours", label: "Day Tours" },
              { to: "/multi-day", label: "Multi-Day Journeys" },
              { to: "/builder", label: "Build Your Own" },
            ]}
          />
          <FooterCol
            title="Occasions"
            links={[
              { to: "/proposals", label: "Proposals & Celebrations" },
              { to: "/corporate", label: "Corporate" },
              { to: "/contact", label: "Private Bookings" },
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

        </div>

        {/* Bottom bar — copyright + tagline. Quiet, single line. */}
        <div className="mt-10 md:mt-10 pt-5 border-t border-[color:var(--gold-warm)]/25">
          <div
            className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 font-[family-name:var(--font-sans)] text-[12px] text-[color:var(--ivory)]/70"
            style={{ fontWeight: 400 }}
          >
            <p className="leading-[1.6]">
              © {new Date().getFullYear()} YES experiences PORTUGAL · Licensed tour operator (RNAVT) · Lisbon, Portugal
            </p>
            <p
              className="font-[family-name:var(--font-display)] text-[10.5px] tracking-[0.28em] uppercase text-[color:var(--gold-warm)] whitespace-nowrap"
              style={{ fontWeight: 600 }}
            >
              Private · Local · Instant booking
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4
        className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h4>
      <ul className="space-y-3 font-[family-name:var(--font-sans)] text-[14px]" style={{ fontWeight: 400 }}>
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
