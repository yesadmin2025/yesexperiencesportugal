import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CtaButton } from "@/components/ui/CtaButton";
import { AccessibleIconLink } from "@/components/AccessibleIconLink";
import { SOCIAL, whatsappUrl } from "@/config/business-nap";
import { useT } from "@/i18n/locale-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { WhatsAppIcon, InstagramIcon, TripadvisorIcon } from "@/components/BrandIcon";

function usePrimaryLinks() {
  const t = useT();
  return [
    { to: "/experiences", label: `Signature ${t("nav.experiences")}` },
    { to: "/studio-v3", label: t("nav.studio") },
    { to: "/portugal-travel-designer", label: t("nav.travel_designer") },
  ];
}

function useSecondaryLinks() {
  const t = useT();
  return [
    { to: "/proposal-in-portugal", label: t("nav.moments") },
    { to: "/corporate", label: t("nav.corporate") },
    { to: "/about", label: t("nav.about") },
    { to: "/local-stories", label: t("nav.local_stories") },
    { to: "/contact", label: t("nav.contact") },
  ];
}

const mobileSocialLinks = [
  { href: whatsappUrl(), label: "WhatsApp", Icon: WhatsAppIcon },
  { href: SOCIAL.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: SOCIAL.tripadvisor, label: "Tripadvisor", Icon: TripadvisorIcon },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const primaryLinks = usePrimaryLinks();
  const secondaryLinks = useSecondaryLinks();

  useEffect(() => setOpen(false), [pathname]);

  const linkClass =
    "link-hairline tap inline-flex min-h-[44px] items-center font-sans font-medium tracking-[0.03em] text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors duration-[var(--dur-quick)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]";

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 border-b border-[color:var(--charcoal)]/[0.06] bg-[rgb(247,243,236)] opacity-0 animate-[headerFade_600ms_ease-out_forwards]"
    >
      <div className="container-x relative">
        <div className="flex h-[64px] items-center justify-between md:h-[84px] lg:h-[96px]">
          <Link
            to="/"
            aria-label="YES experiences PORTUGAL — Home"
            className="relative inline-flex h-full flex-shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
          >
            <span className="relative inline-flex h-[45px] w-[72px] items-start translate-y-[4px] overflow-visible md:h-[50px] md:w-[80px] md:translate-y-[6px] lg:h-[56px] lg:w-[90px] lg:translate-y-[7px]">
              <Logo
                theme="teal-on-ivory"
                fetchPriority="high"
                className="absolute left-0 top-0 block h-full w-auto select-none"
              />
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden h-full items-center gap-7 text-[12px] uppercase tracking-[0.13em] leading-none lg:flex xl:gap-9"
          >
            {primaryLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={linkClass}
                activeProps={{ className: "text-[color:var(--teal)]" }}
              >
                {item.label}
              </Link>
            ))}
            <span
              aria-hidden
              className="mx-1 h-3 w-px bg-[color:var(--charcoal)]/15"
            />
            <span className="inline-flex min-h-[44px] items-center gap-1.5 text-[color:var(--charcoal-soft)]">
              <Globe size={13} strokeWidth={1.6} aria-hidden />
              <LanguageSwitcher variant="header" />
            </span>
            <CtaButton to="/studio-v3" variant={pathname === "/" || pathname === "/pt" ? "ghost" : "primary"} size="sm" className="ml-1">
              Design your day
            </CtaButton>
          </nav>

          <div className="inline-flex h-full items-center gap-2 lg:hidden">
            <span className="inline-flex min-h-[44px] items-center gap-1 text-[color:var(--charcoal-soft)]">
              <Globe size={12} strokeWidth={1.6} aria-hidden />
              <LanguageSwitcher variant="header" />
            </span>
            <button
              type="button"
              className="tap inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--charcoal)] transition-colors hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
              onClick={() => setOpen((value) => !value)}
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
          className="flex flex-col overflow-hidden border-t border-[color:var(--charcoal)]/[0.06] lg:hidden"
          style={{
            height: "calc(100dvh - 64px)",
            background: "rgba(247, 243, 236, 0.92)",
            backdropFilter: "blur(14px) saturate(1.05)",
            WebkitBackdropFilter: "blur(14px) saturate(1.05)",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="container-x flex flex-col gap-3 py-7">
              <p className="mb-1 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]">
                Start here
              </p>
              {primaryLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                   className="tap inline-flex min-h-[48px] items-center rounded-sm font-sans text-[15.5px] font-medium tracking-[0.03em] text-[color:var(--charcoal)] transition-colors duration-[var(--dur-quick)] hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                  activeProps={{ className: "text-[color:var(--teal)]" }}
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-4 border-t border-[color:var(--charcoal)]/[0.08]" />
              <p className="mb-1 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal-soft)]">
                More
              </p>
              {secondaryLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                   className="tap inline-flex min-h-[48px] items-center rounded-sm font-sans text-[14.5px] font-medium text-[color:var(--charcoal)] transition-colors duration-[var(--dur-quick)] hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                  activeProps={{ className: "text-[color:var(--teal)]" }}
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-4 border-t border-[color:var(--charcoal)]/[0.08]" />
              <div className="flex flex-wrap items-center gap-3">
                {mobileSocialLinks.map((item) => (
                  <AccessibleIconLink
                    key={item.label}
                    href={item.href}
                    external
                    label={item.label}
                    tooltip={item.label}
                    onClick={() => setOpen(false)}
                    className="tap inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-[color:var(--charcoal)]/15 text-[color:var(--charcoal)] transition-colors hover:text-[color:var(--teal)] hover:ring-[color:var(--teal)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                  >
                    <item.Icon size={16} />
                  </AccessibleIconLink>
                ))}
              </div>
            </div>
          </div>

          <div className="container-x shrink-0 border-t border-[color:var(--charcoal)]/[0.06] py-4">
            <CtaButton
              to="/studio-v3"
              onClick={() => setOpen(false)}
              variant="primary"
              size="sm"
              className="w-full"
            >
              Design your day
            </CtaButton>
          </div>
        </div>
      )}
    </header>
  );
}
