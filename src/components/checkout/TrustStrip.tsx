/**
 * TrustStrip — shared pre-payment trust row.
 *
 * Renders directly above any primary payment CTA (bespoke checkout,
 * Signature booking panel, tour page reserve). Three calm signals plus
 * a WhatsApp link:
 *
 *   Secure payment · Stripe   Free cancellation — up to 24h before (Signature)
 *   Licensed operator RNAAT nº 31/2023   WhatsApp support
 *
 * The cancellation copy is driven by `variant`, using the canonical
 * strings from @/config/business-nap so no numeric window is ever
 * hand-authored in this file.
 *
 * Design contract:
 *   - brand tokens only (--charcoal, --gold, --ivory)
 *   - no new visuals, no icons that could feel salesy
 *   - WhatsApp signal is a real link via canonical whatsappUrl()
 *   - single <ul>, semantic list, aria-label describes the group
 *   - fires `checkout_view` analytics event on mount
 */

import { useEffect } from "react";
import { Lock, ShieldCheck, RefreshCcw, MessageCircle } from "lucide-react";
import { whatsappUrl, LICENSE_LABEL, CANCELLATION } from "@/config/business-nap";
import { track } from "@/lib/analytics";

type TrustVariant = "signature" | "studio" | "bespoke";

interface Props {
  /** Where the strip is mounted — sent to analytics as `placement`. */
  placement: "bespoke_checkout" | "signature_final_panel" | "tour_page";
  /** Optional itinerary/tour slug for analytics context. */
  itemSlug?: string;
  /**
   * Which product surface the strip sits on. Drives cancellation copy.
   * Signature shows the 24h line; Studio / Bespoke show the "before
   * checkout or confirmation" line. Never both on the same surface.
   */
  variant?: TrustVariant;
}

const WA_MESSAGE = "Hi YES Experiences — I have a quick question before I book.";

const CANCELLATION_COPY: Record<TrustVariant, string> = {
  signature: CANCELLATION.signature.en,
  studio: CANCELLATION.custom.en,
  bespoke: CANCELLATION.custom.en,
};

export function TrustStrip({ placement, itemSlug, variant = "signature" }: Props) {
  useEffect(() => {
    track("checkout_view", { placement, item_slug: itemSlug });
  }, [placement, itemSlug]);

  const items = [
    { icon: Lock, label: "Secure payment · Stripe" },
    { icon: RefreshCcw, label: CANCELLATION_COPY[variant] },
    { icon: ShieldCheck, label: `Licensed operator ${LICENSE_LABEL}` },
  ] as const;

  return (
    <div
      aria-label="Booking trust and support signals"
      className="mt-5 rounded-[2px] border px-4 py-3.5"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
        background: "color-mix(in oklab, var(--ivory) 96%, var(--charcoal))",
      }}
      data-testid="trust-strip"
      data-placement={placement}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2 text-[13px] leading-[1.4]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
              fontFamily: "var(--font-sans, Inter), sans-serif",
              fontWeight: 500,
            }}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--charcoal))" }}
              aria-hidden
            />
            <span>{label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-[13px] leading-[1.4]">
          <MessageCircle
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--charcoal))" }}
            aria-hidden
          />
          <a
            href={whatsappUrl(WA_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics="whatsapp_click"
            data-analytics-placement={`${placement}_trust_strip`}
            onClick={() =>
              track("whatsapp_click", {
                placement: `${placement}_trust_strip`,
                item_slug: itemSlug,
              })
            }
            className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
              fontFamily: "var(--font-sans, Inter), sans-serif",
              fontWeight: 600,
            }}
          >
            WhatsApp support before you book
          </a>
        </li>
      </ul>
    </div>
  );
}

export default TrustStrip;
