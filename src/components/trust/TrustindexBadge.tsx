/**
 * TrustindexBadge — discreet, brand-native review certificate line for the footer.
 *
 * Why not the official floating widget: Trustindex's `loader-cert.js` injects a
 * fixed green badge in the viewport corner. It collides with the sticky CTA on
 * mobile and breaks the ivory/gold/charcoal language. We render the same facts
 * statically (zero third-party JS, zero CSP change, zero CLS) and keep the
 * official Trustindex check mark inline so the certificate reads as verified.
 *
 * Numbers below mirror the public certificate — update them here when the
 * certificate updates.
 */

/** Public certificate values — keep in sync with admin.trustindex.io. */
const RATING = "4.9";
const REVIEW_COUNT = "1,000";
const CERTIFICATE_URL = "https://www.trustindex.io/reviews/yesexperiencesportugal.com";

/** Official Trustindex mark: green disc + white check. Kept at 13px. */
function TrustindexMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={13}
      height={13}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="12" fill="#0E9E63" />
      <path
        d="M6.8 12.4l3.3 3.3 7.1-7.1"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
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
      className="tap mx-auto inline-flex min-h-[44px] max-w-full items-center justify-center gap-2 rounded-sm px-2 text-[color:var(--ivory)]/75 transition-opacity duration-[var(--dur-quick)] hover:text-[color:var(--ivory)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
    >
      <span
        aria-hidden="true"
        className="text-[11px] leading-none text-[color:var(--gold)]"
        style={{ letterSpacing: "0.06em" }}
      >
        ★★★★★
      </span>
      <span
        className="font-[family-name:var(--font-sans)] text-[10.5px] uppercase leading-none"
        style={{ fontWeight: 600, letterSpacing: "0.2em" }}
      >
        {RATING} · {REVIEW_COUNT} reviews
      </span>
      <span
        aria-hidden="true"
        className="hidden h-3 w-px bg-[color:var(--ivory)]/20 sm:block"
      />
      <span className="hidden items-center gap-1.5 sm:inline-flex">
        <TrustindexMark />
        <span
          className="font-[family-name:var(--font-sans)] text-[10.5px] uppercase leading-none"
          style={{ fontWeight: 500, letterSpacing: "0.2em" }}
        >
          Verified by Trustindex
        </span>
      </span>
    </a>
  );
}
