/**
 * Shared constants for copy-parity + CTA vocabulary lock specs.
 *
 * Kept in a plain module (not a spec file) so both
 * `copy-parity.spec.ts` and `cta-vocabulary-lock.spec.ts` can import
 * the same list and cannot drift.
 */

/**
 * Legacy CTA strings that must NEVER appear on any public surface.
 * Adding a new legacy string here immediately extends the guard to
 * every route both specs cover.
 *
 * NOTE: "Reserve this day" was previously listed here. It is now the
 * approved primary label of the Signature booking card (Pass 1A
 * conversion surgery), so it is intentionally NOT legacy.
 */
export const LEGACY_CTAS = [
  "Tailor this Signature",
  "Continue draft",
  "Design & Book",
] as const;


/**
 * Small canonical sample of Signature product routes used by
 * copy-parity's product/tailor blocks. Kept short so the suite stays
 * fast — full-catalog coverage is the job of the CTA vocabulary lock.
 */
export const SIGNATURE_PRODUCT_TOURS = [
  "arrabida-wine-allinclusive",
  "southwest-vicentine-coast",
] as const;

/**
 * Standalone Signature routes (not under /tours/$tourId).
 *
 * Currently none: /sintra-day-tour-from-lisbon and
 * /evora-private-tour-from-lisbon are now 301 redirects to their
 * Local Stories articles, so they are no longer product surfaces.
 * Their redirect targets are covered by the sitemap/canonical spec.
 */
export const SIGNATURE_STANDALONE_ROUTES: readonly string[] = [];
