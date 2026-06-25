/**
 * PaymentMethodsRow — discreet payment-acceptance strip for the footer.
 *
 * Pure visual trust strip. No partner names exposed beyond the actual
 * payment brands a guest will see at checkout (cards + wallets).
 * Inline SVG marks so there are no external requests.
 *
 * Sprint A v5: positioned above the bottom legal bar in `<Footer />`.
 */

import type { ReactNode } from "react";

type Mark = { id: string; label: string; svg: ReactNode };

// Brand-safe simplified marks — typographic + neutral palette so they
// sit elegantly on the charcoal footer without screaming OTA.
const MARKS: Mark[] = [
  {
    id: "visa",
    label: "Visa",
    svg: (
      <svg viewBox="0 0 48 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="24"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontStyle="italic"
          fontSize="12"
          fill="currentColor"
          letterSpacing="0.04em"
        >
          VISA
        </text>
      </svg>
    ),
  },
  {
    id: "mastercard",
    label: "Mastercard",
    svg: (
      <svg viewBox="0 0 32 20" aria-hidden="true" className="h-5 w-auto">
        <circle cx="12" cy="10" r="7" fill="currentColor" opacity="0.85" />
        <circle cx="20" cy="10" r="7" fill="currentColor" opacity="0.45" />
      </svg>
    ),
  },
  {
    id: "amex",
    label: "American Express",
    svg: (
      <svg viewBox="0 0 56 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="28"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.18em"
        >
          AMEX
        </text>
      </svg>
    ),
  },
  {
    id: "apple-pay",
    label: "Apple Pay",
    svg: (
      <svg viewBox="0 0 56 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="28"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={600}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.04em"
        >
          🍎 Pay
        </text>
      </svg>
    ),
  },
  {
    id: "google-pay",
    label: "Google Pay",
    svg: (
      <svg viewBox="0 0 64 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="32"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={600}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.04em"
        >
          G Pay
        </text>
      </svg>
    ),
  },
  {
    id: "link",
    label: "Link",
    svg: (
      <svg viewBox="0 0 44 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="22"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={600}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.06em"
        >
          Link
        </text>
      </svg>
    ),
  },
];

export function PaymentMethodsRow() {
  return (
    <div className="mt-8 pt-6 border-t border-[color:var(--gold-warm)]/15">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p
          className="font-[family-name:var(--font-sans)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--ivory)]/65"
          style={{ fontWeight: 500 }}
        >
          Secure payment
        </p>
        <ul
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[color:var(--ivory)]/85"
          aria-label="Accepted payment methods"
        >
          {MARKS.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center justify-center h-7 px-2 rounded-[3px] ring-1 ring-[color:var(--ivory)]/15"
              title={m.label}
            >
              <span className="sr-only">{m.label}</span>
              <span aria-hidden="true" className="inline-flex">
                {m.svg}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PaymentMethodsRow;
