/**
 * Mobile-only compact reserve bar for Signature experience pages.
 *
 * Priority 1 of the conversion plan: the reserve action must stay reachable
 * while the guest reads the page on a phone. Presentation only — it links to
 * the existing `#book` block and dispatches the same reserve intent event as
 * the in-page CTAs. No pricing, availability or payment logic lives here.
 *
 * Behaviour:
 *   • hidden until the guest scrolls past the hero (≈70% of the viewport);
 *   • hidden again once the booking form itself is on screen (no duplicate CTA);
 *   • hidden on ≥640px, where the booking panel is always in reach.
 */

import { useEffect, useState } from "react";
import { PriceEur } from "@/components/PriceEur";
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
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.7;
      const book = document.getElementById("book");
      let bookOnScreen = false;
      if (book) {
        const r = book.getBoundingClientRect();
        bookOnScreen = r.top < window.innerHeight * 0.85 && r.bottom > 0;
      }
      setVisible(pastHero && !bookOnScreen);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
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
        "border-t border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)]/97 backdrop-blur-sm",
        "px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {typeof priceFrom === "number" ? (
          <div className="min-w-0 leading-tight">
            <span className="block text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              From
            </span>
            <span className="serif text-[18px] font-semibold text-[color:var(--charcoal)]">
              <PriceEur amountEur={priceFrom} role="from" />
            </span>
          </div>
        ) : null}
        <a
          href="#book"
          onClick={() => dispatchSignatureReserveIntent({ tourId, placement: "mobile-bar" })}
          className="ml-auto inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[color:var(--teal)] px-5 text-[13px] font-medium uppercase tracking-[0.1em] text-[color:var(--ivory)] transition-colors duration-150 hover:bg-[color:var(--teal-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
        >
          {CTA_LABELS.signatureBooking}
        </a>
      </div>
    </div>
  );
}
