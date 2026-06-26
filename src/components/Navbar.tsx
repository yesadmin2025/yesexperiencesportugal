import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

import { CtaButton } from "@/components/ui/CtaButton";

const desktopLinks = [
  { to: "/experiences", label: "Experiences", hidden: false },
  { to: "/studio-v3", label: "Studio", hidden: false },
  { to: "/multi-day", label: "Travel Designer", hidden: false },
  { to: "/corporate", label: "Corporate", hidden: false },
  { to: "/proposals", label: "Moments", hidden: false },
];

const mobilePrimaryLinks = [
  { to: "/experiences", label: "Experiences" },
  { to: "/studio-v3", label: "Studio" },
  { to: "/multi-day", label: "Travel Designer" },
  { to: "/corporate", label: "Corporate" },
  { to: "/proposals", label: "Moments" },
];

const mobileSecondaryLinks = [
  { to: "/about", label: "About" },
  { to: "/local-stories", label: "Local Stories" },
  { to: "/contact", label: "Contact" },
];

const mobileSocialLinks = [
  { href: "https://wa.me/351911889992", label: "WhatsApp" },
  { href: "https://www.instagram.com/yesexperiencesportugal", label: "Instagram" },
  {
    href: "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html",
    label: "Tripadvisor",
  },
  { href: "https://www.google.com/maps?cid=03208810033820295776", label: "Google" },
];

const mobileLinks = desktopLinks;

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
      {/* Soft atmospheric dissolve — editorial paper into cinema light. Felt, not noticed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-full h-[124px] md:h-[144px] lg:h-[160px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(248,242,232,0.94) 0%, rgba(248,242,232,0.78) 16%, rgba(248,242,232,0.54) 36%, rgba(248,242,232,0.32) 58%, rgba(248,242,232,0.14) 78%, rgba(248,242,232,0.04) 92%, rgba(248,242,232,0) 100%)",
        }}
      />
      {/* Whisper of editorial shadow at the very edge — almost invisible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-full h-[4px]"
        style={{
          background: "linear-gradient(to bottom, rgba(30,22,14,0.035) 0%, rgba(30,22,14,0) 100%)",
        }}
      />
      <div className="container-x">
        <div className="flex items-center justify-between h-[64px] md:h-[84px] lg:h-[96px]">
          <Link
            to="/"
            className="relative flex-shrink-0 inline-flex items-center h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
            aria-label="YES experiences PORTUGAL — Home"
          >
            <span className="relative inline-flex h-[45px] md:h-[50px] lg:h-[56px] w-[72px] md:w-[80px] lg:w-[90px] items-start translate-y-[4px] md:translate-y-[6px] lg:translate-y-[7px] overflow-hidden">
              <Logo
                theme="teal-on-ivory"
                fetchPriority="high"
                className="absolute left-0 top-0 block h-full w-auto select-none"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-[rgb(247,243,236)] transition-opacity duration-[650ms] ease-out"
                style={{ top: "67%", opacity: showMarkOnly ? 1 : 0 }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full bg-[rgb(247,243,236)] transition-opacity duration-[650ms] ease-out"
                style={{
                  left: "46%",
                  top: "57%",
                  width: "12%",
                  height: "12%",
                  opacity: showMarkOnly ? 1 : 0,
                }}
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
                className={`${linkClass}${n.hidden ? " hidden" : ""}`}
                activeProps={{ className: "text-[color:var(--teal)]" }}
              >
                {n.label}
              </Link>
            ))}
            <CtaButton to="/studio-v3" variant="primary" size="sm" className="ml-2">
              Design &amp; Book
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
          className="lg:hidden flex flex-col border-t border-[color:var(--charcoal)]/[0.06] overflow-hidden"
          style={{
            height: "calc(100vh - 64px)",
            background: "rgba(247, 243, 236, 0.96)",
            backdropFilter: "blur(14px) saturate(1.05)",
            WebkitBackdropFilter: "blur(14px) saturate(1.05)",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="container-x py-7 flex flex-col gap-5 text-sm">
              {mobilePrimaryLinks.map((n) => (
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
              <div className="border-t border-[color:var(--charcoal)]/[0.06]" />
              {mobileSecondaryLinks.map((n) => (
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
              <div className="border-t border-[color:var(--charcoal)]/[0.06]" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {mobileSocialLinks.map((n, idx) => (
                  <a
                    key={n.label}
                    href={n.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors uppercase tracking-[0.22em] text-[12px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
                    style={{ fontWeight: 380 }}
                  >
                    {n.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="container-x py-4 border-t border-[color:var(--charcoal)]/[0.06] shrink-0">
            <CtaButton
              to="/studio-v3"
              onClick={() => setOpen(false)}
              variant="primary"
              size="sm"
              className="w-full"
            >
              Design &amp; Book
            </CtaButton>
          </div>
        </div>
      )}
    </header>
  );
}
