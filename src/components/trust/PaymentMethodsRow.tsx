/**
 * PaymentMethodsRow — accepted payment methods strip for the footer.
 *
 * Single canonical block used site-wide via the shared Footer (which
 * every route reaches through SiteLayout). Shows the real methods a
 * guest can use at Stripe checkout: Visa, Mastercard, American Express,
 * PayPal, Klarna, Multibanco, MB WAY, Revolut Pay, Apple Pay, Google Pay.
 *
 * Palette (locked):
 *   - Badge background: var(--ivory) (Warm Ivory var(--ivory))
 *   - Badge hairline:   color-mix(var(--charcoal) 10%)
 *   - Mark color:       var(--charcoal) (var(--charcoal)) via currentColor
 *
 * Inline SVGs — no external requests, layout-stable, uniform h-4 marks.
 */

import type { ReactNode } from "react";

type Mark = { id: string; label: string; svg: ReactNode };

// Uniform typographic marks — legible on ivory chips, respectful of
// brand marks without mimicking official lockups. Height locked to h-4
// so the row never reflows vertically across breakpoints.
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
      <svg viewBox="0 0 32 16" aria-hidden="true" className="h-4 w-auto">
        <circle cx="13" cy="8" r="6" fill="currentColor" opacity="0.85" />
        <circle cx="19" cy="8" r="6" fill="currentColor" opacity="0.45" />
      </svg>
    ),
  },
  {
    id: "amex",
    label: "American Express",
    svg: (
      <svg viewBox="0 0 48 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="24"
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
    id: "paypal",
    label: "PayPal",
    svg: (
      <svg viewBox="0 0 56 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="28"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontStyle="italic"
          fontSize="10"
          fill="currentColor"
          letterSpacing="0.01em"
        >
          PayPal
        </text>
      </svg>
    ),
  },
  {
    id: "klarna",
    label: "Klarna",
    svg: (
      <svg viewBox="0 0 56 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="28"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontSize="10"
          fill="currentColor"
          letterSpacing="0.01em"
        >
          Klarna
        </text>
      </svg>
    ),
  },
  {
    id: "multibanco",
    label: "Multibanco",
    svg: (
      <svg viewBox="0 0 68 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="34"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.06em"
        >
          Multibanco
        </text>
      </svg>
    ),
  },
  {
    id: "revolut-pay",
    label: "Revolut Pay",
    svg: (
      <svg viewBox="0 0 64 16" aria-hidden="true" className="h-4 w-auto">
        <text
          x="32"
          y="12"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={700}
          fontSize="9"
          fill="currentColor"
          letterSpacing="0.04em"
        >
          Revolut Pay
        </text>
      </svg>
    ),
  },
  {
    id: "apple-pay",
    label: "Apple Pay",
    svg: (
      <svg viewBox="0 0 56 16" aria-hidden="true" className="h-4 w-auto">
        <g fill="currentColor">
          <path d="M11.5 5.4c-.4.5-1.1.9-1.7.8-.1-.7.2-1.4.6-1.8.4-.5 1.1-.8 1.7-.9.1.7-.2 1.4-.6 1.9zm.6.9c-.9-.1-1.7.5-2.1.5-.5 0-1.1-.5-1.9-.5-1 0-1.9.6-2.4 1.5-1 1.7-.3 4.3.7 5.7.5.7 1 1.5 1.8 1.4.7 0 1-.5 1.9-.5s1.1.5 1.9.5c.8 0 1.3-.7 1.8-1.4.6-.8.8-1.5.8-1.6 0 0-1.6-.6-1.6-2.4 0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.1-2.2-1.1z" />
          <text
            x="34"
            y="12"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight={600}
            fontSize="9"
            fill="currentColor"
            letterSpacing="0.02em"
          >
            Pay
          </text>
        </g>
      </svg>
    ),
  },
  {
    id: "google-pay",
    label: "Google Pay",
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
          letterSpacing="0.02em"
        >
          G Pay
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
          Accepted payment methods
        </p>
        <ul
          className="flex flex-wrap items-center gap-x-2 gap-y-2"
          aria-label="Accepted payment methods: Visa, Mastercard, American Express, PayPal, Klarna, Multibanco, Revolut Pay, Apple Pay, Google Pay"
        >
          {MARKS.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center justify-center h-7 min-w-[3rem] px-2.5 rounded-[3px]"
              style={{
                background: "var(--ivory)",
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--charcoal) 10%, transparent)",
                color: "var(--charcoal)",
              }}
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
