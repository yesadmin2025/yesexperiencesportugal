import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CtaButton } from "@/components/ui/CtaButton";

// Desktop nav — full editorial set, kept compact in tracking so all 8
// items fit gracefully on a single row at lg+ widths.
const desktopLinks = [
  { to: "/experiences", label: "Experiences" },
  { to: "/builder", label: "Experience Studio" },
  { to: "/multi-day", label: "Multi-Day Journeys" },
  { to: "/corporate", label: "Corporate" },
  { to: "/proposals", label: "Proposals & Celebrations" },
  { to: "/local-stories", label: "Local Stories" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

// Mobile uses slightly different labels per the brief (more inviting on small
// screens) — "Design Your Experience" instead of the studio name, and
// Local Stories is intentionally omitted to keep the mobile menu focused.
const mobileLinks = [
  { to: "/experiences", label: "Experiences" },
  { to: "/builder", label: "Design Your Experience" },
  { to: "/multi-day", label: "Multi-Day Journeys" },
  { to: "/corporate", label: "Corporate" },
  { to: "/proposals", label: "Proposals & Celebrations" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-[color:var(--charcoal)]/15 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)] opacity-0 animate-[headerFade_900ms_ease-out_forwards]">
      <div className="container-x">
        <div className="flex items-center justify-between h-[72px] md:h-[88px] lg:h-[100px]">
          {/* Official master logo — uploaded brand asset, used as-is.
              Logo height is tuned so the "PORTUGAL" wordmark beneath the
              YES lockup remains legible on mobile while keeping a calm
              ~70% bar-height ratio at every breakpoint. */}
          <Link
            to="/"
            className="flex-shrink-0 inline-flex items-center h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="YES experiences PORTUGAL — Home"
          >
            {/* Shared <Logo> wrapper guarantees the teal artwork is paired
                with the .logo-mark--teal-on-ivory filter recipe — the
                `theme` prop drives both. No way to mismatch. */}
            <Logo
              theme="teal-on-ivory"
              fetchPriority="high"
              className="block h-[54px] md:h-[64px] lg:h-[74px] w-auto select-none"
            />
          </Link>

          {/* Desktop nav + CTA — right side, vertically centered.
              Default text: charcoal (var(--charcoal), 13.58:1). Hover/active: teal (7.60:1).
              Tracking tightened slightly (0.20em) so all 8 labels fit on one
              row at lg+ without wrapping. The CTA button is the calm,
              conversion-focused anchor — teal fill, fine gold border. */}
          <nav
            className="hidden lg:flex items-center h-full gap-7 xl:gap-9 text-[11px] uppercase tracking-[0.22em] leading-none"
            style={{ fontWeight: 380 }}
          >
            {desktopLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="inline-flex items-center text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                activeProps={{ className: "text-[color:var(--teal)]" }}
              >
                {n.label}
              </Link>
            ))}
            <CtaButton to="/builder" variant="primary" size="sm" className="ml-2">
              Design &amp; Secure
            </CtaButton>
          </nav>

          {/* Mobile menu button — sized as a square that mirrors the
              desktop CTA's optical weight: same hairline gold frame,
              same charcoal-on-white palette, vertically centered with
              the logo. No negative margins (those broke alignment with
              the container's right edge); padding lives in container-x
              so the trigger sits at the same gutter as the logo. */}
          <button
            className="lg:hidden inline-flex items-center justify-center h-11 w-11 border border-[color:var(--charcoal-soft)] hover:border-[color:var(--teal)] text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="lg:hidden bg-white border-t border-black/[0.05]">
          <div className="container-x py-7 flex flex-col gap-5 text-sm">
            {mobileLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors uppercase tracking-[0.22em] text-[12px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                style={{ fontWeight: 380 }}
                activeProps={{ className: "text-[color:var(--teal)]" }}
              >
                {n.label}
              </Link>
            ))}
            <CtaButton
              to="/builder"
              onClick={() => setOpen(false)}
              variant="primary"
              size="sm"
              className="mt-3"
            >
              Design &amp; Secure Your Experience
            </CtaButton>
          </div>
        </div>
      )}
    </header>
  );
}
