/**
 * Mobile-only compact reserve bar for Signature experience pages.
 *
 * Priority 1 of the conversion plan: the reserve action must stay reachable
 * while the guest reads the page on a phone. Presentation only — it links to
 * the existing `#book` block and dispatches the same reserve intent event as
 * the in-page CTAs. No pricing, availability or payment logic lives here.
 *
 * Behaviour:
 *   • shown immediately on phones whenever the booking block is off screen;
 *   • hidden again once the booking form itself is on screen (no duplicate CTA);
 *   • hidden on ≥640px, where the booking panel is always in reach.
 */

import { PRICE_GROUP_QUALIFIER } from "@/lib/price-copy";
import { useEffect, useState } from "react";
import { PriceEur } from "@/components/ui/PriceEur";
import { dispatchSignatureReserveIntent } from "@/lib/booking/reserve-intent";
import { CTA_LABELS } from "@/content/cta-vocabulary";

export function MobileReserveBar({
  tourId,
  priceFrom,
}: {
  tourId: string;
  priceFrom?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Keep the floating WhatsApp support affordance clear of this conversion
    // bar. The FAB already reads --fab-lift; only set it while the reserve bar
    // is actually visible so the primary booking action remains unobstructed.
    const root = document.documentElement;
    if (visible) root.style.setProperty("--fab-lift", "72px");
    else root.style.removeProperty("--fab-lift");
    return () => {
      root.style.removeProperty("--fab-lift");
    };
  }, [visible]);

  useEffect(() => {
    const onScroll = () => {
      const book = document.getElementById("book");
      let bookOnScreen = false;
      if (book) {
        const r = book.getBoundingClientRect();
        bookOnScreen = r.top < window.innerHeight * 0.85 && r.bottom > 0;
      }
      // Never stack two bottom bars: the cookie notice owns the bottom edge
      // until the guest answers it.
      const cookieNotice = document.querySelector(".cookie-consent-card");
      setVisible(Boolean(book) && !bookOnScreen && !cookieNotice);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const observer = new MutationObserver(onScroll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      data-testid="mobile-reserve-bar"
      aria-hidden={!visible}
      className={[
        "sm:hidden fixed inset-x-0 bottom-0 z-40",
        "border-t border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)]",
        "px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {typeof priceFrom === "number" ? (
          <div className="min-w-0 leading-tight">
            <span className="block text-xs uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
              From
            </span>
            <span className="serif text-[18px] font-semibold text-[color:var(--charcoal)]">
              <PriceEur amountEur={priceFrom} role="from" />
            </span>
            <span className="block text-[11px] text-[color:var(--charcoal-soft)]">
              per person {PRICE_GROUP_QUALIFIER}
            </span>
          </div>
        ) : null}
        <a
          href="#book"
          onClick={(e) => {
            dispatchSignatureReserveIntent({ tourId, placement: "mobile-bar" });
            const book = document.getElementById("book");
            if (!book) return;
            e.preventDefault();
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            book.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
            const focusable = book.querySelector<HTMLElement>(
              "input, button, select, [tabindex]:not([tabindex='-1'])",
            );
            window.setTimeout(() => (focusable ?? book).focus({ preventScroll: true }), reduce ? 0 : 450);
          }}
          className="ml-auto inline-flex min-h-[48px] flex-1 items-center justify-center rounded-[2px] border border-[color:var(--gold)]/55 bg-[color:var(--teal)] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ivory)] transition-[background-color,transform] duration-150 hover:bg-[color:var(--teal-2)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
        >
          {CTA_LABELS.signatureBooking}
        </a>
      </div>
    </div>
  );
}
