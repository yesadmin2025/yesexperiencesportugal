import { useEffect, useRef } from "react";
import { Star } from "lucide-react";

/**
 * TrustmarySection
 * - Branded wrapper around the Trustmary review widget.
 * - Loads the Trustmary script once (idempotent), scoped to this section.
 * - Editorial framing in our brand language so the widget feels native,
 *   not like a third-party drop-in.
 * - The widget itself is rendered inside a sand-on-ivory frame with a
 *   soft gold rule above and our eyebrow + serif headline.
 */

const TRUSTMARY_SRC = "https://widget.trustmary.com/zjOJnFFiB";

function ensureTrustmaryScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${TRUSTMARY_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = TRUSTMARY_SRC;
  s.async = true;
  s.defer = true;
  document.body.appendChild(s);
}

export function TrustmarySection() {
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureTrustmaryScript();
  }, []);

  return (
    <section
      className="section-y bg-[color:var(--ivory)] border-t border-[color:var(--border)]"
      aria-labelledby="reviews-title"
    >
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="inline-flex items-center gap-2.5 text-[10.5px] md:text-[11px] uppercase tracking-[0.28em] md:tracking-[0.32em] font-bold text-[color:var(--charcoal)]">
            <span
              aria-hidden="true"
              className="inline-block h-[5px] w-[5px] rounded-full bg-[color:var(--gold)]"
            />
            What guests say
          </span>
          <h2
            id="reviews-title"
            className="serif mt-5 text-[2.3rem] md:text-[3.4rem] leading-[1.04] tracking-[-0.016em] text-[color:var(--charcoal)] font-semibold"
          >
            Real words from <span className="italic font-normal text-[color:var(--teal)]">our travellers.</span>
          </h2>
          <p className="mt-5 text-[15.5px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.65] max-w-md mx-auto">
            Verified reviews from people who shaped their own journey with a local — collected
            independently, never edited.
          </p>
          <div
            className="mt-6 inline-flex items-center gap-1.5 text-[color:var(--gold)]"
            aria-hidden="true"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
        </div>

        {/* Soft gold rule, then the widget surface. The widget injects its
            own DOM into this container; we don't override its internals. */}
        <span
          aria-hidden="true"
          className="block mx-auto h-px w-12 bg-[color:var(--gold)] mb-8 md:mb-10"
        />

        <div className="max-w-5xl mx-auto rounded-[4px] bg-[color:var(--sand)]/60 border border-[color:var(--border)] p-4 md:p-8">
          <div
            ref={slotRef}
            className="trustmary-slot min-h-[280px]"
            aria-label="Customer reviews from Trustmary"
          />
        </div>

        <p className="mt-6 text-center text-[10.5px] md:text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          Independently collected via Trustmary
        </p>
      </div>
    </section>
  );
}
