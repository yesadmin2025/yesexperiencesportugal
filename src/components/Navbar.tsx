import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { YesMark } from "@/components/YesMark";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  // Progressive logo reveal: at the very top of the homepage we show ONLY the
  // handwritten "YES" mark. After ~24px of scroll (or on any non-home route)
  // we crossfade into the full lockup. Smooth, restrained, no choreography.
  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const showMarkOnly = isHome && !scrolled;

  // Solid ivory editorial bar — soft atmospheric fade dissolves into hero below.
  const headerStyle: React.CSSProperties = {
    background: "rgb(247, 243, 236)",
  };

  const linkClass =
    "inline-flex items-center text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]";

  const menuBtnClass =
    "lg:hidden inline-flex items-center justify-center h-11 w-11 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]";

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 opacity-0 animate-[headerFade_900ms_ease-out_forwards]"
      style={headerStyle}
    >
      {/* Soft atmospheric dissolve — ivory fades into hero footage, no hard edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-full h-[64px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,243,236,0.85) 0%, rgba(247,243,236,0.55) 28%, rgba(247,243,236,0.28) 55%, rgba(247,243,236,0.10) 78%, rgba(247,243,236,0) 100%)",
        }}
      />
      <div className="container-x">
        <div className="flex items-center justify-between h-[76px] md:h-[88px] lg:h-[96px]">
          <Link
            to="/"
            className="relative flex-shrink-0 inline-flex items-center h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
            aria-label="YES experiences PORTUGAL — Home"
          >
            <span className="relative inline-block h-[58px] md:h-[64px] lg:h-[70px]">
              <Logo
                theme="teal-on-ivory"
                fetchPriority="high"
                className="relative block h-full w-auto select-none transition-opacity duration-[900ms] ease-out"
                aria-hidden={showMarkOnly ? "true" : undefined}
                style={{ opacity: showMarkOnly ? 0 : 1 }}
              />
              <YesMark
                ariaLabel="YES"
                className="absolute inset-y-0 left-0 block h-full w-auto select-none transition-opacity duration-[900ms] ease-out"
                style={{ opacity: showMarkOnly ? 1 : 0, pointerEvents: "none" }}
              />
            </span>
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
                activeProps={{ className: "text-[color:var(--teal)]" }}
              >
                {n.label}
              </Link>
            ))}
            <CtaButton to="/builder" variant="primary" size="sm" className="ml-2">
              Design &amp; Secure
            </CtaButton>
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
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-[color:var(--charcoal)]/[0.06]"
          style={{
            background: "rgba(247, 243, 236, 0.96)",
            backdropFilter: "blur(14px) saturate(1.05)",
            WebkitBackdropFilter: "blur(14px) saturate(1.05)",
          }}
        >
          <div className="container-x py-7 flex flex-col gap-5 text-sm">
            {mobileLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors uppercase tracking-[0.22em] text-[12px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
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
