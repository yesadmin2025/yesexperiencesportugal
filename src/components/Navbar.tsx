import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";

import { CtaButton } from "@/components/ui/CtaButton";
import { AccessibleIconLink } from "@/components/AccessibleIconLink";
import { SOCIAL, whatsappUrl } from "@/config/business-nap";
import { useT } from "@/i18n/locale-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function useDesktopLinks() {
  const t = useT();
  return [
    { to: "/experiences", label: t("nav.experiences"), hidden: false },
    { to: "/experience-studio", label: t("nav.studio"), hidden: false },
    { to: "/multi-day", label: t("nav.travel_designer"), hidden: false },
    { to: "/corporate", label: t("nav.corporate"), hidden: false },
    { to: "/proposal-in-portugal", label: t("nav.moments"), hidden: false },
  ];
}

function useMobileSecondaryLinks() {
  const t = useT();
  return [
    { to: "/about", label: t("nav.about") },
    { to: "/local-stories", label: t("nav.local_stories") },
    { to: "/contact", label: t("nav.contact") },
  ];
}

import { WhatsAppIcon, InstagramIcon, TripadvisorIcon } from "@/components/BrandIcon";

const mobileSocialLinks = [
  { href: whatsappUrl(), label: "WhatsApp", Icon: WhatsAppIcon },
  { href: SOCIAL.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: SOCIAL.tripadvisor, label: "Tripadvisor", Icon: TripadvisorIcon },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const desktopLinks = useDesktopLinks();
  const mobilePrimaryLinks = desktopLinks;
  const mobileSecondaryLinks = useMobileSecondaryLinks();
  const t = useT();

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
    "link-hairline tap inline-flex items-center text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-[var(--dur-quick)] ease-[cubic-bezier(0.22,0.61,0.36,1)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]";

  const menuBtnClass =
    "tap lg:hidden inline-flex items-center justify-center h-11 w-11 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]";

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
            <span aria-hidden className="mx-1 h-3 w-px bg-[color:var(--charcoal)]/15" />
            <span className="inline-flex items-center gap-1.5 text-[color:var(--charcoal-soft)]">
              <Globe size={13} strokeWidth={1.6} aria-hidden />
              <LanguageSwitcher variant="header" />
            </span>
            <CtaButton to="/experience-studio" variant="primary" size="sm" className="ml-2">
              Design &amp; Book
            </CtaButton>
          </nav>

          <div className="lg:hidden inline-flex items-center gap-2 h-full">
            <span className="inline-flex items-center gap-1 text-[color:var(--charcoal-soft)]">
              <Globe size={12} strokeWidth={1.6} aria-hidden />
              <LanguageSwitcher variant="header" />
            </span>
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
                  className="tap text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-[var(--dur-quick)] uppercase tracking-[0.22em] text-[12px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
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
                  className="tap text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-[var(--dur-quick)] uppercase tracking-[0.22em] text-[12px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
                  style={{ fontWeight: 380 }}
                  activeProps={{ className: "text-[color:var(--teal)]" }}
                >
                  {n.label}
                </Link>
              ))}
              <div className="border-t border-[color:var(--charcoal)]/[0.06]" />
              <div className="flex flex-wrap items-center gap-3">
                {mobileSocialLinks.map((n) => (
                  <AccessibleIconLink
                    key={n.label}
                    href={n.href}
                    external
                    label={n.label}
                    tooltip={n.label}
                    onClick={() => setOpen(false)}
                    className="tap inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-[color:var(--charcoal)]/15 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] hover:ring-[color:var(--teal)]/40 transition-colors duration-[var(--dur-quick)] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
                  >
                    <n.Icon size={16} />
                  </AccessibleIconLink>
                ))}
              </div>
            </div>
          </div>
          <div className="container-x py-4 border-t border-[color:var(--charcoal)]/[0.06] shrink-0">
            <CtaButton
              to="/experience-studio"
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
