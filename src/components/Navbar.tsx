import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CtaButton } from "@/components/ui/CtaButton";

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
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  // Transparent overlay only on home, at top of page, with menu closed.
  const transparent = isHome && !scrolled && !open;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const headerClass = transparent
    ? "fixed top-0 inset-x-0 z-50 opacity-0 animate-[headerFade_900ms_ease-out_forwards]"
    : "fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-[color:var(--charcoal)]/15 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)] opacity-0 animate-[headerFade_900ms_ease-out_forwards]";

  const transparentHeaderStyle = transparent
    ? {
        background:
          "linear-gradient(to bottom, rgba(20,16,12,0.34) 0%, rgba(20,16,12,0.18) 60%, rgba(20,16,12,0.00) 100%)",
        backdropFilter: "blur(10px) saturate(0.92)",
        WebkitBackdropFilter: "blur(10px) saturate(0.92)",
        borderBottom: "1px solid rgba(250,248,243,0.06)",
      }
    : undefined;

  const linkClass = transparent
    ? "inline-flex items-center text-[color:var(--ivory,#FAF8F3)]/80 hover:text-[color:var(--gold,#C9A96A)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    : "inline-flex items-center text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-white";

  const menuBtnClass = transparent
    ? "lg:hidden inline-flex items-center justify-center h-11 w-11 text-[color:var(--ivory,#FAF8F3)]/85 hover:text-[color:var(--gold,#C9A96A)] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    : "lg:hidden inline-flex items-center justify-center h-11 w-11 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  return (
    <header className={headerClass} style={transparentHeaderStyle}>
      <div className="container-x">
        <div className="flex items-center justify-between h-[64px] md:h-[80px] lg:h-[92px]">
          <Link
            to="/"
            className="relative flex-shrink-0 inline-flex items-center h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="YES experiences PORTUGAL — Home"
            style={
              transparent
                ? { filter: "drop-shadow(0 1px 10px rgba(0,0,0,0.45))" }
                : undefined
            }
          >
            <Logo
              theme={transparent ? "gold-on-charcoal" : "teal-on-ivory"}
              fetchPriority="high"
              className={`relative block h-[44px] md:h-[54px] lg:h-[62px] w-auto select-none transition-opacity duration-500 ${
                transparent ? "opacity-90" : "opacity-100"
              }`}
            />
          </Link>



          <nav
            className="hidden lg:flex items-center h-full gap-7 xl:gap-9 text-[11px] uppercase tracking-[0.22em] leading-none"
            style={{ fontWeight: 380 }}
          >
            {desktopLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={linkClass}
                activeProps={{
                  className: transparent
                    ? "text-[color:var(--gold,#C9A96A)]"
                    : "text-[color:var(--teal)]",
                }}
              >
                {n.label}
              </Link>
            ))}
            {transparent ? (
              <Link
                to="/builder"
                className="ml-2 inline-flex items-center justify-center px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] text-[color:var(--ivory,#FAF8F3)] hover:text-[color:var(--gold,#C9A96A)] transition-colors duration-300"
                style={{
                  border: "1px solid color-mix(in oklab, var(--gold, #C9A96A) 45%, transparent)",
                  borderRadius: 0,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Design &amp; Secure
              </Link>
            ) : (
              <CtaButton to="/builder" variant="primary" size="sm" className="ml-2">
                Design &amp; Secure
              </CtaButton>
            )}
          </nav>

          <button
            className={menuBtnClass}
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
