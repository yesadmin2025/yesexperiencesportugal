/**
 * Studio V3 — shared guest-composition formatter.
 *
 * Every surface that shows a guests count must render the same string
 * so travellers see the adult/child split from selection all the way to
 * checkout. When `adults` is unknown (early phases), fall back to a
 * simple "{N} guests" — never guess a split.
 */

export function formatGuestComposition(
  adults: number | null | undefined,
  minorAges: readonly number[] | null | undefined,
  fallbackGuests?: number | null,
): string | null {
  const adultCount = typeof adults === "number" && adults >= 0 ? adults : null;
  const minorCount = minorAges?.length ?? 0;
  const total =
    adultCount != null
      ? adultCount + minorCount
      : typeof fallbackGuests === "number" && fallbackGuests > 0
        ? fallbackGuests
        : null;
  if (total == null || total <= 0) return null;
  const guestWord = total === 1 ? "guest" : "guests";
  if (adultCount == null) return `${total} ${guestWord}`;
  const adultWord = adultCount === 1 ? "adult" : "adults";
  const childWord = minorCount === 1 ? "child" : "children";
  return `${total} ${guestWord} (${adultCount} ${adultWord}, ${minorCount} ${childWord})`;
}
