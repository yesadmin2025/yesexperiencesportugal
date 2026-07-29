import { useEffect, useRef } from "react";

/**
 * Trustindex review certificate — footer only, loaded once site-wide.
 *
 * The official loader script is injected asynchronously and idempotently
 * into the slot below, so the certificate renders in place (the loader
 * positions itself relative to its own script tag) rather than as a
 * floating widget. We never touch the widget's markup, links or branding
 * — it simply sits inside a warm ivory, gold-ruled container so it reads
 * as part of the YES footer instead of a third-party badge.
 *
 * CLS: the slot reserves a fixed min-height before the widget paints.
 */

const TRUSTINDEX_SRC = "https://cdn.trustindex.io/loader-cert.js?5b4acfc688a54881970649b49a5";

export function TrustindexCertificate() {
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector(`script[src="${TRUSTINDEX_SRC}"]`)) return;
    const slot = slotRef.current;
    if (!slot) return;
    const s = document.createElement("script");
    s.src = TRUSTINDEX_SRC;
    s.async = true;
    s.defer = true;
    slot.appendChild(s);
  }, []);

  return (
    <section
      aria-labelledby="trustindex-heading"
      className="mx-auto w-full max-w-xl overflow-hidden rounded-[4px] border border-[color:var(--gold)]/25 bg-[color:var(--ivory)] px-5 py-7 text-center sm:px-8 sm:py-9"
    >
      <h3
        id="trustindex-heading"
        className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[color:var(--teal)] sm:text-[11px]"
      >
        Independent review verification
      </h3>

      <span aria-hidden="true" className="mx-auto mt-4 block h-px w-10 bg-[color:var(--gold)]" />

      <p className="mt-4 text-[12px] leading-[1.7] text-[color:var(--charcoal-soft)]">
        <span aria-hidden="true" className="text-[color:var(--gold)]">
          ★★★★★
        </span>{" "}
        4.9 average rating
        <br />
        1,000+ customer reviews
        <br />
        Verified by Trustindex
      </p>

      {/* Official Trustindex certificate — rendered by the loader script. */}
      <div
        ref={slotRef}
        className="mx-auto mt-6 flex min-h-[150px] w-full max-w-full items-center justify-center overflow-x-hidden"
        aria-label="Trustindex review certificate"
      />
    </section>
  );
}
