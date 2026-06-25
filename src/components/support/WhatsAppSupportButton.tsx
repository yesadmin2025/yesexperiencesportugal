/**
 * WhatsAppSupportButton — discreet floating support affordance.
 *
 * Sprint A v5: site-wide help button. Brand-aligned, never the
 * primary CTA. Hidden on checkout-style routes and while the
 * pre-payment details form is open so it never competes with the
 * main action.
 *
 * Hiding contract:
 *   - Path-based: any route matching one of HIDE_PATTERNS.
 *   - Imperative: dispatch `whatsapp-support:set-hidden` with
 *     `{ hidden: boolean }` from the booking form to suppress it
 *     while the form is open.
 */

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const WA_NUMBER = "351911889992";
const WA_DEFAULT_MESSAGE =
  "Hi YES Experiences Portugal — I'd like a hand with my booking.";

const HIDE_PATTERNS: RegExp[] = [/^\/checkout(\/|$)/i];

declare global {
  interface WindowEventMap {
    "whatsapp-support:set-hidden": CustomEvent<{ hidden: boolean }>;
  }
}

export function WhatsAppSupportButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hiddenByForm, setHiddenByForm] = useState(false);

  useEffect(() => {
    const onToggle = (e: WindowEventMap["whatsapp-support:set-hidden"]) => {
      setHiddenByForm(Boolean(e.detail?.hidden));
    };
    window.addEventListener("whatsapp-support:set-hidden", onToggle);
    return () => window.removeEventListener("whatsapp-support:set-hidden", onToggle);
  }, []);

  const hiddenByPath = HIDE_PATTERNS.some((re) => re.test(pathname));
  if (hiddenByPath || hiddenByForm) return null;

  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Support — chat with the YES team"
      className="
        fixed z-40
        bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]
        right-4 md:right-6
        inline-flex items-center gap-2
        rounded-full
        bg-[color:var(--teal,#295B61)] text-[color:var(--ivory,#FAF8F3)]
        pl-3 pr-4 py-2.5 md:pl-3.5 md:pr-5 md:py-3
        text-[12px] md:text-[13px]
        font-[family-name:var(--font-sans)]
        shadow-[0_8px_24px_-12px_rgba(46,46,46,0.45)]
        ring-1 ring-[color:var(--gold,#C9A96A)]/30
        hover:ring-[color:var(--gold,#C9A96A)]/60
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)]
        transition-shadow duration-300
      "
      style={{ letterSpacing: "0.04em", fontWeight: 500 }}
      data-testid="whatsapp-support-button"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 32 32"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M19.11 17.43c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.13-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.13-1.14-.42-2.17-1.34-.8-.71-1.34-1.58-1.5-1.85-.16-.27-.02-.41.12-.54.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.13-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.46l-.52-.01c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29 0 1.35.98 2.65 1.12 2.83.13.18 1.94 2.96 4.7 4.15.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32zM16.02 5.33c-5.92 0-10.74 4.82-10.74 10.74 0 1.89.5 3.74 1.44 5.36L5.2 26.67l5.4-1.42a10.7 10.7 0 005.42 1.47h.01c5.92 0 10.74-4.82 10.74-10.74 0-2.87-1.12-5.57-3.15-7.6a10.68 10.68 0 00-7.6-3.05zm0 19.66h-.01a8.92 8.92 0 01-4.55-1.24l-.33-.19-3.21.84.86-3.12-.21-.32a8.92 8.92 0 01-1.37-4.77c0-4.94 4.02-8.96 8.97-8.96 2.39 0 4.64.93 6.33 2.62a8.9 8.9 0 012.62 6.34c0 4.94-4.03 8.96-8.97 8.96z" />
      </svg>
      <span>WhatsApp Support</span>
    </a>
  );
}

export default WhatsAppSupportButton;
