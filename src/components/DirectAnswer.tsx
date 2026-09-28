/**
 * DirectAnswer — a short, factual 2–3 sentence block near the top of a page,
 * written so AI assistants and search AI Overviews can quote it verbatim.
 *
 * Rules:
 * - Facts only, already published and verified elsewhere on the site.
 * - No adjectives of praise, no calls to action — this is an answer, not an ad.
 * - Visually discreet: small sans text on a sand band, inside the design system.
 */
export function DirectAnswer({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-testid="direct-answer"
      className="mt-6 border-l-2 border-[color:var(--gold)]/60 bg-[color:var(--sand)]/60 px-4 py-3 text-left text-[14px] leading-[1.7] text-[color:var(--charcoal-soft)] md:text-[15px]"
    >
      {children}
    </p>
  );
}
