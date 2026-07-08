/**
 * CredentialStrip — a one-line operator-credentials microstrip.
 *
 * Not a review / popularity signal (those live in <GuestQuotes />, the
 * <StudioTrustStrip /> and the Trustmary widget). This strip carries only
 * the operator-legitimacy cues a hesitant traveller looks for at the
 * point of doubt: licence, insurance, secure checkout, human support.
 *
 * Design rules (see .lovable/plan.md → "Trust strip"):
 *   - single line, ≤ 24px tall, no cards / pills / badges / lock-shield icons
 *   - uppercase Inter 11.5–12px, tracking 0.14em, weight 500
 *   - a single 6×6 gold dot as the only visual mark (matches
 *     "gold = micro-detail only" brand rule)
 *   - fades in with parent, no independent motion
 *   - a11y: role="note" + full-sentence aria-label
 *
 * Placement rules:
 *   - Tour pages: BELOW the primary CTA (reassures, does not steal focus)
 *   - Checkout drawer: ABOVE the first form field (lands before doubt)
 *   - Studio: only in the "convergence" phase, never during exploration
 */

interface Props {
  /** Ivory backdrop (default) vs. charcoal backdrop. */
  variant?: "light" | "dark";
  /** Drops the "Licensed operator" / "Civil liability insured" phrasing to a
   *  shorter token set for tight widths (Studio, mobile drawer). */
  compact?: boolean;
  className?: string;
}

// Wording — single source of truth. Do not duplicate elsewhere.
// 7-day local coverage is now operationally confirmed.
const FULL_TOKENS = [
  "Licensed operator RNAAT nº 31/2023",
  "Civil liability insured",
  "Secure checkout",
  "Local support 7 days a week",
];

const COMPACT_TOKENS = [
  "RNAAT nº 31/2023",
  "Insured",
  "Secure checkout",
  "Local support 7 days",
];

const ARIA_LABEL =
  "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT nº 31/2023), covered by civil liability insurance, with secure checkout and local support 7 days a week.";

export function CredentialStrip({
  variant = "light",
  compact = false,
  className,
}: Props) {
  const tokens = compact ? COMPACT_TOKENS : FULL_TOKENS;
  const textColor =
    variant === "dark"
      ? "color-mix(in oklab, var(--ivory) 82%, transparent)"
      : "color-mix(in oklab, var(--charcoal) 62%, transparent)";
  const sepColor =
    variant === "dark"
      ? "color-mix(in oklab, var(--ivory) 40%, transparent)"
      : "color-mix(in oklab, var(--charcoal) 32%, transparent)";

  return (
    <div
      role="note"
      aria-label={ARIA_LABEL}
      className={
        "w-full flex items-center justify-center flex-wrap gap-x-2 gap-y-1 " +
        "font-[family-name:var(--font-sans)] text-[11.5px] leading-[1.4] " +
        "uppercase tracking-[0.14em] font-medium " +
        (className ?? "")
      }
      style={{ color: textColor }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] rounded-full mr-1"
        style={{ background: "var(--gold)" }}
      />
      {tokens.map((t, i) => (
        <span key={t} className="inline-flex items-center gap-2 whitespace-nowrap">
          <span>{t}</span>
          {i < tokens.length - 1 ? (
            <span aria-hidden="true" style={{ color: sepColor }}>
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
