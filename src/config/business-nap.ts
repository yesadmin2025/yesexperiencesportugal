/**
 * Business NAP + license — single source of truth.
 *
 * Every footer, credential strip, contact block, JSON-LD ContactPoint,
 * legal page and WhatsApp link MUST import from here. Never hard-code
 * the phone, email, license number, or "Sesimbra" address elsewhere.
 *
 * A guardrail test (src/__tests__/nap-consistency.test.ts) enforces
 * this contract on every build.
 */

export const BUSINESS_NAME = "YES experiences Portugal" as const;
export const BUSINESS_LEGAL_NAME = "YES Experiences Portugal" as const;

export const LICENSE_SHORT = "RNAAT" as const;
export const LICENSE_NUMBER = "31/2023" as const;
export const LICENSE_LABEL = "RNAAT nº 31/2023" as const;
export const LICENSE_LONG =
  "Registered Portuguese tourism operator (Registo Nacional dos Agentes de Animação Turística)" as const;

export const CITY = "Sesimbra" as const;
export const COUNTRY_CODE = "PT" as const;
export const BASED_IN = "Sesimbra, Portugal" as const;
export const BASED_IN_SHORT =
  "Based in Sesimbra, designing private journeys across Portugal." as const;
export const BASED_IN_LONG =
  "Based in Sesimbra, designing private journeys across Portugal, with pickups from Lisbon, Cascais, Sintra, Sesimbra and Setúbal." as const;

export const EMAIL = "info@yesexperiencesportugal.com" as const;
export const EMAIL_HREF = `mailto:${EMAIL}` as const;

export const PHONE_DISPLAY = "+351 911 889 992" as const;
export const PHONE_TEL = "+351911889992" as const;
export const PHONE_HREF = `tel:${PHONE_TEL}` as const;

export const WHATSAPP_NUMBER = "351911889992" as const;

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Composed footer/legal one-liner used on ivory and charcoal surfaces. */
export function footerLegalLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${BUSINESS_NAME}. All rights reserved. · ${LICENSE_LABEL} · ${BASED_IN}`;
}

/** Compact credential clause — footer tagline / metadata sentence. */
export const CREDENTIAL_LINE = `Licensed tour operator ${LICENSE_LABEL} · ${BASED_IN_SHORT}` as const;

/**
 * Canonical trust one-liner. Use this exact string anywhere the site
 * shows the operator's legal identity as a single sentence (footer
 * micro-line, JSON-LD description tail, press meta, llms.txt).
 * Never hand-compose the same idea elsewhere.
 */
export const TRUST_LINE =
  `Licensed Portuguese tour operator · ${LICENSE_LABEL} · Based in ${BASED_IN}` as const;

/**
 * Cancellation policy — single source of truth.
 * All three variants approved for public copy. Use SIGNATURE on Signature
 * surfaces, STUDIO on Studio / custom-built surfaces, SHORT as a generic
 * micro-line under totals when policy varies by product.
 */
export const CANCELLATION_SIGNATURE =
  "Signature days usually include free cancellation up to 24h before the experience." as const;
export const CANCELLATION_STUDIO =
  "Studio and custom-built experiences show final cancellation terms before checkout." as const;
export const CANCELLATION_SHORT =
  "Cancellation terms are shown before checkout and may vary by experience type." as const;

