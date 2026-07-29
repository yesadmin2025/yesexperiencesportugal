/**
 * TrustindexBadge — official-look review certificate, rebuilt in static markup.
 *
 * Why not the vendor script: Trustindex's `loader-cert.js` injects a fixed
 * floating badge that collides with the sticky mobile CTA. We reproduce the
 * official certificate exactly (rating block + "Trusted Site / Verified by
 * Trustindex" card) with zero third-party JS, zero CSP change, zero CLS.
 *
 * The green/black/white are the third-party certificate's own mark — treated
 * like the Livro de Reclamações seal, so they intentionally sit outside the
 * brand palette and are placed on a light plate to read on the charcoal footer.
 *
 * Numbers below mirror the public certificate — update them here when it changes.
 */

/** Public certificate values — keep in sync with admin.trustindex.io. */
const RATING = "4.9";
const REVIEW_COUNT = "1000";
const CERTIFICATE_URL = "https://www.trustindex.io/reviews/yesexperiencesportugal.com";

const TRUSTINDEX_GREEN = "#3E9C6D";

function Star() {
  return (
    <svg viewBox="0 0 24 24" width={9} height={9} aria-hidden="true" focusable="false">
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
        fill={TRUSTINDEX_GREEN}
      />
    </svg>
  );
}

function CheckDisc() {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden="true" focusable="false" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill={TRUSTINDEX_GREEN} />
      <path
        d="M6.8 12.4l3.3 3.3 7.1-7.1"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustindexBadge() {
  return (
    <a
      href={CERTIFICATE_URL}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={`Excellent rating ${RATING} out of 5 from ${REVIEW_COUNT} customer reviews — open the Trustindex certificate (opens in a new tab)`}
      className="tap inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[6px] bg-[#FFFFFF] px-2 py-1.5 transition-opacity duration-[var(--dur-quick)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)] sm:gap-2.5 sm:px-3"
    >
      {/* Rating block */}
      <span className="flex flex-col gap-[2px] font-[family-name:var(--font-sans)] leading-none text-[#1A1A1A]">
        <span className="text-[8px] sm:text-[9.5px]" style={{ fontWeight: 700 }}>
          Excellent rating
        </span>
        <span className="flex items-center gap-[3px]">
          <span aria-hidden="true" className="flex items-center gap-[1px]">
            <Star />
            <Star />
            <Star />
            <Star />
            <Star />
          </span>
          <span className="text-[9px] sm:text-[10px]" style={{ fontWeight: 700 }}>
            {RATING}
          </span>
        </span>
        <span className="text-[8px] sm:text-[9.5px]" style={{ fontWeight: 700 }}>
          {REVIEW_COUNT} customer reviews
        </span>
      </span>

      {/* Certificate card */}
      <span className="flex shrink-0 flex-col overflow-hidden rounded-[4px] font-[family-name:var(--font-sans)] leading-none">
        <span className="flex items-center justify-center gap-1 bg-[#FFFFFF] px-1.5 py-[3px] text-[8.5px] sm:px-2 sm:text-[10px] text-[#1A1A1A]" style={{ fontWeight: 700 }}>
          <CheckDisc />
          Trusted Site
        </span>
        <span className="flex flex-col items-center bg-[#111111] px-1.5 py-[3px] sm:px-2 text-[#FFFFFF]">
          <span className="text-[6.5px] sm:text-[7.5px]" style={{ fontWeight: 400 }}>
            Verified by
          </span>
          <span className="text-[8px] sm:text-[9px]" style={{ fontWeight: 700 }}>
            Trustindex
          </span>
        </span>
      </span>
    </a>
  );
}
